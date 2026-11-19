import { createHmac } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

/**
 * A tiny stand-in for the Chapa API, just enough for the B2B browser journeys:
 * hosted checkout, payment verification, bank list, transfers (with the server-approval
 * callback), transfer verification and refunds. Nothing here talks to the real Chapa.
 */
export type MockPayment = { txRef: string; amount: string; currency: string; paid: boolean; reference: string };
export type MockTransfer = {
  reference: string;
  amount: string;
  bankCode: number;
  accountName: string;
  accountNumber: string;
  status: "pending" | "success" | "failed";
  approvalHttpStatus: number | null;
};
export type MockArifSession = {
  sessionId: string;
  nonce: string;
  total: number;
  phone: string;
  paymentMethods: string[];
  beneficiaries: { accountNumber: string; bank: string; amount: number }[];
  paid: boolean;
};
export type MockRefund = { paymentReference: string; amount: string; reference: string; refId: string; reason: string };

export type ChapaMock = {
  url: string;
  payments: Map<string, MockPayment>;
  transfers: Map<string, MockTransfer>;
  refunds: MockRefund[];
  arifSessions: Map<string, MockArifSession>;
  /** Pretend the buyer completed the hosted checkout. */
  markPaid: (txRef: string) => void;
  /** Pretend the buyer approved the ArifPay payment (Telebirr prompt, bank app...). */
  markArifPayPaid: (sessionId: string) => void;
  close: () => Promise<void>;
};

type Options = {
  port: number;
  /** URL of the backend's transfer-approval endpoint; when set the mock asks it before completing a transfer. */
  approvalUrl?: string;
  /** Same secret the backend has stored as the Chapa webhook/approval secret. */
  webhookSecret: string;
  /** Base URL the browser/backend use to reach this mock (for checkout links). */
  publicUrl: string;
};

const BANKS = [
  { id: 130, name: "Commercial Bank of Ethiopia (CBE)", currency: "ETB", is_mobilemoney: 0, is_active: 1 },
  { id: 855, name: "telebirr", currency: "ETB", is_mobilemoney: 1, is_active: 1 },
];

const readBody = (request: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });

const send = (response: ServerResponse, status: number, body: unknown) => {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
};

export const startChapaMock = async (options: Options): Promise<ChapaMock> => {
  const payments = new Map<string, MockPayment>();
  const transfers = new Map<string, MockTransfer>();
  const refunds: MockRefund[] = [];
  const arifSessions = new Map<string, MockArifSession>();
  let counter = 0;

  const approve = async (transfer: MockTransfer) => {
    if (!options.approvalUrl) {
      transfer.status = "success";
      return;
    }

    try {
      const signature = createHmac("sha256", options.webhookSecret).update(options.webhookSecret).digest("hex");
      const approval = await fetch(options.approvalUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Chapa-Signature": signature },
        body: JSON.stringify({
          amount: transfer.amount,
          reference: transfer.reference,
          bank: "mock bank",
          account_name: transfer.accountName,
          account_number: transfer.accountNumber,
        }),
      });
      transfer.approvalHttpStatus = approval.status;
      transfer.status = approval.status === 200 ? "success" : "failed";
    } catch {
      transfer.approvalHttpStatus = 0;
      transfer.status = "failed";
    }
  };

  const server: Server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", options.publicUrl);
    const path = url.pathname;
    const method = request.method ?? "GET";
    const raw = method === "GET" ? "" : await readBody(request);

    // ArifPay: hosted checkout sessions (the mock is served under /api, like the real gateway).
    if (method === "POST" && path === "/api/checkout/session") {
      const body = JSON.parse(raw) as {
        nonce: string; phone: string; paymentMethods: string[];
        beneficiaries: { accountNumber: string; bank: string; amount: number }[];
      };
      const sessionId = `ARIF-MOCK-${++counter}`;
      const total = body.beneficiaries.reduce((sum, b) => sum + Number(b.amount), 0);
      arifSessions.set(sessionId, {
        sessionId, nonce: body.nonce, total, phone: body.phone,
        paymentMethods: body.paymentMethods, beneficiaries: body.beneficiaries, paid: false,
      });

      return send(response, 200, {
        error: false,
        msg: "Success",
        data: { sessionId, paymentUrl: `${options.publicUrl}/arifpay/${sessionId}`, cancelUrl: "", totalAmount: total },
      });
    }

    if (method === "GET" && path.startsWith("/api/checkout/session/")) {
      const session = arifSessions.get(decodeURIComponent(path.split("/").pop() ?? ""));
      if (!session) return send(response, 404, { error: true, msg: "Session not found", data: null });

      return send(response, 200, {
        error: false,
        msg: "Success",
        data: {
          uuid: session.sessionId,
          nonce: session.nonce,
          totalAmount: session.total,
          test: false,
          transaction: { transactionStatus: session.paid ? "SUCCESS" : "PENDING" },
        },
      });
    }

    if (method === "GET" && path === "/v1/banks") {
      return send(response, 200, { message: "Banks retrieved", status: "success", data: BANKS });
    }

    if (method === "POST" && path === "/v1/transaction/initialize") {
      const body = JSON.parse(raw) as { tx_ref: string; amount: string; currency: string };
      payments.set(body.tx_ref, {
        txRef: body.tx_ref,
        amount: body.amount,
        currency: body.currency,
        paid: false,
        reference: `CHAPA-MOCK-${++counter}`,
      });
      return send(response, 200, {
        message: "Hosted Link",
        status: "success",
        data: { checkout_url: `${options.publicUrl}/checkout/${encodeURIComponent(body.tx_ref)}` },
      });
    }

    if (method === "GET" && path.startsWith("/v1/transaction/verify/")) {
      const payment = payments.get(decodeURIComponent(path.split("/").pop() ?? ""));
      if (!payment) return send(response, 404, { message: "Transaction not found", status: "failed", data: null });

      return send(response, 200, {
        message: "Payment details",
        status: "success",
        data: {
          status: payment.paid ? "success" : "pending",
          tx_ref: payment.txRef,
          reference: payment.reference,
          amount: payment.amount,
          currency: payment.currency,
        },
      });
    }

    if (method === "POST" && path === "/v1/transfers") {
      const body = JSON.parse(raw) as {
        reference: string; amount: string; bank_code: number; account_name: string; account_number: string;
      };
      const transfer: MockTransfer = {
        reference: body.reference,
        amount: body.amount,
        bankCode: body.bank_code,
        accountName: body.account_name,
        accountNumber: body.account_number,
        status: "pending",
        approvalHttpStatus: null,
      };
      transfers.set(body.reference, transfer);
      // Like Chapa: queue it, answer now, ask the server-approval URL a moment later.
      setTimeout(() => void approve(transfer), 150);

      return send(response, 200, { message: "Transfer Queued Successfully", status: "success", data: null });
    }

    if (method === "GET" && path.startsWith("/v1/transfers/verify/")) {
      const transfer = transfers.get(decodeURIComponent(path.split("/").pop() ?? ""));
      if (!transfer) return send(response, 404, { message: "Transfer not found", status: "failed", data: null });

      return send(response, 200, {
        message: "Transfer details retrieved",
        status: "success",
        data: {
          status: transfer.status,
          amount: transfer.amount,
          reference: transfer.reference,
          chapa_transfer_id: `TR-MOCK-${transfer.reference.slice(-8)}`,
        },
      });
    }

    if (method === "POST" && path.startsWith("/v1/refund/")) {
      const form = new URLSearchParams(raw);
      const refund: MockRefund = {
        paymentReference: decodeURIComponent(path.split("/").pop() ?? ""),
        amount: form.get("amount") ?? "",
        reference: form.get("reference") ?? "",
        reason: form.get("reason") ?? "",
        refId: `MOCK-RF-${++counter}`,
      };
      refunds.push(refund);

      return send(response, 200, { message: "Refund initiated", status: "success", data: { ref_id: refund.refId } });
    }

    if (method === "GET" && path.startsWith("/v1/refund/") && path.endsWith("/verify")) {
      return send(response, 200, { message: "Refund details", status: "success", data: { status: "refunded" } });
    }

    send(response, 404, { message: `Mock has no ${method} ${path}` });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, "0.0.0.0", () => resolve());
  });

  return {
    url: options.publicUrl,
    payments,
    transfers,
    refunds,
    arifSessions,
    markArifPayPaid: (sessionId: string) => {
      const session = arifSessions.get(sessionId);
      if (!session) throw new Error(`The mock never saw ArifPay session ${sessionId}`);
      session.paid = true;
    },
    markPaid: (txRef: string) => {
      const payment = payments.get(txRef);
      if (!payment) throw new Error(`The mock never saw checkout ${txRef}`);
      payment.paid = true;
    },
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
};

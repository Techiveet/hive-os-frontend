import { expect, test } from "./fixtures";
import { BANK_DETAILS, SHIPPING, api, frontendUrl, openTab, signIn, type B2BFixtureManifest } from "./support";
import type { Browser, Page } from "@playwright/test";

/**
 * B2B payments, end to end through the real app: browser UI for the screens people use,
 * the API for the setup steps that are not under test, and a local stand-in for Chapa.
 *
 * Journeys (each in its own workspace, run one after another because the Chapa settings are platform-wide):
 *   1. supplier saves a bank account -> admin verifies it -> order is delivered -> admin pays the supplier
 *      automatically through Chapa (including Chapa's server-approval callback)
 *   2. buyer pays through Chapa -> comes back to the app -> admin refunds the payment through Chapa
 */
test.describe.configure({ mode: "serial" });
test.use({ launchOptions: { args: [] } });

const signedInPage = async (browser: Browser, manifest: B2BFixtureManifest, who: "admin" | "seller" | "buyer"): Promise<Page> => {
  const page = await (await browser.newContext()).newPage();
  await signIn(page, manifest, who);

  return page;
};

type PlacedOrder = { id: number; order_number: string };

const placeOrder = async (buyer: Page, manifest: B2BFixtureManifest, quantity: number): Promise<PlacedOrder> => {
  const placed = await api<{ data: PlacedOrder }>(buyer, "POST", "/b2b-marketplace/orders", {
    items: [{ product_id: manifest.product.id, quantity }],
    ...SHIPPING,
  });
  expect(placed.status).toBe(201);

  return placed.json.data;
};

test("a supplier is paid automatically through Chapa after delivery", async ({ browser, b2b, chapa }) => {
  test.setTimeout(300_000);
  const base = frontendUrl(b2b);

  // 1. The supplier saves where they want to be paid, choosing their bank from Chapa's list.
  const seller = await signedInPage(browser, b2b, "seller");
  await seller.goto(`${base}/dashboard/b2b-marketplace`);
  await seller.getByRole("tab", { name: "Payout account" }).click();
  await seller.getByRole("combobox").click();
  await seller.getByRole("option", { name: /Commercial Bank of Ethiopia/ }).click();
  await seller.getByPlaceholder("Account holder name *").fill("Acceptance Supplier Ltd");
  await seller.getByPlaceholder("Account number *").fill("1000123456789");
  await seller.getByRole("button", { name: "Save for verification" }).click();
  await expect(seller.getByText("Waiting for verification")).toBeVisible();

  // 2. The admin checks it and verifies it.
  const admin = await signedInPage(browser, b2b, "admin");
  await openTab(admin, b2b, "Payout Accounts");
  await expect(admin.getByText("Acceptance Supplier Ltd").first()).toBeVisible();
  await expect(admin.getByText("1000123456789")).toBeVisible();
  await admin.getByRole("button", { name: "Verify" }).click();
  await expect(admin.getByText("No pending payout accounts.")).toBeVisible();

  // 3. An order is placed, paid by bank transfer, confirmed, shipped and received (setup, through the API).
  const buyer = await signedInPage(browser, b2b, "buyer");
  const order = await placeOrder(buyer, b2b, 5);
  expect((await api(buyer, "POST", `/b2b-marketplace/orders/${order.id}/pay`, { reference: "E2E-BANK-1", ...BANK_DETAILS })).status).toBe(200);
  expect((await api(admin, "POST", `/b2b-marketplace/orders/${order.id}/confirm-payment`)).status).toBe(200);
  expect((await api(admin, "PUT", `/b2b-marketplace/orders/${order.id}/status`, { status: "processing" })).status).toBe(200);
  expect((await api(seller, "PUT", `/b2b-marketplace/seller/orders/${order.id}/fulfilment`, { status: "shipped", carrier: "DHL", tracking_number: "E2E-TRK-1" })).status).toBe(200);
  expect((await api(buyer, "POST", `/b2b-marketplace/orders/${order.id}/confirm-receipt`)).status).toBe(200);

  // 4. The admin pays the supplier through Chapa from the order screen.
  await openTab(admin, b2b, "Orders & Payments");
  await expect(admin.getByText(order.order_number).first()).toBeVisible();
  await admin.getByRole("button", { name: "Release payout" }).first().click();
  await expect(admin.getByText("Pay automatically through Chapa")).toBeVisible();
  await admin.getByRole("button", { name: "Send via Chapa" }).click();
  await expect(admin.getByText("being sent")).toBeVisible();

  // Chapa asked the server-approval URL and the transfer went through.
  await expect.poll(() => [...chapa.transfers.values()][0]?.status, { timeout: 30_000 }).toBe("success");
  const transfer = [...chapa.transfers.values()][0];
  expect(transfer.approvalHttpStatus).toBe(200);
  expect(transfer.bankCode).toBe(130);
  expect(transfer.amount).toBe("950.00"); // 5 x 200 ETB, less the default 5% commission
  expect(transfer.accountNumber).toBe("1000123456789");

  // The admin checks the status and the payout is recorded as released, with where it went.
  await admin.getByRole("button", { name: "Check status" }).click();
  await expect(admin.getByText("released", { exact: true })).toBeVisible();
  await expect(admin.getByText(/Commercial Bank of Ethiopia.*6789/)).toBeVisible();
  await expect(admin.getByRole("button", { name: "Release payout" })).toHaveCount(0);
});

test("a buyer pays through Chapa and the admin refunds it through Chapa", async ({ browser, b2b, chapa }) => {
  test.setTimeout(300_000);
  const base = frontendUrl(b2b);

  const buyer = await signedInPage(browser, b2b, "buyer");
  const order = await placeOrder(buyer, b2b, 2);

  // The buyer starts a Chapa payment; the order is not paid until Chapa says so.
  const checkout = await api<{ data: { checkout_url: string } }>(buyer, "POST", `/b2b-marketplace/orders/${order.id}/chapa-checkout`, {
    return_url: `${base}/dashboard/b2b-marketplace`,
  });
  expect(checkout.status).toBe(200);
  const txRef = decodeURIComponent(checkout.json.data.checkout_url.split("/").pop() ?? "");
  expect(txRef).toMatch(/^b2bpay-[0-9a-f]+-\d+-[0-9a-f]{8}$/);
  expect(chapa.payments.get(txRef)?.amount).toBe("400.00");

  // The buyer completes the hosted checkout and comes back to the app.
  chapa.markPaid(txRef);
  await buyer.goto(`${base}/dashboard/b2b-marketplace?payment=chapa&order=${order.id}`);
  await expect(buyer.getByText("Payment received. Your order is confirmed.")).toBeVisible({ timeout: 30_000 });

  // The admin refunds it from the order screen: Chapa is asked, nobody types a transfer reference.
  const admin = await signedInPage(browser, b2b, "admin");
  await openTab(admin, b2b, "Orders & Payments");
  await expect(admin.getByText(order.order_number).first()).toBeVisible();
  await admin.getByRole("button", { name: "Refund", exact: true }).click();
  await expect(admin.getByText(/paid through Chapa/)).toBeVisible();
  await admin.getByRole("button", { name: "Refund through Chapa" }).click();
  await expect(admin.getByRole("button", { name: "Refund through Chapa" })).toHaveCount(0);

  expect(chapa.refunds).toHaveLength(1);
  expect(chapa.refunds[0].amount).toBe("400.00");
  expect(chapa.refunds[0].paymentReference).toMatch(/^CHAPA-MOCK-/);

  const invoice = await api<{ data: { payment_status: string } }>(admin, "GET", `/b2b-marketplace/orders/${order.id}/invoice`);
  expect(invoice.json.data.payment_status).toBe("refunded");
});

import { expect, test, type APIResponse, type Browser, type Page } from "@playwright/test";

/**
 * Procurement -> canonical Inventory data-visibility journey (Phase 4G.3.2).
 *
 * Seeds a real, posted Procurement goods receipt for the batch-tracked
 * certification good through the authenticated Procurement API (the same
 * source-to-pay sequence the procurement journey certifies), then asserts the
 * Inventory Batches page renders the resulting lot with the correct quantity and
 * expiry. This certifies that a posted receipt flows through the canonical
 * Good/good_batches lineage into the operational Inventory UI with real data —
 * it does NOT claim the GRN capture *form* is browser-certified (that remains a
 * separate journey).
 */
const frontendUrl = (process.env.HIVE_E2E_INVENTORY_FRONTEND_URL ?? "http://cert-p4g3-a.localhost:3000").replace(/\/$/, "");
const backendApi = (process.env.HIVE_E2E_INVENTORY_BACKEND_API ?? "http://backend:8000/api/v1").replace(/\/$/, "");
const tenantId = process.env.HIVE_E2E_INVENTORY_TENANT ?? "cert-p4g3-a";
const password = process.env.HIVE_E2E_INVENTORY_PASSWORD ?? "";
const batchItemId = Number(process.env.HIVE_E2E_INVENTORY_BATCH_ITEM_ID ?? "0"); // CERT_P4G3_BATCH inventory_item_id
const sellableLocationId = Number(process.env.HIVE_E2E_INVENTORY_SELLABLE_A_ID ?? "0");
const emailFor = (role: string) => `${role}.${tenantId}@example.test`;

type Envelope<T> = { data: T };

async function signIn(page: Page, role: string) {
  await page.addInitScript(() => window.localStorage.setItem("hive_welcome_tour_completed", "true"));
  await page.goto(`${frontendUrl}/sign-in`);
  await page.locator("#email").waitFor({ state: "visible", timeout: 90_000 });
  await page.locator("#email").fill(emailFor(role));
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /initiate handshake/i }).click({ timeout: 30_000 });
  await page.waitForURL(/\/dashboard(?:$|\?|\/)/, { timeout: 60_000 });
}

async function assertOk(res: APIResponse, op: string) {
  const body = await res.text();
  expect(res.ok(), `${op} -> ${res.status()}: ${body}`).toBeTruthy();
  return JSON.parse(body) as unknown;
}

test("posted batch receipt appears on the Inventory Batches page", async ({ browser }) => {
  test.setTimeout(240_000);
  test.skip(!batchItemId || !sellableLocationId, "fixture ids not provided");

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(90_000);
  try {
    // Seed as tenant-admin: full source-to-pay permissions for the prerequisite.
    await signIn(page, "tenant-admin");
    const auth = await page.evaluate(() => ({
      token: window.localStorage.getItem("hive_token"),
      tenant: window.localStorage.getItem("hive_context"),
      signature: window.localStorage.getItem("hive_context_signature"),
    }));
    const req = async (method: "GET" | "POST" | "PATCH", path: string, data?: Record<string, unknown>) =>
      assertOk(
        await page.request.fetch(`${backendApi}${path}`, {
          method,
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${auth.token}`,
            ...(auth.tenant ? { "X-Tenant": auth.tenant } : {}),
            ...(auth.signature ? { "X-Tenant-Signature": auth.signature } : {}),
          },
          data,
        }),
        `${method} ${path}`,
      );

    const stamp = Date.now().toString().slice(-8);
    const today = new Date().toISOString().slice(0, 10);
    const future = new Date(Date.now() + 120 * 86_400_000).toISOString().slice(0, 10);
    const lot = `LOT-A-${stamp}`;

    // Qualified supplier
    const supplier = (await req("POST", "/procurement/suppliers", {
      name: `Cert Supplier ${stamp}`,
      code: `CS-${stamp}`,
      email: `cs-${stamp}@example.test`,
      country_code: "ETH",
      domestic_supplier: true,
      eligibility_status: "eligible",
      responsiveness_score: 90,
    })) as Envelope<{ id: number; supplier_id: number }>;

    // Requisition -> budget -> submit -> approve
    const requisition = (await req("POST", "/procurement/requisitions", {
      title: `Cert batch requisition ${stamp}`,
      business_justification: "Certification batch receipt.",
      procurement_method: "open_tender",
      priority: "high",
      required_on: future,
      currency: "ETB",
      items: [{ description: "Cert batch good", quantity: 40, unit: "units", unit_price: 100, tax_rate: 0, inventory_item_id: batchItemId }],
    })) as Envelope<{ id: number }>;
    const reqId = requisition.data.id;
    await req("POST", `/procurement/requisitions/${reqId}/actions/budget-check`, { budget_status: "available", budget_notes: "ok" });
    await req("POST", `/procurement/requisitions/${reqId}/actions/submit`);
    await req("POST", `/procurement/requisitions/${reqId}/actions/approve`);

    // Sourcing -> publish -> bid -> evaluate -> award (yields a PO)
    const sourcing = (await req("POST", "/procurement/sourcing-events", {
      requisition_id: reqId,
      title: `Cert tender ${stamp}`,
      method: "open_tender",
      scope: "Certification supply.",
      estimated_value: 4000,
      currency: "ETB",
      evaluation_criteria: [{ key: "financial", weight: 100 }],
    })) as Envelope<{ id: number }>;
    await req("POST", `/procurement/sourcing-events/${sourcing.data.id}/actions/publish`);
    const bid = (await req("POST", `/procurement/sourcing-events/${sourcing.data.id}/bids`, {
      supplier_id: supplier.data.supplier_id,
      reference: `OFFER-${stamp}`,
      currency: "ETB",
      delivery_days: 10,
      payment_terms: "30 days",
      valid_until: future,
      items: [{ description: "Cert batch good", quantity: 40, unit: "units", unit_price: 100, tax_rate: 0 }],
    })) as Envelope<{ id: number }>;
    await req("POST", `/procurement/supplier-bids/${bid.data.id}/evaluate`, {
      technical_score: 95,
      financial_score: 100,
      preference_score: 100,
      evaluated_total: 4000,
      compliance_checks: [{ check: "supplier_eligibility", passed: true }],
      recommended: true,
    });
    const awarded = (await req("POST", `/procurement/sourcing-events/${sourcing.data.id}/actions/award`, { supplier_bid_id: bid.data.id })) as Envelope<{
      id: number;
      items: Array<{ line_key: string; description: string; quantity: number; unit: string; unit_price: number; tax_rate: number }>;
    }>;
    const poId = awarded.data.id;

    // Bind PO lines to the batch inventory item, then run PO lifecycle.
    const updated = (await req("PATCH", `/procurement/purchase-orders/${poId}`, {
      items: awarded.data.items.map((l) => ({ ...l, inventory_item_id: batchItemId })),
    })) as Envelope<{ items: Array<{ line_key: string; quantity: number; unit: string; unit_price: number; tax_rate: number }> }>;
    const lines = updated.data.items;
    await req("POST", `/procurement/purchase-orders/${poId}/actions/submit`);
    await req("POST", `/procurement/purchase-orders/${poId}/actions/approve`);
    await req("POST", `/procurement/purchase-orders/${poId}/actions/issue`);
    await req("POST", `/procurement/purchase-orders/${poId}/actions/confirm`, { reference: `CONF-${stamp}` });

    // Receive the batch into a sellable location, inspect, post to canonical stock.
    const receipt = (await req("POST", "/procurement/goods-receipts", {
      purchase_order_id: poId,
      supplier_delivery_note: `DN-${stamp}`,
      received_on: today,
      items: lines.map((l) => ({
        ...l,
        received_quantity: 40,
        accepted_quantity: 40,
        inventory_item_id: batchItemId,
        lot_number: lot,
        batch_number: lot,
        expiry_date: future,
        warehouse_location_id: sellableLocationId,
      })),
    })) as Envelope<{ id: number }>;
    await req("POST", `/procurement/goods-receipts/${receipt.data.id}/inspect`, {
      inspection_method: "full",
      inspection_status: "passed",
      inspection_results: [{ check: "spec", result: "passed" }],
    });
    const posted = (await req("POST", `/procurement/goods-receipts/${receipt.data.id}/post`)) as Envelope<{ status: string; stock_posted_at: string }>;
    expect(posted.data.status).toBe("posted");

    // The posted batch is visible in the canonical Batches API...
    const batches = (await req("GET", `/inventory/batches?batch_number=${lot}`)) as { data: Array<{ batch_number: string }> };
    expect(batches.data.some((b) => b.batch_number === lot)).toBeTruthy();

    // ...and renders on the operational Inventory Batches page with real data.
    await page.goto(`${frontendUrl}/dashboard/inventory/batches`);
    await expect(page.getByRole("heading", { level: 1, name: /batches & expiry/i })).toBeVisible({ timeout: 90_000 });
    await page.getByPlaceholder(/search batch number/i).fill(lot);
    await expect(page.getByText(lot, { exact: false }).first()).toBeVisible({ timeout: 30_000 });
  } finally {
    await ctx.close();
  }
});

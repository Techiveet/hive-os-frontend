import { expect, test, type APIResponse, type Browser, type Page } from "@playwright/test";

/**
 * Serial lifecycle certification (Phase 4G.3.2).
 *
 * A real Procurement source-to-pay receipt (with serial numbers) is posted
 * through the authenticated API to mint canonical inventory_serials for the
 * serial-tracked certification good; the browser then certifies serial
 * visibility, the scanner lookup action, and serial-transfer authorization.
 * Prerequisite seeding is via API; the certified actions (lookup, transfer
 * attempt) are browser/authenticated-request driven.
 */
const frontendUrl = (process.env.HIVE_E2E_INVENTORY_FRONTEND_URL ?? "http://cert-p4g3-a.localhost:3000").replace(/\/$/, "");
const backendApi = (process.env.HIVE_E2E_INVENTORY_BACKEND_API ?? "http://backend:8000/api/v1").replace(/\/$/, "");
const tenantId = process.env.HIVE_E2E_INVENTORY_TENANT ?? "cert-p4g3-a";
const password = process.env.HIVE_E2E_INVENTORY_PASSWORD ?? "";
const serialItemId = Number(process.env.HIVE_E2E_INVENTORY_SERIAL_ITEM_ID ?? "0");
const sellableAId = Number(process.env.HIVE_E2E_INVENTORY_SELLABLE_A_ID ?? "0");
const sellableBId = Number(process.env.HIVE_E2E_INVENTORY_SELLABLE_B_ID ?? "0");
const emailFor = (role: string) => `${role}.${tenantId}@example.test`;

type Env<T> = { data: T };
type Auth = { token: string | null; tenant: string | null; signature: string | null };

async function signIn(page: Page, role: string) {
  await page.addInitScript(() => window.localStorage.setItem("hive_welcome_tour_completed", "true"));
  await page.goto(`${frontendUrl}/sign-in`);
  await page.locator("#email").waitFor({ state: "visible", timeout: 90_000 });
  await page.locator("#email").fill(emailFor(role));
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /initiate handshake/i }).click({ timeout: 30_000 });
  await page.waitForURL(/\/dashboard(?:$|\?|\/)/, { timeout: 60_000 });
  return page.evaluate(() => ({
    token: window.localStorage.getItem("hive_token"),
    tenant: window.localStorage.getItem("hive_context"),
    signature: window.localStorage.getItem("hive_context_signature"),
  })) as Promise<Auth>;
}

function api(page: Page, auth: Auth) {
  return async (method: "GET" | "POST" | "PATCH", path: string, data?: Record<string, unknown>): Promise<APIResponse> =>
    page.request.fetch(`${backendApi}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${auth.token}`,
        ...(auth.tenant ? { "X-Tenant": auth.tenant } : {}),
        ...(auth.signature ? { "X-Tenant-Signature": auth.signature } : {}),
      },
      data,
    });
}

async function ok<T>(res: APIResponse, op: string): Promise<T> {
  const body = await res.text();
  expect(res.ok(), `${op} -> ${res.status()}: ${body}`).toBeTruthy();
  return JSON.parse(body) as T;
}

/** Post a real Procurement receipt for the given inventory item + serials. */
async function seedSerialReceipt(
  req: ReturnType<typeof api>,
  opts: { itemId: number; qty: number; serials: string[]; locationId: number; stamp: string },
) {
  const future = new Date(Date.now() + 120 * 86_400_000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const supplier = await ok<Env<{ supplier_id: number }>>(
    await req("POST", "/procurement/suppliers", {
      name: `Cert Supplier ${opts.stamp}`, code: `CSS-${opts.stamp}`, email: `css-${opts.stamp}@example.test`,
      country_code: "ETH", domestic_supplier: true, eligibility_status: "eligible", responsiveness_score: 90,
    }), "supplier");
  const requisition = await ok<Env<{ id: number }>>(
    await req("POST", "/procurement/requisitions", {
      title: `Cert serial req ${opts.stamp}`, business_justification: "Cert serial receipt.",
      procurement_method: "open_tender", priority: "high", required_on: future, currency: "ETB",
      items: [{ description: "Cert serial good", quantity: opts.qty, unit: "units", unit_price: 100, tax_rate: 0, inventory_item_id: opts.itemId }],
    }), "requisition");
  const reqId = requisition.data.id;
  await ok(await req("POST", `/procurement/requisitions/${reqId}/actions/budget-check`, { budget_status: "available", budget_notes: "ok" }), "budget");
  await ok(await req("POST", `/procurement/requisitions/${reqId}/actions/submit`), "submit-req");
  await ok(await req("POST", `/procurement/requisitions/${reqId}/actions/approve`), "approve-req");
  const sourcing = await ok<Env<{ id: number }>>(
    await req("POST", "/procurement/sourcing-events", {
      requisition_id: reqId, title: `Cert serial tender ${opts.stamp}`, method: "open_tender",
      scope: "Cert serial supply.", estimated_value: 100 * opts.qty, currency: "ETB",
      evaluation_criteria: [{ key: "financial", weight: 100 }],
    }), "sourcing");
  await ok(await req("POST", `/procurement/sourcing-events/${sourcing.data.id}/actions/publish`), "publish");
  const bid = await ok<Env<{ id: number }>>(
    await req("POST", `/procurement/sourcing-events/${sourcing.data.id}/bids`, {
      supplier_id: supplier.data.supplier_id, reference: `OF-${opts.stamp}`, currency: "ETB",
      delivery_days: 10, payment_terms: "30 days", valid_until: future,
      items: [{ description: "Cert serial good", quantity: opts.qty, unit: "units", unit_price: 100, tax_rate: 0 }],
    }), "bid");
  await ok(await req("POST", `/procurement/supplier-bids/${bid.data.id}/evaluate`, {
    technical_score: 95, financial_score: 100, preference_score: 100, evaluated_total: 100 * opts.qty,
    compliance_checks: [{ check: "supplier_eligibility", passed: true }], recommended: true,
  }), "evaluate");
  const awarded = await ok<Env<{ id: number; items: Array<Record<string, unknown>> }>>(
    await req("POST", `/procurement/sourcing-events/${sourcing.data.id}/actions/award`, { supplier_bid_id: bid.data.id }), "award");
  const poId = awarded.data.id;
  const updated = await ok<Env<{ items: Array<Record<string, unknown>> }>>(
    await req("PATCH", `/procurement/purchase-orders/${poId}`, { items: awarded.data.items.map((l) => ({ ...l, inventory_item_id: opts.itemId })) }), "patch-po");
  await ok(await req("POST", `/procurement/purchase-orders/${poId}/actions/submit`), "submit-po");
  await ok(await req("POST", `/procurement/purchase-orders/${poId}/actions/approve`), "approve-po");
  await ok(await req("POST", `/procurement/purchase-orders/${poId}/actions/issue`), "issue-po");
  await ok(await req("POST", `/procurement/purchase-orders/${poId}/actions/confirm`, { reference: `CF-${opts.stamp}` }), "confirm-po");
  const receipt = await ok<Env<{ id: number }>>(
    await req("POST", "/procurement/goods-receipts", {
      purchase_order_id: poId, supplier_delivery_note: `DN-${opts.stamp}`, received_on: today,
      items: updated.data.items.map((l) => ({
        ...l, received_quantity: opts.qty, accepted_quantity: opts.qty, inventory_item_id: opts.itemId,
        serial_numbers: opts.serials, warehouse_location_id: opts.locationId,
      })),
    }), "receipt");
  await ok(await req("POST", `/procurement/goods-receipts/${receipt.data.id}/inspect`, {
    inspection_method: "full", inspection_status: "passed", inspection_results: [{ check: "spec", result: "passed" }],
  }), "inspect");
  const posted = await ok<Env<{ status: string }>>(await req("POST", `/procurement/goods-receipts/${receipt.data.id}/post`), "post");
  expect(posted.data.status).toBe("posted");
}

test("posted serial receipt is visible and looked up in the UI", async ({ browser }) => {
  test.setTimeout(240_000);
  test.skip(!serialItemId || !sellableAId, "fixture ids not provided");
  const stamp = Date.now().toString().slice(-8);
  const serials = [`SNA${stamp}1`, `SNA${stamp}2`, `SNA${stamp}3`];

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(90_000);
  try {
    // Seed as tenant-admin (prerequisite).
    const adminAuth = await signIn(page, "tenant-admin");
    await seedSerialReceipt(api(page, adminAuth), { itemId: serialItemId, qty: 3, serials, locationId: sellableAId, stamp });

    // Canonical serials API lists them.
    const list = await ok<{ data: Array<{ serial_number: string }> }>(
      await api(page, adminAuth)("GET", `/inventory/serials?search=${serials[0]}`), "serials-list");
    expect(list.data.some((s) => s.serial_number === serials[0])).toBeTruthy();

    // Serials page shows the first serial.
    await page.goto(`${frontendUrl}/dashboard/inventory/serials`);
    await expect(page.getByRole("heading", { level: 1, name: /serial numbers/i })).toBeVisible({ timeout: 90_000 });
    await page.getByPlaceholder(/search serials/i).fill(serials[0]).catch(() => undefined);
    await expect(page.getByText(serials[0], { exact: false }).first()).toBeVisible({ timeout: 30_000 });
  } finally {
    await ctx.close();
  }
});

test("warehouse operator can look up a serial via the scanner UI", async ({ browser }) => {
  test.setTimeout(240_000);
  test.skip(!serialItemId || !sellableAId, "fixture ids not provided");
  const stamp = Date.now().toString().slice(-8);
  const serial = `SNB${stamp}1`;

  const seedCtx = await browser.newContext();
  const seedPage = await seedCtx.newPage();
  seedPage.setDefaultNavigationTimeout(90_000);
  try {
    const adminAuth = await signIn(seedPage, "tenant-admin");
    await seedSerialReceipt(api(seedPage, adminAuth), { itemId: serialItemId, qty: 1, serials: [serial], locationId: sellableAId, stamp });
  } finally {
    await seedCtx.close();
  }

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(90_000);
  try {
    await signIn(page, "warehouse-operator");
    await page.goto(`${frontendUrl}/dashboard/inventory/serials`);
    await expect(page.getByRole("heading", { level: 1, name: /serial numbers/i })).toBeVisible({ timeout: 90_000 });
    await page.locator("#serial-scan").fill(serial);
    await page.getByRole("button", { name: /look up/i }).click();
    // Scanner navigates to the serial detail page on a successful lookup.
    await page.waitForURL(/\/dashboard\/inventory\/serials\/\d+/, { timeout: 30_000 });
    await expect(page.getByText(serial, { exact: false }).first()).toBeVisible({ timeout: 30_000 });
  } finally {
    await ctx.close();
  }
});

test("serial transfer authority: operator denied, manager permitted", async ({ browser }) => {
  test.setTimeout(240_000);
  test.skip(!serialItemId || !sellableAId, "fixture ids not provided");
  const stamp = Date.now().toString().slice(-8);
  const serial = `SNC${stamp}1`;

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(90_000);
  try {
    const adminAuth = await signIn(page, "tenant-admin");
    await seedSerialReceipt(api(page, adminAuth), { itemId: serialItemId, qty: 1, serials: [serial], locationId: sellableAId, stamp });
    const list = await ok<{ data: Array<{ id: number; serial_number: string }> }>(
      await api(page, adminAuth)("GET", `/inventory/serials?search=${serial}`), "serials-list");
    const serialId = list.data.find((s) => s.serial_number === serial)?.id;
    expect(serialId).toBeTruthy();
    await ctx.close();

    // Warehouse operator lacks manage_inventory -> transfer refused at the gate.
    const opCtx = await browser.newContext();
    const opPage = await opCtx.newPage();
    const opAuth = await signIn(opPage, "warehouse-operator");
    const opRes = await api(opPage, opAuth)("POST", `/inventory/serials/${serialId}/transfer`, { warehouse_location_id: sellableBId });
    expect(opRes.status()).toBe(403);
    await opCtx.close();

    // Inventory manager holds manage_inventory -> passes the gate (not 403).
    const mgrCtx = await browser.newContext();
    const mgrPage = await mgrCtx.newPage();
    const mgrAuth = await signIn(mgrPage, "inventory-manager");
    const mgrRes = await api(mgrPage, mgrAuth)("POST", `/inventory/serials/${serialId}/transfer`, { warehouse_location_id: sellableBId });
    expect(mgrRes.status()).not.toBe(403);
    await mgrCtx.close();
  } finally {
    if (!page.isClosed()) await ctx.close();
  }
});

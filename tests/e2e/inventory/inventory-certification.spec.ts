import { expect, test, type Page } from "@playwright/test";

/**
 * Authenticated Inventory certification journeys (Phase 4G.3.2).
 *
 * Runs against a disposable tenant provisioned by the backend command
 * `php artisan inventory:certification-fixture --fixture=<id>`. The tenant host
 * and per-role password come from HIVE_E2E_INVENTORY_* env (read from the
 * fixture manifest by the runner); nothing is hard-coded or committed. Every
 * assertion is against the real app, real tenant and real authorization — the
 * API checks call the backend directly with the signed-in token, exactly like
 * the procurement journey, so RBAC is exercised, never mocked.
 */
const frontendUrl = (
  process.env.HIVE_E2E_INVENTORY_FRONTEND_URL ?? "http://cert-p4g3-a.localhost:3000"
).replace(/\/$/, "");
const backendApi = (
  process.env.HIVE_E2E_INVENTORY_BACKEND_API ?? "http://backend:8000/api/v1"
).replace(/\/$/, "");
const tenantId = process.env.HIVE_E2E_INVENTORY_TENANT ?? "cert-p4g3-a";
const password = process.env.HIVE_E2E_INVENTORY_PASSWORD ?? "";
const emailFor = (role: string) =>
  process.env[`HIVE_E2E_INVENTORY_EMAIL_${role.toUpperCase().replace(/-/g, "_")}`] ??
  `${role}.${tenantId}@example.test`;

async function signIn(page: Page, role: string, locale?: string) {
  await page.addInitScript((loc) => {
    window.localStorage.setItem("hive_welcome_tour_completed", "true");
    if (loc) window.localStorage.setItem("hive_locale", loc);
  }, locale ?? "");
  await page.goto(`${frontendUrl}/sign-in`);
  await page.locator("#email").waitFor({ state: "visible", timeout: 90_000 });
  await page.locator("#email").fill(emailFor(role));
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /initiate handshake/i }).click();
  await page.waitForURL(/\/dashboard(?:$|\?|\/)/, { timeout: 60_000 });
}

/** Backend status for an authenticated request made with the signed-in token. */
async function apiStatus(
  page: Page,
  method: "GET" | "POST",
  path: string,
): Promise<number> {
  const auth = await page.evaluate(() => ({
    token: window.localStorage.getItem("hive_token"),
    tenant: window.localStorage.getItem("hive_context"),
    signature: window.localStorage.getItem("hive_context_signature"),
  }));
  const response = await page.request.fetch(`${backendApi}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${auth.token}`,
      ...(auth.tenant ? { "X-Tenant": auth.tenant } : {}),
      ...(auth.signature ? { "X-Tenant-Signature": auth.signature } : {}),
    },
    failOnStatusCode: false,
  });
  return response.status();
}

test("tenant admin operates the canonical Inventory workspace", async ({ page }) => {
  test.setTimeout(180_000);
  page.setDefaultNavigationTimeout(90_000);
  const consoleErrors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });

  await signIn(page, "tenant-admin");

  const context = await page.evaluate(() => ({
    tenant: window.localStorage.getItem("hive_context"),
    token: Boolean(window.localStorage.getItem("hive_token")),
  }));
  expect(context.token).toBeTruthy();
  expect(context.tenant).toBe(tenantId);

  await page.goto(`${frontendUrl}/dashboard/inventory/batches`);
  await expect(
    page.getByRole("heading", { level: 1, name: /batches & expiry/i }),
  ).toBeVisible({ timeout: 90_000 });

  await page.goto(`${frontendUrl}/dashboard/inventory/serials`);
  await expect(
    page.getByRole("heading", { level: 1, name: /serial numbers/i }),
  ).toBeVisible({ timeout: 90_000 });

  await page.setViewportSize({ width: 375, height: 812 });
  const overflow = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(overflow.scroll).toBeLessThanOrEqual(overflow.client + 1);

  const actionable = consoleErrors.filter(
    (m) => !m.includes("ws://") && !m.includes("WebSocket"),
  );
  expect(actionable).toEqual([]);
});

test("cost privacy: warehouse operator is denied finance but can operate inventory", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await signIn(page, "warehouse-operator");

  // Operational inventory is allowed.
  expect(await apiStatus(page, "GET", "/inventory/serials")).toBe(200);
  // Financial valuation (view_finance) is refused.
  expect(await apiStatus(page, "GET", "/inventory/valuation/summary")).toBe(403);
});

test("finance viewer may read valuation", async ({ page }) => {
  test.setTimeout(180_000);
  await signIn(page, "finance-viewer");
  expect(await apiStatus(page, "GET", "/inventory/valuation/summary")).toBe(200);
});

test("count finalize is separated from count entry", async ({ page }) => {
  test.setTimeout(180_000);
  // Warehouse operator has enter_inventory_counts but NOT finalize; the
  // permission middleware refuses before the missing-count lookup, so 403.
  await signIn(page, "warehouse-operator");
  expect(await apiStatus(page, "POST", "/inventory/stocktakes/1/finalize")).toBe(403);

  // Inventory manager holds finalize authority, so it passes the permission gate
  // and fails only because count 1 does not exist — never 403.
  await signIn(page, "inventory-manager");
  expect(await apiStatus(page, "POST", "/inventory/stocktakes/1/finalize")).not.toBe(403);
});

test("serials page renders Amharic when the locale is Amharic", async ({ page }) => {
  test.setTimeout(180_000);
  page.setDefaultNavigationTimeout(90_000);
  await signIn(page, "inventory-manager", "am");
  await page.goto(`${frontendUrl}/dashboard/inventory/serials`);
  // inventory.serials.col_serial in Amharic (fixed in InventoryDictionary).
  await expect(page.getByText("ተከታታይ ቁጥር", { exact: false }).first()).toBeVisible({
    timeout: 90_000,
  });
});

import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";

/**
 * Authenticated Inventory certification journeys (Phase 4G.3.2 / matrix
 * completion). Runs against a disposable tenant provisioned by the backend
 * command `php artisan inventory:certification-fixture --fixture=<id>`. Tenant
 * host and the per-role password come from HIVE_E2E_INVENTORY_* env (read from
 * the fixture manifest by the runner); nothing is hard-coded or committed. Every
 * assertion is against the real app, real tenant and real authorization — the
 * API checks call the backend with the signed-in token, so RBAC is exercised,
 * never mocked.
 *
 * Each role signs in ONCE; its storage state is cached and reused so the login
 * throttle is never tripped (the standard Playwright storage-state pattern).
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

type StorageState = Awaited<ReturnType<BrowserContext["storageState"]>>;
type Auth = { token: string | null; tenant: string | null; signature: string | null };

const stateCache = new Map<string, StorageState>();

async function loginState(browser: Browser, role: string): Promise<StorageState> {
  const cached = stateCache.get(role);
  if (cached) return cached;
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript(() =>
    window.localStorage.setItem("hive_welcome_tour_completed", "true"),
  );
  // The login endpoint is throttled per IP; the whole certification run comes
  // from one container IP, so a burst of role logins can trip it. Wait out the
  // window and retry rather than failing the role.
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.goto(`${frontendUrl}/sign-in`);
    await page.locator("#email").waitFor({ state: "visible", timeout: 90_000 });
    await page.locator("#email").fill(emailFor(role));
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: /initiate handshake/i }).click({ timeout: 30_000 });
    try {
      await page.waitForURL(/\/dashboard(?:$|\?|\/)/, { timeout: 45_000 });
      const state = await ctx.storageState();
      await ctx.close();
      stateCache.set(role, state);
      return state;
    } catch (error) {
      const throttled = await page
        .getByText(/too many attempts/i)
        .isVisible()
        .catch(() => false);
      if (!throttled || attempt === 3) {
        await ctx.close();
        throw error;
      }
      await page.waitForTimeout(65_000);
    }
  }
  await ctx.close();
  throw new Error(`Unable to sign in as ${role}`);
}

function authFromState(state: StorageState): Auth {
  const ls = state.origins?.[0]?.localStorage ?? [];
  const get = (k: string) => ls.find((e) => e.name === k)?.value ?? null;
  return { token: get("hive_token"), tenant: get("hive_context"), signature: get("hive_context_signature") };
}

async function pageFor(
  browser: Browser,
  role: string,
  init?: { locale?: string; theme?: string },
): Promise<{ ctx: BrowserContext; page: Page }> {
  const storageState = await loginState(browser, role);
  const ctx = await browser.newContext({ storageState });
  if (init?.locale) await ctx.addInitScript((v) => window.localStorage.setItem("hive_locale", v), init.locale);
  if (init?.theme) await ctx.addInitScript((v) => window.localStorage.setItem("theme", v), init.theme);
  ctx.setDefaultNavigationTimeout(90_000);
  return { ctx, page: await ctx.newPage() };
}

async function apiStatus(ctx: BrowserContext, auth: Auth, method: "GET" | "POST", path: string): Promise<number> {
  const response = await ctx.request.fetch(`${backendApi}${path}`, {
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

function actionableErrors(errors: string[]): string[] {
  return errors.filter(
    (m) =>
      !m.includes("ws://") && !m.includes("WebSocket") && !m.includes("9095") && !m.includes("429"),
  );
}

test("tenant admin operates the canonical Inventory workspace", async ({ browser }) => {
  test.setTimeout(180_000);
  const { ctx, page } = await pageFor(browser, "tenant-admin");
  const consoleErrors: string[] = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  try {
    await page.goto(`${frontendUrl}/dashboard/inventory/overview`);
    await expect(page.getByRole("heading", { level: 1, name: /inventory operations/i })).toBeVisible({ timeout: 90_000 });
    const ctxState = await page.evaluate(() => ({
      tenant: window.localStorage.getItem("hive_context"),
      token: Boolean(window.localStorage.getItem("hive_token")),
    }));
    expect(ctxState.token).toBeTruthy();
    expect(ctxState.tenant).toBe(tenantId);

    await page.goto(`${frontendUrl}/dashboard/inventory/batches`);
    await expect(page.getByRole("heading", { level: 1, name: /batches & expiry/i })).toBeVisible({ timeout: 90_000 });
    await page.goto(`${frontendUrl}/dashboard/inventory/serials`);
    await expect(page.getByRole("heading", { level: 1, name: /serial numbers/i })).toBeVisible({ timeout: 90_000 });

    await page.setViewportSize({ width: 375, height: 812 });
    const o = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    expect(o.scroll).toBeLessThanOrEqual(o.client + 1);
    expect(actionableErrors(consoleErrors)).toEqual([]);
  } finally {
    await ctx.close();
  }
});

// ---- Full RBAC matrix: one cached session per role, real authenticated API ----
const rbacMatrix: Array<{ role: string; valuation: number; serials: number }> = [
  { role: "warehouse-operator", valuation: 403, serials: 200 },
  { role: "inventory-manager", valuation: 403, serials: 200 },
  { role: "procurement", valuation: 403, serials: 403 },
  { role: "sales", valuation: 403, serials: 403 },
  { role: "finance-viewer", valuation: 200, serials: 403 },
  { role: "finance-manager", valuation: 200, serials: 403 },
  { role: "tenant-admin", valuation: 200, serials: 200 },
];
for (const row of rbacMatrix) {
  test(`RBAC ${row.role}: valuation=${row.valuation} serials=${row.serials}`, async ({ browser }) => {
    test.setTimeout(200_000);
    const state = await loginState(browser, row.role);
    const auth = authFromState(state);
    const ctx = await browser.newContext({ storageState: state });
    try {
      expect(await apiStatus(ctx, auth, "GET", "/inventory/valuation/summary")).toBe(row.valuation);
      expect(await apiStatus(ctx, auth, "GET", "/inventory/serials")).toBe(row.serials);
    } finally {
      await ctx.close();
    }
  });
}

test("count finalize is separated from count entry", async ({ browser }) => {
  test.setTimeout(120_000);
  const opState = await loginState(browser, "warehouse-operator");
  const opCtx = await browser.newContext({ storageState: opState });
  const mgrState = await loginState(browser, "inventory-manager");
  const mgrCtx = await browser.newContext({ storageState: mgrState });
  try {
    expect(await apiStatus(opCtx, authFromState(opState), "POST", "/inventory/stocktakes/1/finalize")).toBe(403);
    expect(await apiStatus(mgrCtx, authFromState(mgrState), "POST", "/inventory/stocktakes/1/finalize")).not.toBe(403);
  } finally {
    await opCtx.close();
    await mgrCtx.close();
  }
});

// ---- Language sweeps: known translated headings must render per locale ----
const sweepPages: Array<{ path: string; en: RegExp; am: string }> = [
  { path: "/dashboard/inventory/overview", en: /inventory operations/i, am: "የክምችት ክዋኔዎች" },
  { path: "/dashboard/inventory/batches", en: /batches & expiry/i, am: "ባችና ማብቂያ ጊዜ" },
  { path: "/dashboard/inventory/serials", en: /serial numbers/i, am: "ተከታታይ ቁጥሮች" },
  { path: "/dashboard/inventory/valuation", en: /inventory valuation/i, am: "የክምችት ግምት" },
];

test("English sweep renders translated headings with no raw keys", async ({ browser }) => {
  test.setTimeout(180_000);
  const { ctx, page } = await pageFor(browser, "tenant-admin", { locale: "en" });
  const consoleErrors: string[] = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  try {
    for (const p of sweepPages) {
      await page.goto(`${frontendUrl}${p.path}`);
      await expect(page.getByRole("heading", { level: 1, name: p.en })).toBeVisible({ timeout: 90_000 });
      const body = (await page.locator("main").innerText()).toLowerCase();
      expect(body).not.toMatch(/inventory\.[a-z_]+\.[a-z_]+/);
    }
    expect(actionableErrors(consoleErrors)).toEqual([]);
  } finally {
    await ctx.close();
  }
});

test("Amharic sweep renders real Amharic with no raw keys", async ({ browser }) => {
  test.setTimeout(180_000);
  const { ctx, page } = await pageFor(browser, "tenant-admin", { locale: "am" });
  try {
    for (const p of sweepPages) {
      await page.goto(`${frontendUrl}${p.path}`);
      await expect(page.getByText(p.am, { exact: false }).first()).toBeVisible({ timeout: 90_000 });
      const body = await page.locator("main").innerText();
      expect(body).not.toMatch(/inventory\.[a-z_]+\.[a-z_]+/);
    }
  } finally {
    await ctx.close();
  }
});

test("dark and light themes both render the Serials page", async ({ browser }) => {
  test.setTimeout(150_000);
  for (const theme of ["dark", "light"] as const) {
    const { ctx, page } = await pageFor(browser, "inventory-manager", { theme });
    try {
      await page.goto(`${frontendUrl}/dashboard/inventory/serials`);
      await expect(page.getByRole("heading", { level: 1, name: /serial numbers/i })).toBeVisible({ timeout: 90_000 });
      const cls = await page.evaluate(() => document.documentElement.className);
      expect(cls).toContain(theme);
    } finally {
      await ctx.close();
    }
  }
});

test("375px: core inventory pages have no destructive horizontal overflow", async ({ browser }) => {
  test.setTimeout(150_000);
  const { ctx, page } = await pageFor(browser, "inventory-manager");
  try {
    await page.setViewportSize({ width: 375, height: 812 });
    for (const path of [
      "/dashboard/inventory/serials",
      "/dashboard/inventory/batches",
      "/dashboard/inventory/stocktakes",
    ]) {
      await page.goto(`${frontendUrl}${path}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 90_000 });
      const o = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
      expect(o.scroll).toBeLessThanOrEqual(o.client + 1);
    }
  } finally {
    await ctx.close();
  }
});

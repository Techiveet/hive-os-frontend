import { expect, type Page } from "@playwright/test";

export type B2BFixtureManifest = {
  fixture_id: string;
  tenant_id: string;
  domain: string;
  frontend_url: string;
  admin: { email: string; password: string };
  seller: { email: string; password: string; profile_id: number };
  buyer: { email: string; password: string };
  product: { id: number; name: string; price: number; currency: string };
  chapa?: { base_url: string; secret_key: string; webhook_secret: string; approval_url: string };
};

export const frontendUrl = (manifest: B2BFixtureManifest) => manifest.frontend_url.replace(/\/$/, "");

export const signIn = async (page: Page, manifest: B2BFixtureManifest, who: "admin" | "seller" | "buyer") => {
  const { email, password } = manifest[who];

  await page.goto(`${frontendUrl(manifest)}/sign-in`);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /initiate handshake/i }).click();
  await expect(page).toHaveURL(/\/dashboard(?:$|\?)/, { timeout: 90_000 });
};

/** Call the API exactly as the signed-in app does (token and workspace headers from local storage). */
export const api = async <T = any>(
  page: Page,
  method: "GET" | "POST" | "PUT",
  path: string,
  body?: unknown,
): Promise<{ status: number; json: T }> =>
  page.evaluate(
    async ({ method, path, body }) => {
      const token = window.localStorage.getItem("hive_token");
      const context = window.localStorage.getItem("hive_context");
      const signature = window.localStorage.getItem("hive_context_signature");
      const headers: Record<string, string> = {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(context && context !== "central" ? { "X-Tenant": context } : {}),
        ...(context && context !== "central" && signature ? { "X-Tenant-Signature": signature } : {}),
      };
      const response = await fetch(`/api/v1${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      return { status: response.status, json: await response.json().catch(() => null) };
    },
    { method, path, body },
  ) as Promise<{ status: number; json: T }>;

export const SHIPPING = {
  shipping_name: "Receiving Dock",
  shipping_email: "dock@example.test",
  shipping_address: "Addis Ababa",
};

export const BANK_DETAILS = {
  refund_bank_name: "Commercial Bank of Ethiopia",
  refund_account_name: "Acceptance Buyer Co",
  refund_account_number: "0011223344",
};

export const openTab = async (page: Page, manifest: B2BFixtureManifest, tab: string) => {
  await page.goto(`${frontendUrl(manifest)}/dashboard/b2b-marketplace`);
  await page.getByRole("tab", { name: tab }).click();
};

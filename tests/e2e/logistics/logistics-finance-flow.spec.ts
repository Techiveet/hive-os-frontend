import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const chromiumExecutablePath =
  process.env.HIVE_E2E_CHROMIUM_EXECUTABLE_PATH?.trim() || undefined;

test.use({
  video: "off",
  launchOptions: {
    ...(chromiumExecutablePath
      ? { executablePath: chromiumExecutablePath }
      : {}),
    args: [],
  },
});

type ApiResult = { status: number; body: Record<string, unknown> };

async function tenantApi(
  page: Page,
  path: string,
  method = "GET",
  body?: Record<string, unknown>,
): Promise<ApiResult> {
  return page.evaluate(
    async ({ requestPath, requestMethod, requestBody }) => {
      const token = window.localStorage.getItem("hive_token");
      const context = window.localStorage.getItem("hive_context");
      const signature = window.localStorage.getItem("hive_context_signature");
      const hasTenantContext = Boolean(context && context !== "central");
      const response = await fetch(requestPath, {
        method: requestMethod,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(hasTenantContext && context ? { "X-Tenant": context } : {}),
          ...(hasTenantContext && signature
            ? { "X-Tenant-Signature": signature }
            : {}),
        },
        ...(requestBody ? { body: JSON.stringify(requestBody) } : {}),
      });
      const text = await response.text();
      return {
        status: response.status,
        body: text ? (JSON.parse(text) as Record<string, unknown>) : {},
      };
    },
    { requestPath: path, requestMethod: method, requestBody: body },
  );
}

const resource = (body: Record<string, unknown>) =>
  ((body.data as Record<string, unknown> | undefined) ?? body);

async function signIn(page: Page, frontendUrl: string, email: string, password: string) {
  await page.addInitScript(() => {
    window.localStorage.setItem("hive_welcome_tour_completed", "true");
    if (!window.localStorage.getItem("hive_locale")) {
      window.localStorage.setItem("hive_locale", "en");
    }
    if (!window.localStorage.getItem("theme")) {
      window.localStorage.setItem("theme", "light");
    }
  });
  await page.goto(`${frontendUrl}/sign-in`);
  await page.locator("#email").waitFor({ state: "visible", timeout: 90_000 });
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /initiate handshake/i }).click();
  await expect(page).toHaveURL(/\/dashboard(?:$|\?)/, { timeout: 60_000 });
}

test("job finance posts billing vendor cost accrual profitability and close", async ({
  page,
  logisticsFixture,
}, testInfo) => {
  testInfo.setTimeout(900_000);
  page.setDefaultTimeout(60_000);
  page.setDefaultNavigationTimeout(90_000);
  const frontendUrl = (process.env.HIVE_E2E_FRONTEND_URL?.trim() || logisticsFixture.frontend_url).replace(/\/$/, "");
  const jobId = logisticsFixture.references.forwarding_job_id;
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  const failedResponses: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    if (request.url().includes("/api/v1/logistics")) {
      failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText ?? "unknown"}`);
    }
  });
  page.on("response", (response) => {
    if (response.url().includes("/api/v1/logistics") && response.status() >= 400) {
      failedResponses.push(`${response.request().method()} ${response.status()} ${response.url()}`);
    }
  });

  await signIn(
    page,
    frontendUrl,
    logisticsFixture.user.email,
    logisticsFixture.user.password,
  );
  consoleErrors.length = 0;
  await page.goto(`${frontendUrl}/dashboard/logistics/jobs/${jobId}`);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: logisticsFixture.references.forwarding_job_number,
    }),
  ).toBeVisible({ timeout: 90_000 });
  await expect(
    page.getByRole("heading", { name: /finance \/ job costing/i }),
  ).toBeVisible();
  await test.step("Permission-aware Job Finance tour", async () => {
    await page.getByRole("button", { name: /^job finance tour$/i }).click();
    await expect(
      page.getByRole("heading", { name: /^job finance workspace$/i }),
    ).toBeVisible();
    await expect(page.getByText(/Finance-owned invoices, bills, accruals/i)).toBeVisible();
    await page.getByRole("button", { name: /^close tour$/i }).click();
    await expect(page.locator("#react-joyride-portal")).toBeHidden();
  });

  await test.step("Customer Billing", async () => {
    await page.getByRole("tab", { name: /^revenue$/i }).click();
    const billingButton = page.getByRole("button", {
      name: /^create billing request$/i,
    });
    const billingForm = billingButton.locator("xpath=ancestor::form");
    const billableCheckbox = billingForm.getByRole("checkbox").first();
    await billableCheckbox.click();
    const billingAmount = billingForm.getByRole("spinbutton", { name: /amount/i });
    await billingAmount.fill("4000.00");
    await billingForm.locator("#finance-billing-date").fill("2026-09-19");

    const firstCreateResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/v1/logistics/jobs/${jobId}/billing-requests`) &&
        response.request().method() === "POST",
    );
    await billingButton.click();
    const firstCreate = await firstCreateResponse;
    expect(firstCreate.status(), await firstCreate.text()).toBe(201);
    const firstRequest = resource((await firstCreate.json()) as Record<string, unknown>);
    const firstRequestId = Number(firstRequest.id);
    const firstRequestNumber = String(firstRequest.request_number);
    const firstCard = page
      .getByText(firstRequestNumber, { exact: true })
      .locator("xpath=ancestor::*[@data-slot='card']");
    await firstCard.getByRole("button", { name: /^approve$/i }).click();
    await expect(firstCard).toContainText(/approved/i);
    await firstCard.getByRole("button", { name: /^post$/i }).click();
    await expect(firstCard).toContainText(/posted/i);
    await expect(firstCard.getByText(/finance document/i)).toBeVisible();

    const firstRetry = await tenantApi(
      page,
      `/api/v1/logistics/jobs/${jobId}/billing-requests/${firstRequestId}/post`,
      "POST",
    );
    expect(firstRetry.status).toBe(200);

    await billingAmount.fill("6000.00");
    const secondCreateResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/v1/logistics/jobs/${jobId}/billing-requests`) &&
        response.request().method() === "POST",
    );
    await billingButton.click();
    const secondCreate = await secondCreateResponse;
    expect(secondCreate.status(), await secondCreate.text()).toBe(201);
    const secondRequest = resource((await secondCreate.json()) as Record<string, unknown>);
    const secondCard = page
      .getByText(String(secondRequest.request_number), { exact: true })
      .locator("xpath=ancestor::*[@data-slot='card']");
    await secondCard.getByRole("button", { name: /^approve$/i }).click();
    await expect(secondCard).toContainText(/approved/i);
    await secondCard.getByRole("button", { name: /^post$/i }).click();
    await expect(secondCard).toContainText(/posted/i);

    const finance = await tenantApi(page, `/api/v1/logistics/jobs/${jobId}/finance`);
    expect(finance.status).toBe(200);
    const summary = finance.body.summary as Record<string, unknown>;
    expect(summary.billed_revenue).toBe("10000.00");
    expect(summary.unbilled_revenue).toBe("0.00");
    expect((finance.body.billing_requests as unknown[]).length).toBe(2);
  });

  let accrualId = 0;
  await test.step("Accrual", async () => {
    await page.getByRole("tab", { name: /^accruals$/i }).click();
    const accrualButton = page.getByRole("button", { name: /^create accrual$/i });
    const accrualForm = accrualButton.locator("xpath=ancestor::form");
    await accrualForm
      .locator("#finance-accrual-cost")
      .selectOption(String(logisticsFixture.references.job_cost_id));
    await accrualForm
      .locator("#finance-accrual-period")
      .selectOption(String(logisticsFixture.references.finance_period_id));
    await accrualForm.locator("#finance-accrual-amount").fill("6500.00");
    await accrualForm.locator("#finance-accrual-date").fill("2026-09-19");
    await accrualForm
      .locator("#finance-accrual-reason")
      .fill("Carrier service incurred before invoice receipt.");
    const createResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/v1/logistics/jobs/${jobId}/accruals`) &&
        response.request().method() === "POST",
    );
    await accrualButton.click();
    const created = await createResponse;
    expect(created.status(), await created.text()).toBe(201);
    const accrual = resource((await created.json()) as Record<string, unknown>);
    accrualId = Number(accrual.id);
    const postResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/v1/logistics/jobs/${jobId}/accruals/${accrualId}/post`),
    );
    await page.getByRole("button", { name: /^post$/i }).click();
    expect((await postResponse).status()).toBe(200);
    await expect(page.getByText(/^posted$/i)).toBeVisible();

    const retry = await tenantApi(
      page,
      `/api/v1/logistics/jobs/${jobId}/accruals/${accrualId}/post`,
      "POST",
    );
    expect(retry.status).toBe(200);
  });

  let vendorRequestId = 0;
  await test.step("Vendor Bill", async () => {
    await page.getByRole("tab", { name: /^costs$/i }).click();
    const costRow = page.getByRole("row", {
      name: /expected ocean carrier cost/i,
    });
    await costRow.getByRole("spinbutton", { name: /^actual amount$/i }).fill("6800.00");
    await costRow
      .getByRole("textbox", { name: /supplier invoice reference/i })
      .fill("E2E-CARRIER-6800");
    await costRow.getByRole("button", { name: /^record$/i }).click();
    await expect(costRow).toContainText("ETB 6800.00");

    await page.getByRole("tab", { name: /^accruals$/i }).click();
    const reverseResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/v1/logistics/jobs/${jobId}/accruals/${accrualId}/reverse`),
    );
    await page.getByRole("button", { name: /^reverse$/i }).click();
    expect((await reverseResponse).status()).toBe(200);
    await expect(page.getByText(/^reversed$/i)).toBeVisible();

    await page.getByRole("tab", { name: /^costs$/i }).click();
    const vendorButton = page.getByRole("button", {
      name: /^create vendor bill request$/i,
    });
    const vendorForm = vendorButton.locator("xpath=ancestor::form");
    await vendorForm.getByRole("checkbox").first().click();
    await vendorForm
      .locator("#finance-vendor-supplier")
      .selectOption(String(logisticsFixture.references.supplier_id));
    await vendorForm.locator("#finance-vendor-reference").fill("E2E-CARRIER-6800");
    await vendorForm.locator("#finance-vendor-date").fill("2026-09-19");
    const createResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/v1/logistics/jobs/${jobId}/vendor-bill-requests`) &&
        response.request().method() === "POST",
    );
    await vendorButton.click();
    const created = await createResponse;
    expect(created.status(), await created.text()).toBe(201);
    const vendorRequest = resource((await created.json()) as Record<string, unknown>);
    vendorRequestId = Number(vendorRequest.id);
    const vendorCard = page
      .getByText(String(vendorRequest.request_number), { exact: true })
      .locator("xpath=ancestor::*[@data-slot='card']");
    await vendorCard.getByRole("button", { name: /^approve$/i }).click();
    await expect(vendorCard).toContainText(/approved/i);
    await vendorCard.getByRole("button", { name: /^post$/i }).click();
    await expect(vendorCard).toContainText(/posted/i);
    await expect(vendorCard.getByText(/finance document/i)).toBeVisible();

    const retry = await tenantApi(
      page,
      `/api/v1/logistics/jobs/${jobId}/vendor-bill-requests/${vendorRequestId}/post`,
      "POST",
    );
    expect(retry.status).toBe(200);
    const finance = await tenantApi(page, `/api/v1/logistics/jobs/${jobId}/finance`);
    const summary = finance.body.summary as Record<string, unknown>;
    expect(summary.actual_cost).toBe("6800.00");
    expect(summary.vendor_billed_cost).toBe("6800.00");
    expect((finance.body.vendor_bill_requests as unknown[]).length).toBe(1);
  });

  await test.step("Profitability", async () => {
    await page.getByRole("tab", { name: /^summary$/i }).click();
    await expect(page.getByText("ETB 3200.00", { exact: true })).toBeVisible();
    await expect(page.getByText(/margin 32\.0000%/i)).toBeVisible();
    await expect(page.getByText(/markup 47\.0588%/i)).toBeVisible();
    const finance = await tenantApi(page, `/api/v1/logistics/jobs/${jobId}/finance`);
    const summary = finance.body.summary as Record<string, unknown>;
    expect(summary.actual_profit).toBe("3200.00");
    expect(summary.actual_margin_percentage).toBe("32.0000");
    expect(summary.actual_markup_percentage).toBe("47.0588");
  });

  await test.step("Financial Close", async () => {
    await page.getByRole("tab", { name: /^close$/i }).click();
    await expect(page.getByText(/^ready to close$/i)).toBeVisible();
    await page
      .locator("#finance-close-period")
      .selectOption(String(logisticsFixture.references.finance_period_id));
    await page
      .locator("#finance-close-reason")
      .fill("All Run 6 acceptance balances and Finance links reconciled.");
    const closeResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/v1/logistics/jobs/${jobId}/financial-close`) &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: /^close financials$/i }).click();
    expect([201, 202]).toContain((await closeResponse).status());
    await expect(page.getByText(/financially closed/i).first()).toBeVisible();
    await page
      .locator("#finance-reopen-reason")
      .fill("Authorized acceptance correction proof.");
    const reopenResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/v1/logistics/jobs/${jobId}/financial-reopen`) &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: /^reopen financials$/i }).click();
    expect([201, 202]).toContain((await reopenResponse).status());
    await expect(page.getByText(/revision 2/i)).toBeVisible();

    await page.getByRole("button", { name: /toggle theme/i }).first().click();
    await page.getByRole("menuitem", { name: /^dark$/i }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByRole("heading", { name: /finance \/ job costing/i })).toBeVisible();
    await page.getByRole("button", { name: /select language/i }).first().click();
    await page.getByRole("menuitem", { name: /አማርኛ|amharic/i }).click();
    await expect(
      page.getByRole("heading", { name: "ፋይናንስ / የሥራ ወጪ ስሌት" }),
    ).toBeVisible();
  });

  expect(failedRequests).toEqual([]);
  expect(failedResponses).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

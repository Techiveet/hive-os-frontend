import { expect, test } from "./fixtures";

test.use({ launchOptions: { args: [] }, video: "off" });

test("customs, generated manifest, and transit warehouse handoff work end to end", async ({ page, logisticsFixture }, testInfo) => {
  testInfo.setTimeout(Math.max(testInfo.timeout, 1_200_000)); page.setDefaultTimeout(60_000); page.setDefaultNavigationTimeout(90_000);
  const frontendUrl = logisticsFixture.frontend_url.replace(/\/$/, ""); const consoleErrors: string[] = []; const failedLogisticsResponses: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("response", (response) => { if (response.url().includes("/api/v1/logistics") && response.status() >= 400) failedLogisticsResponses.push(`${response.request().method()} ${response.status()} ${response.url()}`); });
  await page.addInitScript(() => { window.localStorage.setItem("hive_welcome_tour_completed", "true"); window.localStorage.setItem("hive_locale", "en"); window.localStorage.setItem("theme", "light"); });

  await page.goto(`${frontendUrl}/sign-in`); await page.locator("#email").fill(logisticsFixture.user.email); await page.locator("#password").fill(logisticsFixture.user.password);
  await page.getByRole("button", { name: /initiate handshake/i }).click(); await expect(page).toHaveURL(/\/dashboard(?:$|\?)/, { timeout: 90_000 }); consoleErrors.length = 0;

  await page.goto(`${frontendUrl}/dashboard/logistics/jobs/create`); await expect(page.getByRole("heading", { level: 1, name: /create forwarding job/i })).toBeVisible();
  await page.locator("#sales_customer_id").selectOption(String(logisticsFixture.references.customer_id)); await page.locator("#origin_node_id").selectOption({ label: "CN-SHA-FACTORY — Shanghai Factory" });
  await page.locator("#destination_node_id").selectOption({ label: "ETADD — Addis Ababa" }); await page.locator("#primary_transport_mode_id").selectOption({ label: "Ocean" });
  const createJobResponse = page.waitForResponse((response) => response.url().endsWith("/api/v1/logistics/jobs") && response.request().method() === "POST" && response.status() === 201);
  await page.getByRole("button", { name: /^create job$/i }).click(); const job = (await (await createJobResponse).json()).data as { id: number; job_number: string };
  await expect(page).toHaveURL(new RegExp(`/dashboard/logistics/jobs/${job.id}$`));

  await page.goto(`${frontendUrl}/dashboard/logistics/customs`); await expect(page.getByRole("heading", { level: 1, name: /customs cases/i })).toBeVisible();
  await page.getByText(/open customs case/i).first().click(); await page.locator("#customs-job").selectOption(String(job.id)); await page.locator("#customs-office").fill("Addis Ababa Customs");
  const createCaseResponse = page.waitForResponse((response) => response.url().endsWith("/api/v1/logistics/customs-cases") && response.request().method() === "POST" && response.status() === 201);
  await page.getByRole("button", { name: /^open customs case$/i }).click(); const customsCase = (await (await createCaseResponse).json()).data as { id: number; case_number: string };
  await page.goto(`${frontendUrl}/dashboard/logistics/customs/${customsCase.id}`); await expect(page.getByText(customsCase.case_number)).toBeVisible();
  const checklist = page.getByRole("checkbox");
  await expect(checklist).toHaveCount(3);
  for (let index = 0; index < 3; index += 1) {
    await checklist.nth(index).click();
    await expect(checklist.nth(index)).toHaveAttribute("aria-checked", "true");
  }
  await page.getByLabel(/hold type/i).fill("document_review"); await page.getByLabel(/hold reason/i).fill("Verify certificate of origin");
  await page.getByRole("button", { name: /place hold/i }).click(); await expect(page.getByText("Verify certificate of origin")).toBeVisible();
  await page.getByLabel(/resolution/i).fill("Certificate verified"); await page.getByRole("button", { name: /resolve hold/i }).click(); await expect(page.getByText(/customs hold resolved/i)).toBeVisible();

  await page.goto(`${frontendUrl}/dashboard/logistics/documents`); await expect(page.getByRole("heading", { level: 1, name: /freight documents/i })).toBeVisible();
  await page.getByText(/create document record/i).first().click(); await page.locator("#document-job").selectOption(String(job.id)); await page.locator("#document-type").selectOption({ label: "Freight manifest" });
  await page.locator("#document-number").fill(`MAN-${Date.now()}`); const createDocumentResponse = page.waitForResponse((response) => response.url().endsWith("/api/v1/logistics/documents") && response.request().method() === "POST" && response.status() === 201);
  await page.getByRole("button", { name: /^create document$/i }).click(); const freightDocument = (await (await createDocumentResponse).json()).data as { id: number; document_record_number: string };
  await page.goto(`${frontendUrl}/dashboard/logistics/documents/${freightDocument.id}`); await expect(page.getByText(freightDocument.document_record_number)).toBeVisible();
  const generateResponse = page.waitForResponse((response) => response.url().endsWith(`/api/v1/logistics/documents/${freightDocument.id}/generate`) && response.status() === 201);
  await page.getByRole("button", { name: /generate manifest/i }).click(); await generateResponse; await expect(page.getByText(/new immutable manifest version was generated/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /download version/i })).toBeVisible();

  await page.goto(`${frontendUrl}/dashboard/logistics/warehouse-handoffs`); await expect(page.getByRole("heading", { level: 1, name: /warehouse handoffs/i })).toBeVisible();
  await page.getByText(/create warehouse handoff/i).first().click(); await page.locator("#handoff-job").selectOption(String(job.id)); await page.locator("#handoff-warehouse").selectOption(String(logisticsFixture.references.warehouse_id));
  await page.locator("#handoff-purpose").selectOption("temporary_storage"); await page.locator("#handoff-treatment").selectOption("transit_only"); await page.locator("#handoff-quantity").fill("10");
  const createHandoffResponse = page.waitForResponse((response) => response.url().endsWith("/api/v1/logistics/warehouse-handoffs") && response.request().method() === "POST" && response.status() === 201);
  await page.getByRole("button", { name: /^create handoff$/i }).click(); const handoff = (await (await createHandoffResponse).json()).data as { id: number; handoff_number: string };
  await page.goto(`${frontendUrl}/dashboard/logistics/warehouse-handoffs/${handoff.id}`); await expect(page.getByText(handoff.handoff_number)).toBeVisible(); await page.getByLabel(/actual quantity/i).fill("9");
  const completeResponse = page.waitForResponse((response) => response.url().endsWith(`/api/v1/logistics/warehouse-handoffs/${handoff.id}/complete`) && response.status() === 200);
  await page.getByRole("button", { name: /complete handoff/i }).click(); await completeResponse; await expect(page.getByText(/received quantity differs from the expected handoff quantity/i)).toBeVisible();

  await page.evaluate(() => { window.localStorage.setItem("theme", "dark"); document.documentElement.classList.add("dark"); }); await expect(page.locator("html")).toHaveClass(/dark/);
  expect(failedLogisticsResponses, "unexpected Logistics API failures").toEqual([]); expect(consoleErrors, "browser console errors").toEqual([]);
});

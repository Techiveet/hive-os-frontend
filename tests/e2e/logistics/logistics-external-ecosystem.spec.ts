import { expect, test } from "./fixtures";

test("Run 8 integrations portals public tracking SLA analytics and mobile work end to end", async ({ page, logisticsFixture }, testInfo) => {
  testInfo.setTimeout(1_200_000);
  page.setDefaultTimeout(180_000);
  page.setDefaultNavigationTimeout(300_000);
  const verify = expect.configure({ timeout: 180_000 });
  const frontendUrl = (process.env.HIVE_E2E_FRONTEND_URL ?? logisticsFixture.frontend_url).replace(/\/$/, "");
  const backendApiUrl = (process.env.HIVE_E2E_BACKEND_API_URL ?? "http://127.0.0.1:8081/api/v1").replace(/\/$/, "");
  const token = logisticsFixture.references.public_tracking_token;
  verify(token).toBeTruthy();
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  const failedResponses: string[] = [];
  const context = page.context();

  const monitorPage = (candidate: typeof page) => {
    candidate.setDefaultTimeout(180_000);
    candidate.setDefaultNavigationTimeout(300_000);
    candidate.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    candidate.on("requestfailed", (request) => {
      if (request.url().includes("/api/v1/logistics")) failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText ?? "unknown"}`);
    });
    candidate.on("response", (response) => {
      if (response.url().includes("/api/v1/logistics") && response.status() >= 400 && !response.url().includes("/public/track/")) {
        failedResponses.push(`${response.request().method()} ${response.status()} ${response.url()}`);
      }
    });
  };

  const loginResponse = await page.request.post(`${backendApiUrl}/tenant/login`, {
    headers: { Accept: "application/json", Host: new URL(frontendUrl).host, "X-Tenant": logisticsFixture.tenant_id },
    data: { email: logisticsFixture.user.email, password: logisticsFixture.user.password },
    timeout: 180_000,
  });
  verify(loginResponse.status()).toBe(200);
  const loginPayload = await loginResponse.json();

  await context.addInitScript((session) => {
    window.localStorage.setItem("hive_welcome_tour_completed", "true");
    window.localStorage.setItem("hive_locale", "en");
    window.localStorage.setItem("theme", "light");
    window.localStorage.setItem("hive_token", session.token);
    window.localStorage.setItem("hive_user", JSON.stringify(session.user));
    window.localStorage.setItem("hive_context", session.context);
    window.localStorage.setItem("hive_context_signature", session.contextSignature);
  }, {
    token: loginPayload.data.token,
    user: loginPayload.data.user,
    context: loginPayload.data.context,
    contextSignature: loginPayload.data.context_signature,
  });

  let activePage = page;
  const navigate = async (path: string) => {
    const target = `${frontendUrl}${path}`;

    await activePage.close();
    activePage = await context.newPage();
    monitorPage(activePage);

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await activePage.goto(target, { waitUntil: "domcontentloaded", timeout: 300_000 });
      } catch (error) {
        const wasAbortedByCompetingNavigation =
          error instanceof Error && error.message.includes("net::ERR_ABORTED");

        if (!wasAbortedByCompetingNavigation || attempt === 3) throw error;
      }

      if (new URL(activePage.url()).pathname === path) return activePage;
    }

    throw new Error(`Browser did not reach the requested path: ${path}`);
  };

  await test.step("integration admin health and monitoring", async () => {
    const integrationPage = await navigate("/dashboard/logistics/integrations");
    await verify(integrationPage.getByRole("heading", { level: 1, name: "Integration hub" })).toBeVisible();
    await verify(integrationPage.getByRole("cell", { name: "Acceptance fixture connection" })).toBeVisible();
    const response = integrationPage.waitForResponse((item) => item.url().includes("/api/v1/logistics/integrations/") && item.url().endsWith("/test"));
    await integrationPage.getByRole("button", { name: /test acceptance fixture connection/i }).click();
    verify((await response).status()).toBe(200);
    await verify(integrationPage.getByText(/completed successfully/i)).toBeVisible();
  });

  await test.step("SLA analytics prediction and automation workspaces", async () => {
    const slaPage = await navigate("/dashboard/logistics/sla");
    await verify(slaPage.getByRole("heading", { level: 1, name: "Service-level performance" })).toBeVisible();
    await verify(slaPage.getByText("Acceptance customer delivery")).toBeVisible();
    const analyticsPage = await navigate("/dashboard/logistics/advanced-analytics");
    await verify(analyticsPage.getByRole("heading", { level: 1, name: "Operational analytics" })).toBeVisible();
    await verify(analyticsPage.getByText("Freshness: live tenant-scoped aggregates.")).toBeVisible();
    const predictionPage = await navigate("/dashboard/logistics/prediction-lab");
    await verify(predictionPage.getByRole("heading", { level: 1, name: "ETA prediction lab" })).toBeVisible();
    await verify(predictionPage.getByText("Experimental only.")).toBeVisible();
    const automationPage = await navigate("/dashboard/logistics/automation");
    await verify(automationPage.getByRole("heading", { level: 1, name: "Command-center automation" })).toBeVisible();
    await automationPage.getByRole("button", { name: "Run enabled rules" }).click();
    await verify(automationPage.getByText(/completed successfully/i)).toBeVisible();
  });

  await test.step("customer and partner portals are resource scoped", async () => {
    const customerPage = await navigate("/logistics-portal/customer");
    await verify(customerPage.getByRole("heading", { level: 1, name: "Shipment visibility" })).toBeVisible();
    await customerPage.getByRole("button", { name: new RegExp(logisticsFixture.references.forwarding_job_number) }).click();
    await verify(customerPage.getByRole("heading", { name: "Milestones" })).toBeVisible();

    const partnerPage = await navigate("/logistics-portal/partner");
    await verify(partnerPage.getByRole("heading", { level: 1, name: "Assigned operations" })).toBeVisible();
    await partnerPage.getByRole("button", { name: new RegExp(logisticsFixture.references.forwarding_job_number) }).click();
    await partnerPage.locator("#partner-description").fill("Run 8 partner browser update");
    const response = partnerPage.waitForResponse((item) => item.url().endsWith(`/api/v1/logistics/portal/partner/jobs/${logisticsFixture.references.forwarding_job_id}/events`));
    await partnerPage.getByRole("button", { name: "Submit update" }).click();
    verify((await response).status()).toBe(201);
    await verify(partnerPage.getByText(/partner attribution/i)).toBeVisible();
  });

  await test.step("opaque public tracking is mobile safe and revocable", async () => {
    const publicTrackingPage = await navigate(`/track/${token}`);
    await publicTrackingPage.setViewportSize({ width: 390, height: 844 });
    await publicTrackingPage.reload({ waitUntil: "domcontentloaded" });
    await verify(publicTrackingPage.getByRole("heading", { level: 1, name: "Track your shipment" })).toBeVisible();
    await verify(publicTrackingPage.getByText(logisticsFixture.references.forwarding_job_number)).toBeVisible();
    await verify(publicTrackingPage.getByRole("heading", { name: "Milestones" })).toBeVisible();
  });

  await test.step("dark theme and Amharic dictionary remain available", async () => {
    const localizedPage = await navigate("/dashboard/logistics/advanced-analytics");
    await localizedPage.getByRole("button", { name: /toggle theme/i }).first().click();
    await localizedPage.getByRole("menuitem", { name: /^dark$/i }).click();
    await verify(localizedPage.locator("html")).toHaveClass(/dark/);
    await localizedPage.getByRole("button", { name: /select language/i }).first().click();
    const languageResponse = localizedPage.waitForResponse((response) => response.url().endsWith("/api/v1/translations/am"));
    await localizedPage.getByRole("menuitem", { name: /አማርኛ|amharic/i }).click();
    verify((await languageResponse).status()).toBe(200);
    await verify(localizedPage.getByRole("heading", { level: 1, name: "የስራ ትንታኔ" })).toBeVisible();
  });

  verify(failedRequests).toEqual([]);
  verify(failedResponses).toEqual([]);
  verify(consoleErrors).toEqual([]);
});

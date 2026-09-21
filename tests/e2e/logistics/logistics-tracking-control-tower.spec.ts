import { expect, test } from "./fixtures";

test.use({ video: "off" });

test("tracking milestones exceptions and Control Tower work end to end", async ({ page, logisticsFixture }, testInfo) => {
  testInfo.setTimeout(900_000);
  page.setDefaultTimeout(180_000);
  page.setDefaultNavigationTimeout(180_000);
  const frontendUrl = logisticsFixture.frontend_url.replace(/\/$/, "");
  const jobId = logisticsFixture.references.forwarding_job_id;
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  const failedResponses: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    if (request.url().includes("/api/v1/logistics")) failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText ?? "unknown"}`);
  });
  page.on("response", (response) => {
    if (response.url().includes("/api/v1/logistics") && response.status() >= 400) failedResponses.push(`${response.request().method()} ${response.status()} ${response.url()}`);
  });
  const backendApiUrl = (process.env.HIVE_E2E_BACKEND_API_URL ?? "http://127.0.0.1:8081/api/v1").replace(/\/$/, "");
  const loginResponse = await page.request.post(`${backendApiUrl}/tenant/login`, {
    headers: {
      Accept: "application/json",
      Host: new URL(frontendUrl).host,
      "X-Tenant": logisticsFixture.tenant_id,
    },
    data: {
      email: logisticsFixture.user.email,
      password: logisticsFixture.user.password,
    },
    timeout: 180_000,
  });
  expect(loginResponse.status(), "acceptance user should authenticate through the real tenant API").toBe(200);
  const loginPayload = await loginResponse.json();
  expect(loginPayload.data?.token).toBeTruthy();
  expect(loginPayload.data?.user).toBeTruthy();
  expect(loginPayload.data?.context).toBeTruthy();
  expect(loginPayload.data?.context_signature).toBeTruthy();

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const incomingUrl = new URL(request.url());
    const apiPath = incomingUrl.pathname.split("/api/v1")[1] ?? "";
    const requestHeaders = await request.allHeaders();
    delete requestHeaders.host;
    delete requestHeaders["content-length"];
    delete requestHeaders.connection;
    requestHeaders.Host = new URL(frontendUrl).host;
    requestHeaders["X-Tenant"] = logisticsFixture.tenant_id;

    const requestBody = request.postDataBuffer();
    const backendResponse = await page.request.fetch(
      `${backendApiUrl}${apiPath}${incomingUrl.search}`,
      {
        method: request.method(),
        headers: requestHeaders,
        data: requestBody ?? undefined,
        failOnStatusCode: false,
        timeout: 180_000,
      },
    );
    const responseHeaders = backendResponse.headers();
    delete responseHeaders["content-encoding"];
    delete responseHeaders["content-length"];
    delete responseHeaders.connection;
    delete responseHeaders["transfer-encoding"];

    await route.fulfill({
      status: backendResponse.status(),
      headers: responseHeaders,
      body: await backendResponse.body(),
    });
  });

  await page.addInitScript((session) => {
    window.localStorage.setItem("hive_welcome_tour_completed", "true");
    if (!window.localStorage.getItem("hive_locale")) {
      window.localStorage.setItem("hive_locale", "en");
    }
    if (!window.localStorage.getItem("theme")) {
      window.localStorage.setItem("theme", "light");
    }
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
  const navigate = (path: string) => page.goto(`${frontendUrl}${path}`, {
    waitUntil: "domcontentloaded",
    timeout: 180_000,
  });

  await navigate("/dashboard");
  await expect(page).toHaveURL(/\/dashboard(?:$|\?)/, { timeout: 180_000 });
  consoleErrors.length = 0;

  await test.step("multimodal job tracking and permission-aware tour", async () => {
    await navigate(`/dashboard/logistics/jobs/${jobId}`);
    await expect(
      page.getByRole("heading", { level: 1, name: logisticsFixture.references.forwarding_job_number }),
    ).toBeVisible({ timeout: 180_000 });
    await expect(page.getByRole("heading", { name: /tracking and milestones/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /milestone plan/i })).toBeVisible({ timeout: 180_000 });
    await expect(page.getByText(/acceptance fixture pickup confirmation/i)).toBeVisible({ timeout: 180_000 });
    await expect(page.getByText(/open operational exceptions/i)).toBeVisible({ timeout: 180_000 });
    await page.getByRole("button", { name: /^tracking tour$/i }).click();
    await expect(page.getByRole("heading", { name: /^shipment tracking workspace$/i })).toBeVisible();
    await page.getByRole("button", { name: /^close tour$/i }).click();
  });

  await test.step("manual event and ETA update preserve operational history", async () => {
    await page.locator("#tracking-event-code").selectOption("arrived");
    await page.locator("#tracking-description").fill("Run 7 browser arrival evidence");
    const eventResponse = page.waitForResponse((response) => response.url().endsWith(`/api/v1/logistics/jobs/${jobId}/tracking-events`) && response.request().method() === "POST");
    await page.getByRole("button", { name: /^record event$/i }).click();
    expect((await eventResponse).status()).toBe(200);
    await page.getByRole("button", { name: /^refresh$/i }).click();
    await expect(page.getByText("Run 7 browser arrival evidence", { exact: true }).first()).toBeVisible();

    const eta = await page.evaluate(() => {
      const value = new Date();
      value.setDate(value.getDate() + 10);
      value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
      return value.toISOString().slice(0, 16);
    });
    await page.locator("#tracking-eta").fill(eta);
    await page.locator("#tracking-eta-reason").fill("Run 7 browser carrier schedule update");
    const etaResponse = page.waitForResponse((response) => response.url().endsWith(`/api/v1/logistics/jobs/${jobId}/eta`) && response.request().method() === "POST");
    await page.getByRole("button", { name: /^record eta$/i }).click();
    expect((await etaResponse).status()).toBe(200);
    await expect(page.getByText(/open operational exceptions/i)).toBeVisible();
  });

  await test.step("Control Tower triage and managed exception recovery", async () => {
    await navigate("/dashboard/logistics/control-tower");
    await expect(page.getByRole("heading", { level: 1, name: /^control tower$/i })).toBeVisible({ timeout: 180_000 });
    await expect(
      page.locator(`a[href="/dashboard/logistics/jobs/${jobId}?tab=tracking"]:visible`),
    ).toBeVisible({ timeout: 180_000 });
    await page.getByRole("button", { name: /^control tower tour$/i }).click();
    await expect(page.getByRole("heading", { name: /^operations control tower$/i })).toBeVisible();
    await page.getByRole("button", { name: /^close tour$/i }).click();

    await navigate("/dashboard/logistics/exceptions");
    await expect(page.getByRole("heading", { level: 1, name: /operational exceptions/i })).toBeVisible({ timeout: 180_000 });
    const exceptionLink = page.getByRole("link").filter({ hasText: logisticsFixture.references.forwarding_job_number }).first();
    await expect(exceptionLink).toBeVisible({ timeout: 180_000 });
    const exceptionHref = await exceptionLink.getAttribute("href");
    expect(exceptionHref).toMatch(/^\/dashboard\/logistics\/exceptions\/\d+$/);
    await navigate(exceptionHref!);
    await expect(page.getByRole("heading", { name: /exception context/i })).toBeVisible({ timeout: 180_000 });
    await page.locator("#exception-transition").selectOption("acknowledged");
    const transitionResponse = page.waitForResponse((response) => response.url().includes("/api/v1/logistics/exceptions/") && response.url().endsWith("/transition") && response.request().method() === "POST");
    await page.getByRole("button", { name: /^update exception$/i }).click();
    expect((await transitionResponse).status()).toBe(200);
    await expect(page.getByText(/^acknowledged$/i).first()).toBeVisible({ timeout: 180_000 });
    await page.locator("#exception-comment").fill("Carrier update reviewed by the acceptance operator.");
    await page.getByRole("button", { name: /^add comment$/i }).click();
    await expect(page.getByText("Carrier update reviewed by the acceptance operator.")).toBeVisible({ timeout: 180_000 });
  });

  await test.step("Command Center, operational report, theme, and Amharic", async () => {
    await navigate("/dashboard/logistics/command-center");
    await expect(page.getByRole("heading", { level: 1, name: /logistics command center/i })).toBeVisible({ timeout: 180_000 });
    await expect(page.getByText(/predictive ETA foundation only/i)).toBeVisible({ timeout: 180_000 });
    await navigate("/dashboard/logistics/operational-reports");
    await expect(page.getByRole("heading", { level: 1, name: /logistics operational reports/i })).toBeVisible({ timeout: 180_000 });
    await expect(page.getByText(/delayed arrival/i).first()).toBeVisible({ timeout: 180_000 });
    await page.getByRole("button", { name: /toggle theme/i }).first().click();
    await page.getByRole("menuitem", { name: /^dark$/i }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.getByRole("button", { name: /select language/i }).first().click();
    const amharicDictionaryResponse = page.waitForResponse(
      (response) => response.url().endsWith("/api/v1/translations/am") && response.request().method() === "GET",
    );
    await page.getByRole("menuitem", { name: /አማርኛ|amharic/i }).click();
    expect((await amharicDictionaryResponse).status()).toBe(200);
    await expect(page.getByText("am", { exact: true }).first()).toBeVisible({ timeout: 180_000 });
    await navigate("/dashboard/logistics/control-tower");
    await expect(page.getByRole("heading", { level: 1, name: "የቁጥጥር ማዕከል" })).toBeVisible({ timeout: 180_000 });
  });

  await page.unrouteAll({ behavior: "ignoreErrors" });
  expect(failedRequests, "unexpected Logistics request failures").toEqual([]);
  expect(failedResponses, "unexpected Logistics API failures").toEqual([]);
  expect(consoleErrors, "browser console errors").toEqual([]);
});

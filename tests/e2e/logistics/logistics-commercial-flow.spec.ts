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

test("commercial rate becomes an accepted multimodal forwarding job", async ({
  page,
  logisticsFixture,
}, testInfo) => {
  const frontendUrl = logisticsFixture.frontend_url.replace(/\/$/, "");
  const email = logisticsFixture.user.email;
  const password = logisticsFixture.user.password;
  testInfo.setTimeout(600_000);
  page.setDefaultTimeout(60_000);
  page.setDefaultNavigationTimeout(90_000);
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  const failedResponses: string[] = [];
  const runId = Date.now().toString();
  const rateName = "Run 3 E2E Shanghai Addis " + runId;
  const serviceType = "door_to_door_e2e_" + runId;
  const carrierReference = "E2E-CARRIER-" + runId;

  page.on("console", (message) => {
    if (message.type() === "error") {
      const location = message.location();
      consoleErrors.push(
        message.text() +
          (location.url
            ? " @ " +
              location.url +
              ":" +
              location.lineNumber +
              ":" +
              location.columnNumber
            : ""),
      );
    }
  });
  page.on("requestfailed", (request) => {
    if (request.url().includes("/api/v1/logistics")) {
      failedRequests.push(
        request.method() +
          " " +
          request.url() +
          ": " +
          (request.failure()?.errorText ?? "unknown failure"),
      );
    }
  });
  page.on("response", (response) => {
    if (
      response.url().includes("/api/v1/logistics") &&
      response.status() >= 400
    ) {
      failedResponses.push(
        response.request().method() +
          " " +
          response.status() +
          " " +
          response.url(),
      );
    }
  });

  await page.addInitScript(() => {
    window.localStorage.setItem("hive_welcome_tour_completed", "true");
    window.localStorage.setItem("hive_locale", "en");
    window.localStorage.setItem("theme", "light");
  });

  await page.goto(frontendUrl + "/sign-in");
  await page.locator("#email").waitFor({ state: "visible", timeout: 90_000 });
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /initiate handshake/i }).click();
  await expect(page).toHaveURL(/\/dashboard(?:$|\?)/, { timeout: 60_000 });
  consoleErrors.length = 0;

  const navigation = page.getByRole("navigation", {
    name: /dashboard navigation/i,
  });
  const modulesButton = navigation.getByRole("button", { name: /^modules$/i });
  await expect(modulesButton).toBeVisible({ timeout: 60_000 });
  await modulesButton.click();
  const logisticsButton = navigation.getByRole("button", {
    name: /logistics.*freight forwarding/i,
  });
  await expect(logisticsButton).toBeVisible();
  await logisticsButton.click();
  await expect(logisticsButton).toHaveAttribute("aria-expanded", "true");
  await expect(
    navigation.getByRole("link", { name: /rate sheets/i }),
  ).toBeVisible();
  await expect(
    navigation.getByRole("link", { name: /quotations/i }),
  ).toBeVisible();
  await expect(
    navigation.getByRole("link", { name: /bookings/i }),
  ).toBeVisible();

  await page.goto(frontendUrl + "/dashboard/logistics/rates");
  await expect(
    page.getByRole("heading", { level: 1, name: /^rate sheets$/i }),
  ).toBeVisible({ timeout: 60_000 });
  const referencesDiagnostic = await page.evaluate(async () => {
    const token = window.localStorage.getItem("hive_token");
    const context = window.localStorage.getItem("hive_context");
    const signature = window.localStorage.getItem("hive_context_signature");
    const hasTenantContext = Boolean(context && context !== "central");
    const response = await fetch("/api/v1/logistics/reference-data", {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(hasTenantContext && context ? { "X-Tenant": context } : {}),
        ...(hasTenantContext && signature
          ? { "X-Tenant-Signature": signature }
          : {}),
      },
    });

    return { status: response.status, body: await response.text() };
  });
  expect(
    referencesDiagnostic.status,
    "reference-data response: " + referencesDiagnostic.body,
  ).toBe(200);
  await page.getByRole("button", { name: /new rate sheet/i }).click();
  await page.getByLabel(/^name$/i).fill(rateName);
  await page.getByLabel(/^provider$/i).selectOption({
    label: "Blue Ocean Carrier",
  });
  await page.getByLabel(/^customer$/i).selectOption({
    label: "ABC Manufacturing",
  });
  await page.getByLabel(/^mode$/i).selectOption({ label: "Ocean" });
  await page.getByLabel(/^origin$/i).selectOption({
    label: "CN-SHA-FACTORY — Shanghai Factory",
  });
  await page.getByLabel(/^destination$/i).selectOption({
    label: "ETADD — Addis Ababa",
  });
  await page.getByLabel(/^service category$/i).fill(serviceType);
  await page.getByLabel(/^effective date$/i).fill("2026-09-01");
  await page.getByLabel(/^expiry date$/i).fill("2027-12-31");
  await page.getByLabel(/^charge code$/i).selectOption({
    label: "FREIGHT — Base freight",
  });
  await page.getByLabel(/^description$/i).fill("Door-to-door freight");
  await page.getByLabel(/^calculation basis$/i).selectOption("flat");
  await page.getByLabel(/^buy rate$/i).fill("1000.00");
  await page.getByLabel(/^sell rate$/i).fill("1250.00");
  const createRateResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/logistics/rate-sheets") &&
      response.request().method() === "POST" &&
      response.status() === 201,
  );
  await page.getByRole("button", { name: /^create rate sheet$/i }).click();
  const createdRate = await createRateResponse;
  const ratePayload = (await createdRate.json()) as {
    data: { id: number; rate_sheet_number: string };
  };
  await expect(page.getByText(rateName, { exact: true })).toBeVisible();

  await page
    .getByRole("link", {
      name: new RegExp(ratePayload.data.rate_sheet_number),
    })
    .first()
    .click();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: ratePayload.data.rate_sheet_number,
    }),
  ).toBeVisible({ timeout: 60_000 });
  const activateRateResponse = page.waitForResponse(
    (response) =>
      response
        .url()
        .endsWith(
          "/api/v1/logistics/rate-sheets/" +
            ratePayload.data.id +
            "/activate",
        ) && response.status() === 200,
  );
  await page.getByRole("button", { name: /activate rate/i }).click();
  await activateRateResponse;
  await expect(page.getByText(/^active$/i)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("1000.000000")).toBeVisible();
  await expect(page.getByText("1250.000000")).toBeVisible();

  await page.goto(frontendUrl + "/dashboard/logistics/quotations/create");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /create freight quotation/i,
    }),
  ).toBeVisible({ timeout: 60_000 });
  await page.locator("#quote-customer").selectOption({
    label: "ABC Manufacturing",
  });
  await page.locator("#quote-origin").selectOption({
    label: "CN-SHA-FACTORY — Shanghai Factory",
  });
  await page.locator("#quote-destination").selectOption({
    label: "ETADD — Addis Ababa",
  });
  await page.locator("#quote-mode").selectOption({ label: "Ocean" });
  await page.locator("#quote-provider").selectOption({
    label: "Blue Ocean Carrier",
  });
  await page.locator("#quote-incoterm").selectOption({
    label: "DAP — Delivered at Place",
  });
  await page.locator("#quote-service").fill(serviceType);
  await page.locator("#quote-departure").fill("2026-11-01");
  await page.locator("#quote-valid").fill("2026-12-31");
  await page.locator("#quote-shipper").fill("ABC Manufacturing");
  await page.locator("#quote-consignee").fill("Addis Ababa Customer");
  await page.locator("#cargo-description").fill("Industrial machine parts");
  await page.locator("#cargo-quantity").fill("20");
  await page.locator("#cargo-package").fill("Pallets");
  await page.locator("#cargo-weight").fill("2000");
  await page.locator("#cargo-volume").fill("12.5");
  const addLegButton = page.getByRole("button", {
    name: /^add transport leg$/i,
  });
  for (let index = 0; index < 3; index += 1) {
    await addLegButton.click();
  }

  const legFieldsets = page.locator("form fieldset");
  await expect(legFieldsets).toHaveCount(4);
  const legValues = [
    {
      mode: "Road",
      origin: "CN-SHA-FACTORY — Shanghai Factory",
      destination: "CNSHA — Shanghai Port",
    },
    {
      mode: "Ocean",
      origin: "CNSHA — Shanghai Port",
      destination: "DJJIB — Djibouti Port",
    },
    {
      mode: "Rail",
      origin: "DJJIB — Djibouti Port",
      destination: "ETMOD — Modjo Rail Terminal",
    },
    {
      mode: "Road",
      origin: "ETMOD — Modjo Rail Terminal",
      destination: "ETADD — Addis Ababa",
    },
  ];
  for (let index = 0; index < legValues.length; index += 1) {
    const leg = legFieldsets.nth(index);
    await leg.getByLabel(/^mode$/i).selectOption({
      label: legValues[index].mode,
    });
    await leg.getByLabel(/^origin$/i).selectOption({
      label: legValues[index].origin,
    });
    await leg.getByLabel(/^destination$/i).selectOption({
      label: legValues[index].destination,
    });
    await leg.getByLabel(/^provider$/i).selectOption({
      label: "Blue Ocean Carrier",
    });
  }

  const lookupResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/logistics/rates/lookup") &&
      response.status() === 200,
  );
  await page.getByRole("button", { name: /find applicable rates/i }).click();
  await lookupResponse;
  await expect(page.getByRole("alert").filter({ hasText: rateName })).toContainText(
    "USD 1250.00",
  );

  const createQuotationResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/logistics/quotations") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: /^save draft$/i }).click();
  const createdQuotation = await createQuotationResponse;
  expect(
    createdQuotation.status(),
    "quotation create response: " + (await createdQuotation.text()),
  ).toBe(201);
  const quotationPayload = (await createdQuotation.json()) as {
    data: {
      id: number;
      quotation_number: string;
      revision: { id: number; options: Array<{ id: number }> };
    };
  };
  await expect(page).toHaveURL(
    new RegExp("/dashboard/logistics/quotations/" + quotationPayload.data.id),
    { timeout: 90_000 },
  );
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: quotationPayload.data.quotation_number,
    }),
  ).toBeVisible({ timeout: 60_000 });

  await page.getByRole("tab", { name: /^transport route$/i }).click();
  await expect(page.getByText("Shanghai Factory → Shanghai Port")).toBeVisible();
  await expect(page.getByText("Shanghai Port → Djibouti Port")).toBeVisible();
  await expect(
    page.getByText("Djibouti Port → Modjo Rail Terminal"),
  ).toBeVisible();
  await expect(
    page.getByText("Modjo Rail Terminal → Addis Ababa"),
  ).toBeVisible();
  await page.getByRole("tab", { name: /^pricing$/i }).click();
  await expect(page.getByRole("cell", { name: "USD 1000.00" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "USD 1250.00" })).toBeVisible();
  await expect(page.getByText(/gross margin 20\.0+%/i)).toBeVisible();

  const submitResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/submit") && response.status() < 300,
  );
  await page.getByRole("button", { name: /submit for approval/i }).click();
  await submitResponse;
  await expect(page.getByText(/^approved$/i)).toBeVisible({ timeout: 60_000 });

  const sendResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/send") && response.status() === 200,
  );
  await page.getByRole("button", { name: /mark as sent/i }).click();
  await sendResponse;
  await expect(page.getByText(/^sent$/i)).toBeVisible({ timeout: 60_000 });

  await page.getByRole("button", { name: /^record acceptance$/i }).click();
  await page
    .getByLabel(/^internal notes$/i)
    .fill("Accepted by customer for E2E");
  const acceptResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/accept") && response.status() === 200,
  );
  await page.getByRole("button", { name: /confirm acceptance/i }).click();
  await acceptResponse;
  await expect(page.getByText(/^accepted$/i)).toBeVisible({ timeout: 60_000 });

  const conversionResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/convert") && response.status() < 300,
  );
  await page.getByRole("button", { name: /convert to booking/i }).click();
  const converted = await conversionResponse;
  const bookingPayload = (await converted.json()) as {
    data: {
      id: number;
      booking_number: string;
      forwarding_job_id: number;
    };
  };
  await expect(page).toHaveURL(
    new RegExp("/dashboard/logistics/bookings/" + bookingPayload.data.id),
    { timeout: 90_000 },
  );
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: bookingPayload.data.booking_number,
    }),
  ).toBeVisible({ timeout: 60_000 });

  await page.getByRole("tab", { name: /carrier confirmation/i }).click();
  await page.locator("#booking-status").selectOption("requested");
  let bookingUpdate = page.waitForResponse(
    (response) =>
      response.url().includes("/status") && response.status() === 200,
  );
  await page.getByRole("button", { name: /update booking/i }).click();
  await bookingUpdate;
  await expect(
    page.locator('[data-slot="badge"]').filter({ hasText: /^requested$/i }),
  ).toBeVisible({ timeout: 60_000 });

  await page.locator("#booking-status").selectOption("confirmed");
  await page.locator("#carrier-reference").fill(carrierReference);
  await page.locator("#confirmed-departure").fill("2026-11-01T09:00");
  await page.locator("#confirmed-arrival").fill("2026-11-20T10:00");
  bookingUpdate = page.waitForResponse(
    (response) =>
      response.url().includes("/status") && response.status() === 200,
  );
  await page.getByRole("button", { name: /update booking/i }).click();
  await bookingUpdate;
  await expect(
    page.locator('[data-slot="badge"]').filter({ hasText: /^confirmed$/i }),
  ).toBeVisible({ timeout: 60_000 });

  await page.getByRole("tab", { name: /^amendments$/i }).click();
  await page.locator("#amend-reference").fill(carrierReference + "-A1");
  await page
    .locator("#amend-reason")
    .fill("Carrier reference correction after confirmation");
  const amendmentResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/amendments") && response.status() < 300,
  );
  await page.getByRole("button", { name: /request amendment/i }).click();
  await amendmentResponse;
  await expect(
    page.getByText("Carrier reference correction after confirmation"),
  ).toBeVisible({ timeout: 60_000 });

  await page.getByRole("tab", { name: /^job overview$/i }).click();
  const jobLink = page.getByRole("link", { name: /^LF-/i });
  await expect(jobLink).toBeVisible({ timeout: 60_000 });
  await jobLink.click();
  await expect(page).toHaveURL(
    new RegExp("/dashboard/logistics/jobs/" + bookingPayload.data.forwarding_job_id),
    { timeout: 90_000 },
  );
  await expect(
    page.getByRole("heading", { level: 2, name: /multimodal route builder/i }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Shanghai Factory → Shanghai Port")).toBeVisible();
  await expect(page.getByText("Shanghai Port → Djibouti Port")).toBeVisible();
  await expect(
    page.getByText("Djibouti Port → Modjo Rail Terminal"),
  ).toBeVisible();
  await expect(
    page.getByText("Modjo Rail Terminal → Addis Ababa"),
  ).toBeVisible();
  await expect(page.getByText(/revision 1/i)).toBeVisible();

  const firstRevision = page
    .locator("details")
    .filter({ hasText: /revise leg/i })
    .first();
  await firstRevision.locator("summary").click();
  await firstRevision
    .getByLabel(/^internal notes$/i)
    .fill("Live route review " + runId);
  const reviseLegResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/legs/") &&
      response.request().method() === "PUT" &&
      response.status() === 200,
  );
  await firstRevision.getByRole("button", { name: /^revise leg$/i }).click();
  await reviseLegResponse;
  await expect(page.getByText(/revision 2/i)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/new route revision was created/i)).toBeVisible();

  const languageButton = page.locator("#tour-topbar-language");
  await languageButton.click();
  await page.getByRole("menuitem").filter({ hasText: "አማርኛ" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "am");
  await expect(page.getByText("ባለብዙ ዘዴ መንገድ ገንቢ")).toBeVisible();
  await languageButton.click();
  await page.getByRole("menuitem").filter({ hasText: "English" }).first().click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  const themeButton = page
    .locator("#tour-topbar-theme")
    .getByRole("button", { name: /toggle theme/i });
  await themeButton.click();
  await page.getByRole("menuitem", { name: /^dark$/i }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await themeButton.click();
  await page.getByRole("menuitem", { name: /^light$/i }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);

  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  expect(await page.locator("body").innerText()).not.toMatch(/logistics\.[a-z_]/);

  const actionableConsoleErrors = consoleErrors.filter(
    (message) =>
      !message.includes("WebSocket connection to 'ws://localhost:9095/"),
  );
  expect(failedRequests).toEqual([]);
  expect(failedResponses).toEqual([]);
  expect(actionableConsoleErrors).toEqual([]);
});

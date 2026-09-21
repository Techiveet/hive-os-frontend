import assert from "node:assert/strict";
import { firefox } from "playwright";

const browser = await firefox.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
});
const page = await context.newPage();
const pageErrors = [];
const consoleErrors = [];

page.on("pageerror", (error) => pageErrors.push(String(error)));
page.on("console", (message) => {
  if (message.type() === "error") {
    consoleErrors.push(message.text());
  }
});

try {
  await page.goto("http://techive.localhost:3001/sign-in", {
    waitUntil: "domcontentloaded",
  });
  await page.getByLabel("System Identifier").fill("mesganaw@techive.com");
  await page.getByLabel("Encryption Key").fill("password");
  await page.getByRole("button", { name: /Initiate Handshake/i }).click();
  await page.waitForURL(/\/dashboard(?:\/|$)/, { timeout: 30_000 });

  await page.evaluate(() => {
    window.sessionStorage.setItem("hive_quota_regression", "enabled");
  });
  await page.addInitScript(() => {
    if (window.sessionStorage.getItem("hive_quota_regression") !== "enabled") {
      return;
    }

    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItemWithQuotaFailure(key, value) {
      if (
        this === window.localStorage &&
        (key.startsWith("hive_audio_") || key.includes("query-cache"))
      ) {
        throw new DOMException(
          "The quota has been exceeded.",
          "QuotaExceededError",
        );
      }

      return originalSetItem.call(this, key, value);
    };
  });

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/dashboard(?:\/|$)/, { timeout: 30_000 });
  await page.locator("main").first().waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForTimeout(1_000);

  assert.equal(
    pageErrors.filter((error) => /QuotaExceededError|quota has been exceeded/i.test(error)).length,
    0,
    `Firefox raised an uncaught quota page error: ${pageErrors.join(" | ")}`,
  );
  assert.equal(
    consoleErrors.filter((error) => /QuotaExceededError|quota has been exceeded/i.test(error)).length,
    0,
    `Firefox logged an uncaught quota console error: ${consoleErrors.join(" | ")}`,
  );
  assert.match(page.url(), /\/dashboard(?:\/|$)/);

  const session = await page.evaluate(() => ({
    token: window.localStorage.getItem("hive_token"),
    tenant: window.localStorage.getItem("hive_context"),
    signature: window.localStorage.getItem("hive_context_signature"),
  }));

  if (session.token) {
    await context.request.post(
      "http://127.0.0.1:8081/api/v1/logout",
      {
        headers: {
          Host: "techive.localhost",
          Accept: "application/json",
          Authorization: `Bearer ${session.token}`,
          ...(session.tenant ? { "X-Tenant": session.tenant } : {}),
          ...(session.signature
            ? { "X-Tenant-Signature": session.signature }
            : {}),
        },
      },
    );
  }

  console.log(
    `firefox storage resilience check passed; pageErrors=${pageErrors.length}; consoleErrors=${consoleErrors.length}`,
  );
} finally {
  await browser.close();
}

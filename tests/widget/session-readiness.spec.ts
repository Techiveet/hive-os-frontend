import { test, expect, type Page } from "@playwright/test";

async function mockSupport(page: Page) {
  let release!: () => void;
  let requested!: () => void;
  const gate = new Promise<void>(r => { release = r; });
  const sessionRequested = new Promise<void>(r => { requested = r; });
  const sent: string[] = [];
  await page.route("**/public/support-bot/readiness-test/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/config")) return route.fulfill({ json: { data: { id: 999999, slug: "readiness-test", name: "Readiness test", primary_color: "#0e241e", enable_human_escalation: true, greeting_message: "Readiness fixture", widget_config: { title: "Readiness test", launcher_label: "Readiness test", suggested_questions: ["First suggestion"] } } } });
    if (path.endsWith("/session")) {
      requested(); await gate;
      return route.fulfill({ json: { data: { session_id: "fixture-session", session_token: "fixture-token-not-a-production-credential", messages: [], status: "active", with_agent: false } } });
    }
    if (path.endsWith("/chat")) {
      sent.push(route.request().postDataJSON().message);
      return route.fulfill({ json: { data: { status: "active", messages: [{ id: 1, sender_type: "bot", content: "Fixture answer" }] } } });
    }
    return route.fulfill({ json: { data: { messages: [] } } });
  });
  return { release, sessionRequested, sent };
}

test("first message waits for a validated session and Enter sends it exactly once", async ({ page }) => {
  const { release, sessionRequested, sent } = await mockSupport(page);
  await page.goto("/embed/support-bot/readiness-test");
  await page.getByRole("button", { name: "Readiness test", exact: true }).click();
  await sessionRequested;
  const input = page.getByRole("textbox", { name: "Message", exact: true });
  try {
    await expect(input).toBeDisabled({ timeout: 3000 });
    await expect(page.getByRole("button", { name: "Send message", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Talk to a person", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "First suggestion", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Start dictation", exact: true })).toBeDisabled();
  } finally { release(); }
  await expect(input).toBeEnabled();
  await input.fill("First real question");
  await input.press("Enter");
  await expect(page.getByText("Fixture answer", { exact: true })).toBeVisible();
  expect(sent).toEqual(["First real question"]);
});


test("an initial host send waits for the session and is delivered exactly once", async ({ page, baseURL }) => {
  const { release, sessionRequested, sent } = await mockSupport(page);
  const host = new URL(baseURL || "http://127.0.0.1:3001").origin;
  await page.goto(`/embed/support-bot/readiness-test?host=${encodeURIComponent(host)}`);
  await page.getByRole("button", { name: "Readiness test", exact: true }).waitFor();
  await page.evaluate(() => window.postMessage({ channel: "hive-support-bot", slug: "readiness-test", type: "send", text: "Host first question" }, location.origin));
  await sessionRequested;
  await expect(page.getByRole("textbox", { name: "Message", exact: true })).toBeDisabled();
  release();
  await expect(page.getByText("Fixture answer", { exact: true })).toBeVisible();
  expect(sent).toEqual(["Host first question"]);
});

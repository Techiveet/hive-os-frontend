import { test, expect, type Page } from "@playwright/test";

const description = "A complete workspace for growing teams managing finance, people, stock, and customer relationships across multiple locations.";
const modules = [
  ["image_editor", "Image Editor"], ["video_player", "Video Player"],
  ["audio_player", "Audio Player"], ["media_library", "Media Library"],
  ["document_converter", "Document Converter"],
  ["financial_management", "Financial Management"], ["invoice_billing", "Invoice & Billing"],
  ["human_resources", "Human Resources"], ["payroll_management", "Payroll Management"],
  ["inventory_control", "Inventory Control"],
];

async function loadLanding(page: Page, theme = "dark") {
  await page.addInitScript(theme => localStorage.setItem("theme", theme), theme);
  const apiRequests: string[] = [];
  // Read-only UI fixtures: this suite never provisions tenants or opens real chats.
  await page.route("**/api/v1/**", async route => {
    const pathname = new URL(route.request().url()).pathname;
    apiRequests.push(pathname);
    let data: unknown = {};
    if (pathname.endsWith("/settings/brand/public")) data = { app_title: "Hive", primary_color: "#2563eb" };
    if (pathname.endsWith("/public/subscriptions/catalog")) data = {
      catalog: modules.map(([slug, name]) => ({ slug, name })),
      plan_pricing: { business: { name: "Business", description, monthly_price_etb: 1000, mail_storage_quota_mb: 1024 } },
      plan_defaults: { business: modules.map(([slug]) => slug) },
      billing_policy: { public_catalog_mode: "self_service", public_show_subscription_types: true, yearly_discount_percent: 10 },
    };
    if (pathname.endsWith("/public/support-bot/workspace-assistant/config")) data = { name: "Queen Bee", primary_color: "#92400e", widget_config: {} };
    if (pathname.includes("/public/support-bot/hive-ai-assistant/")) return route.fulfill({ status: 404, json: {} });
    await route.fulfill({ json: { data } });
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Ask Queen Bee", exact: true })).toBeVisible();
  return apiRequests;
}

for (const { width, theme } of [{ width: 320, theme: "dark" }, { width: 390, theme: "dark" }, { width: 390, theme: "light" }]) {
  test(`mobile drawer is visible, focus-contained and dismissible at ${width}px in ${theme}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    const requests = await loadLanding(page, theme);
    const trigger = page.getByRole("button", { name: "Open menu", exact: true });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Navigation", exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Navigation" })).toBeFocused();
    await expect(dialog.getByRole("button", { name: "Platform", exact: true })).toBeVisible();
    expect(await dialog.evaluate(el => {
      const r = el.getBoundingClientRect();
      return el.contains(document.elementFromPoint(r.x + r.width / 2, 120));
    })).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("mobile-menu.png") });
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press("Tab");
      expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
    }
    await dialog.getByRole("button", { name: "Platform", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "Platform", exact: true })).toHaveAttribute("aria-expanded", "true");
    await dialog.getByRole("button", { name: "Select Language", exact: true }).click();
    await expect(page.getByRole("menu")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Close menu", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.mouse.click(5, 400);
    await expect(dialog).toHaveCount(0);
    await trigger.click();
    await dialog.getByRole("button", { name: "How it works", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(requests.filter(url => url.endsWith("/settings/brand/public"))).toHaveLength(1);
    expect(requests).toContain("/api/v1/public/support-bot/workspace-assistant/config");
    expect(requests.some(url => url.includes("hive-ai-assistant"))).toBe(false);
  });
}

test("drawer closes when resized to desktop and releases the page", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loadLanding(page);
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveCSS("pointer-events", "none");
});

for (const theme of ["dark", "light"]) {
  test(`desktop content, language and footer have clear space in ${theme}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loadLanding(page, theme);
    const language = page.getByRole("button", { name: "Select Language", exact: true });
    expect(await language.evaluate(el => {
      const icon = el.querySelector("svg")!.getBoundingClientRect();
      const badge = el.querySelector("span")!.getBoundingClientRect();
      const button = el.getBoundingClientRect();
      return icon.right <= badge.left && badge.right <= button.right && badge.bottom <= button.bottom;
    })).toBe(true);
    await expect(page.getByText(description, { exact: true })).toBeAttached();
    expect(await page.getByText(description, { exact: true }).evaluate(el => getComputedStyle(el).webkitLineClamp)).toBe("none");
    const pricing = page.locator("#pricing");
    await expect(pricing.getByText("Financial Management", { exact: true })).toBeAttached();
    await expect(pricing.getByText("Image Editor", { exact: true })).toHaveCount(0);
    const architecture = page.locator("#architecture");
    await architecture.scrollIntoViewIfNeeded();
    await expect(architecture.getByRole("heading", { name: "Containerized Multi-Tenancy" })).toBeVisible();
    expect(await architecture.getByRole("heading", { name: "Containerized Multi-Tenancy" }).evaluate(el => {
      for (let p: Element | null = el; p; p = p.parentElement) if (getComputedStyle(p).opacity === "0") return false;
      return true;
    })).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("architecture.png") });
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
    const top = page.getByRole("button", { name: "Back to top", exact: true });
    await expect(top).toBeVisible();
    await page.waitForTimeout(600);
    const bee = page.getByRole("button", { name: "Ask Queen Bee", exact: true });
    const a = (await top.boundingBox())!, b = (await bee.boundingBox())!;
    expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true);
    const copyright = (await page.locator("footer p").filter({ hasText: "Developed by" }).boundingBox())!;
    expect(copyright.y + copyright.height).toBeLessThan(Math.min(a.y, b.y));
    const email = page.getByRole("textbox", { name: "Email for a demo" });
    expect(await email.evaluate(el => {
      const input = el as HTMLInputElement, s = getComputedStyle(input);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!; ctx.font = s.font;
      return ctx.measureText(input.placeholder).width <= input.clientWidth;
    })).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("footer.png") });
    await top.click();
    await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(10);
  });
}

test("architecture is readable before scrolling to its section", async ({ page }) => {
  await loadLanding(page);
  await expect(page.locator("#architecture").getByRole("heading", { name: "Containerized Multi-Tenancy" })).toBeVisible();
  expect(await page.locator("#architecture > div > div > div").evaluateAll(elements => elements.every(el => getComputedStyle(el).opacity === "1"))).toBe(true);
});

test("quote-mode catalogue orders core ERP modules before media tools", async ({ page }) => {
  await loadLanding(page);
  await page.route("**/api/v1/public/subscriptions/catalog", async route => {
    await route.fulfill({
      json: {
        data: {
          catalog: modules.map(([slug, name]) => ({ slug, name, category: "Suite", description })),
          plan_pricing: {},
          plan_defaults: {},
          billing_policy: { public_catalog_mode: "self_service", public_show_subscription_types: false },
        },
      },
    });
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  const catalogue = page.locator("#pricing section[aria-labelledby='all-modules-heading']");
  await expect(catalogue).toBeVisible();
  const names = await catalogue.locator("li > p:first-child").allInnerTexts();
  expect(names.slice(0, 5)).toEqual([
    "Financial Management",
    "Invoice & Billing",
    "Human Resources",
    "Payroll Management",
    "Inventory Control",
  ]);
  expect(names.indexOf("Financial Management")).toBeLessThan(names.indexOf("Image Editor"));
  await expect(page.getByText("No credit card required for Larva & Startup plans")).toHaveCount(0);
});

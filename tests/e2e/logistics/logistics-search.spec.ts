import { expect, test } from "./fixtures";

test.use({
  launchOptions: {
    args: [],
  },
});

test("tenant global search returns the indexed Logistics booking", async ({
  page,
  logisticsFixture,
}) => {
  const frontendUrl = logisticsFixture.frontend_url.replace(/\/$/, "");
  test.setTimeout(180_000);
  await page.goto(frontendUrl + "/sign-in");
  await page.locator("#email").fill(logisticsFixture.user.email);
  await page.locator("#password").fill(logisticsFixture.user.password);
  await page.getByRole("button", { name: /initiate handshake/i }).click();
  await expect(page).toHaveURL(/\/dashboard(?:$|\?)/, { timeout: 90_000 });

  const result = await page.evaluate(async () => {
    const token = window.localStorage.getItem("hive_token");
    const context = window.localStorage.getItem("hive_context");
    const signature = window.localStorage.getItem("hive_context_signature");
    const headers = {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(context && context !== "central" ? { "X-Tenant": context } : {}),
      ...(context && context !== "central" && signature
        ? { "X-Tenant-Signature": signature }
        : {}),
    };
    const bookingsResponse = await fetch(
      "/api/v1/logistics/bookings?per_page=1",
      { headers },
    );
    const bookings = await bookingsResponse.json();
    const bookingNumber = bookings.data?.[0]?.booking_number as string;
    const searchResponse = await fetch(
      "/api/v1/search?q=" + encodeURIComponent(bookingNumber),
      { headers },
    );

    return {
      bookingNumber,
      bookingsStatus: bookingsResponse.status,
      searchStatus: searchResponse.status,
      search: await searchResponse.json(),
    };
  });

  expect(result.bookingsStatus).toBe(200);
  expect(result.bookingNumber).toMatch(/^LBK-/);
  expect(result.searchStatus).toBe(200);
  expect(result.search.meta.context).toBe(
    `Tenant (${logisticsFixture.tenant_id})`,
  );
  const bookingsGroup = result.search.data.find(
    (group: { category: string }) => group.category === "logistics_bookings",
  );
  expect(bookingsGroup?.items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ title: result.bookingNumber }),
    ]),
  );
});

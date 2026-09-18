import { test, expect } from "@playwright/test";

/**
 * Auth-gate regression net for the realtime message routes.
 *
 * Both `/orders/[orderId]/messages` and `/seller/orders/[orderId]/messages`
 * are protected: anon visitors must be redirected to `/` by the middleware.
 * We use a syntactically valid-looking UUID — the middleware fires before
 * the page tries to look up the row, so the actual ID doesn't matter.
 *
 * The realtime feature itself (cross-tab chat round-trip) is verified
 * manually because it requires two authenticated users + a seeded order,
 * which is outside the scope of CI.
 */
const FAKE_ORDER_ID = "00000000-0000-0000-0000-000000000000";

test.describe("Messages auth gate (anon)", () => {
  test("GET /orders/{id}/messages redirects to /", async ({ page }) => {
    await page.goto(`/orders/${FAKE_ORDER_ID}/messages`);
    await expect(page).toHaveURL(/\/$/);
  });

  test("GET /seller/orders/{id}/messages redirects to /", async ({ page }) => {
    await page.goto(`/seller/orders/${FAKE_ORDER_ID}/messages`);
    await expect(page).toHaveURL(/\/$/);
  });
});

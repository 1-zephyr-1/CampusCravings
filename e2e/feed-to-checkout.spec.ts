import { test, expect } from "@playwright/test";

/**
 * Auth gate regression net.
 *
 * Protected paths must redirect anon visitors to the marketing landing.
 * We assert the redirect rather than the post-login UI (which needs a
 * Supabase seed for any real assertions).
 */
test.describe("Auth gate (anon)", () => {
  for (const path of ["/feed", "/orders", "/profile", "/cart"]) {
    test(`GET ${path} redirects to / for anonymous visitors`, async ({
      page,
    }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/$/);
    });
  }
});

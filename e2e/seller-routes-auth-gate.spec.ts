import { test, expect } from "@playwright/test";

/**
 * Seller area auth gate (anon).
 *
 * The middleware's `protectedPaths` includes `/seller`, so any path
 * starting with `/seller/...` is bounced to `/` when the visitor has no
 * Supabase session.
 */
const SELLER_PATHS = [
  "/seller/dashboard",
  "/seller/items",
  "/seller/orders",
  "/seller/analytics",
] as const;

test.describe("Seller routes auth gate (anon)", () => {
  for (const path of SELLER_PATHS) {
    test(`GET ${path} redirects to /`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/$/);
    });
  }
});

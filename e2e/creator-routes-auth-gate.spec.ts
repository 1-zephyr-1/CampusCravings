import { test, expect } from "@playwright/test";

/**
 * Creator area auth gate (anon).
 *
 * The middleware's `protectedPaths` includes `/creator`, so any path
 * starting with `/creator/...` is bounced to `/` when the visitor has no
 * Supabase session.
 */
const CREATOR_PATHS = [
  "/creator",
  "/creator/users",
  "/creator/listings",
  "/creator/activity",
] as const;

test.describe("Creator routes auth gate (anon)", () => {
  for (const path of CREATOR_PATHS) {
    test(`GET ${path} redirects to /`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/$/);
    });
  }
});

import { test, expect } from "@playwright/test";

/**
 * Public-feed-adjacent page behaviour.
 *
 * `/feed` is gated by middleware for anon users — they get bounced to `/`.
 * `/search`, `/categories`, and `/forgot-password` are anonymous-readable.
 */
test.describe("Feed & adjacent pages (anon)", () => {
  test("GET /feed redirects to /", async ({ page }) => {
    await page.goto("/feed");
    await expect(page).toHaveURL(/\/$/);
  });

  test("GET /search?q=biryani renders an empty state or results", async ({
    page,
  }) => {
    await page.goto("/search?q=biryani");
    // The page renders even with no rows (EmptyState) or with cards.
    // Verify by checking that the body has rendered text and we did not 5xx.
    await expect(page.locator("body")).not.toBeEmpty();
    // Should not have navigated away to login — search is anon-readable.
    expect(page.url()).toContain("/search");
  });

  test("/categories renders the category grid", async ({ page }) => {
    await page.goto("/categories");
    // The grid is identified by aria-label="Food categories"
    const grid = page.locator('[aria-label="Food categories"]');
    await expect(grid).toBeVisible();
    // There should be at least one category card (a link inside the grid)
    const cards = grid.locator("li");
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test("/forgot-password renders the password reset form", async ({ page }) => {
    await page.goto("/forgot-password");
    // An email input is required for a password reset form
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible();
    // And there should be a submit button
    const submitButton = page.locator('button[type="submit"]').first();
    await expect(submitButton).toBeVisible();
  });
});

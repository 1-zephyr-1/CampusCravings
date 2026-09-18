import { test, expect } from "@playwright/test";

/**
 * Public legal/info content checks.
 *
 * Verifies the structural integrity of the legal/help pages: sections
 * the user is promised in the marketing copy actually exist, and the
 * help center has real collapsible FAQ items.
 */
test.describe("Legal & help content", () => {
  test("/privacy contains the 'What we collect' section", async ({ page }) => {
    await page.goto("/privacy");
    const section = page.locator("#what-we-collect");
    await expect(section).toBeVisible();
    const heading = section.locator("h2, h3").first();
    const headingText = (await heading.textContent()) ?? "";
    expect(headingText).toMatch(/what we collect/i);
  });

  test("/terms contains the 'Eligibility' section", async ({ page }) => {
    await page.goto("/terms");
    // The "Who can use CampusCravings" section is the eligibility gate
    const section = page.locator("#who-can-use");
    await expect(section).toBeVisible();
    const heading = section.locator("h2, h3").first();
    const headingText = (await heading.textContent()) ?? "";
    expect(headingText).toMatch(/who can use/i);
  });

  test("/help has at least 3 collapsible FAQ items", async ({ page }) => {
    await page.goto("/help");
    const details = page.locator("details");
    const count = await details.count();
    expect(count).toBeGreaterThanOrEqual(3);
    // Spot-check that each has a question inside its summary
    const firstSummary = details.first().locator("summary");
    await expect(firstSummary).toBeVisible();
  });

  test("/contact renders the contact form with email + message fields", async ({
    page,
  }) => {
    await page.goto("/contact");
    const emailField = page.locator(
      'input[type="email"], input[name="email"]'
    ).first();
    await expect(emailField).toBeVisible();

    const messageField = page.locator(
      'textarea, input[name="message"]'
    ).first();
    await expect(messageField).toBeVisible();
  });
});

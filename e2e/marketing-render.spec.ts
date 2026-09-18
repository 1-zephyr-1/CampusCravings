import { test, expect } from "@playwright/test";

/**
 * Marketing landing + public info page render checks.
 *
 * Covers:
 *  - Title, hero, OG tag, canonical, and Organization JSON-LD on `/`
 *  - Help, about, privacy, terms h1s render
 *
 * All routes are anonymous-readable, so no auth setup is required.
 */
test.describe("Marketing landing page render", () => {
  test("/ returns 200 with CampusCravings title", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/CampusCravings/);
  });

  test("/ renders the hero <h1>", async ({ page }) => {
    await page.goto("/");
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible();
    const text = (await h1.textContent()) ?? "";
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test("/ has the og:title meta tag", async ({ page }) => {
    await page.goto("/");
    const ogTitle = page.locator('meta[property="og:title"]').first();
    await expect(ogTitle).toHaveAttribute("content", /CampusCravings/i);
  });

  test("/ has the canonical link", async ({ page }) => {
    await page.goto("/");
    const canonical = page.locator('link[rel="canonical"]').first();
    await expect(canonical).toHaveAttribute("href", /\//);
  });

  test("/ has JSON-LD Organization script", async ({ page }) => {
    await page.goto("/");
    const jsonLd = page.locator('script[type="application/ld+json"]').first();
    await expect(jsonLd).toHaveCount(1);
    const content = await jsonLd.textContent();
    expect(content).toBeTruthy();
    const parsed = JSON.parse(content ?? "{}");
    expect(parsed["@type"]).toBe("Organization");
  });
});

test.describe("Public info pages render", () => {
  test("/help renders the FAQ page", async ({ page }) => {
    await page.goto("/help");
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible();
    const text = (await h1.textContent()) ?? "";
    expect(text).toMatch(/help|faq/i);
  });

  test("/about renders the story", async ({ page }) => {
    await page.goto("/about");
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible();
    const text = (await h1.textContent()) ?? "";
    expect(text.length).toBeGreaterThan(0);
  });

  test("/privacy and /terms both render their respective <h1>s", async ({
    page,
  }) => {
    const privacyRes = await page.goto("/privacy");
    expect(privacyRes?.status()).toBe(200);
    const privacyH1 = page.locator("h1").first();
    await expect(privacyH1).toBeVisible();
    const privacyText = (await privacyH1.textContent()) ?? "";
    expect(privacyText).toMatch(/privacy/i);

    const termsRes = await page.goto("/terms");
    expect(termsRes?.status()).toBe(200);
    const termsH1 = page.locator("h1").first();
    await expect(termsH1).toBeVisible();
    const termsText = (await termsH1.textContent()) ?? "";
    expect(termsText).toMatch(/terms/i);
  });
});

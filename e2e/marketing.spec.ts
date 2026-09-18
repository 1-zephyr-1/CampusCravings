import { test, expect } from "@playwright/test";

/**
 * Marketing landing page renders the always-present sections and the auth CTA.
 *
 * The "popular sellers" / "fresh today" sections only render when there are
 * rows in the DB. Those are guarded by `if (stores.length > 0)` in the
 * SamplePreview component and are skipped from the assertions to keep CI
 * deterministic without a DB seed.
 */
test.describe("Marketing landing page", () => {
  test("renders hero, how-it-works, testimonials, and auth CTA", async ({
    page,
  }) => {
    await page.goto("/");

    // 1. Hero — primary heading
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /skip the canteen queue/i,
      })
    ).toBeVisible();

    // 2. How it works
    await expect(
      page.getByRole("heading", { name: /how campuscravings works/i })
    ).toBeVisible();

    // 3. Testimonials
    await expect(
      page.getByRole("heading", { name: /what students say/i })
    ).toBeVisible();

    // 4. Auth CTA section (anchored at #auth)
    const authSection = page.locator("#auth");
    await expect(authSection).toBeVisible();
    await expect(
      authSection.getByRole("heading", { name: /sign in to your account/i })
    ).toBeVisible();

    // Auth card email field is interactive
    await expect(
      page.getByRole("textbox", { name: /email/i }).first()
    ).toBeVisible();
  });

  test("hero CTA scrolls to the auth section", async ({ page }) => {
    await page.goto("/");
    const heroCta = page.getByRole("link", { name: /get started/i }).first();
    await heroCta.click();
    await expect(page).toHaveURL(/#auth$/);
  });

  test("footer Product nav links to /feed and hero Sign in links to #auth", async ({
    page,
  }) => {
    await page.goto("/");
    // The footer exposes two <nav> regions: "Product" and "Company". The
    // Product nav carries the primary "Browse feed" entry into the app.
    const productNav = page.getByRole("navigation", { name: /product/i });
    await expect(productNav).toBeVisible();
    await expect(
      productNav.getByRole("link", { name: /browse feed/i })
    ).toHaveAttribute("href", "/feed");

    // The "Sign in to your account" anchor lives in the hero (not the
    // footer) and points at the same #auth section as the hero CTA. Assert
    // it lands users on the auth section whether they came from the CTA or
    // the inline sign-in link.
    await expect(
      page.getByRole("link", { name: /sign in to your account/i })
    ).toHaveAttribute("href", "#auth");
  });
});

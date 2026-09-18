import { test, expect } from "@playwright/test";

/**
 * Profile routes auth-gate + nav-link coverage.
 *
 * The full authenticated /profile UI depends on a real Supabase session
 * (the page renders nothing for anon — `useAuth()` resolves to `null` and
 * the component early-returns). It also makes heavy DB calls (orders,
 * favorites, reviews, notifications, messages, stores), all of which
 * require a seeded user, so we can't exercise the linked destinations
 * like "Edit profile" or "Settings" end-to-end in CI.
 *
 * What we *can* assert deterministically without a seed DB:
 *
 *   1. The middleware gates every /profile/* sub-route the same way it
 *      gates /profile itself. We don't want a forgotten matcher to leak
 *      a protected page through to anon visitors.
 *   2. The public marketing footer offers a clear entry into the auth
 *      flow that *would* lead to the profile page once signed in — i.e.
 *      the path exists for a user to discover it.
 *
 * The realtime messages feature has a similar gate already covered in
 * `messages-auth-gate.spec.ts`; we deliberately don't duplicate those.
 */
const PROFILE_SUB_ROUTES = [
  "/profile",
  "/profile/edit",
  "/profile/settings",
  "/profile/favorites",
];

test.describe("Profile routes auth-gate (anon)", () => {
  for (const path of PROFILE_SUB_ROUTES) {
    test(`GET ${path} redirects to /`, async ({ page }) => {
      const response = await page.goto(path);
      // The redirect is a 307 from the middleware; page.goto follows it.
      expect(response).not.toBeNull();
      await expect(page).toHaveURL(/\/$/);
    });
  }
});

test.describe("Profile discovery from public surface", () => {
  test("marketing footer Product nav exposes the browse entry point", async ({
    page,
  }) => {
    await page.goto("/");

    // The footer exposes two <nav> regions: "Product" and "Company". The
    // Product nav carries the "Browse feed" link — the path a user takes
    // into the app that eventually leads to /profile once signed in.
    const productNav = page.getByRole("navigation", { name: /product/i });
    await expect(productNav).toBeVisible();
    await expect(
      productNav.getByRole("link", { name: /browse feed/i })
    ).toHaveAttribute("href", "/feed");

    // The sign-in anchor lives in the hero (not the footer) and points at
    // the #auth section. Asserting it keeps the marketing nav honest even
    // if the anchor or copy shifts.
    await expect(
      page.getByRole("link", { name: /sign in to your account/i })
    ).toHaveAttribute("href", "#auth");
  });

  test("hero CTA scrolls to the auth entry point", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /get started/i }).first().click();
    await expect(page).toHaveURL(/#auth$/);
  });
});

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Additional accessibility regression scans beyond the buyer feed.
 *
 * Each route below is reachable anonymously (the middleware bounces
 * authenticated users away from `/` and `/onboarding`, and the middleware
 * also bounces unauthenticated visitors away from `/orders/{id}` — the
 * test UUID below is intentionally bogus so the redirect lands on `/`,
 * which is what we actually want to scan in CI).
 *
 * Mirrors the assertion pattern in `a11y-feed.spec.ts`: WCAG 2.1 AA tags,
 * color-contrast disabled (handled at the design-token layer), and any
 * critical/serious violation fails the test.
 */

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function assertNoCriticalA11y(
  page: import("@playwright/test").Page,
  label: string
) {
  const results = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .disableRules(["color-contrast"])
    .analyze();

  const critical = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious"
  );

  if (critical.length > 0) {
    console.error(
      `[${label}] axe violations:`,
      critical.map((v) => `${v.id} (${v.impact})`).join(", ")
    );
  }

  expect(critical, `critical/serious axe violations on ${label}`).toEqual([]);
}

test.describe("Marketing landing a11y", () => {
  test("marketing landing has no critical/serious WCAG AA violations", async ({
    page,
  }) => {
    await page.goto("/");
    await assertNoCriticalA11y(page, "/");
  });
});

test.describe("Onboarding a11y", () => {
  test("onboarding page has no critical/serious WCAG AA violations", async ({
    page,
  }) => {
    // /onboarding redirects authed users to /feed. Visit anonymously and
    // ensure the form itself passes a11y regardless of who lands on it.
    await page.goto("/onboarding");
    await assertNoCriticalA11y(page, "/onboarding");
  });
});

test.describe("Order detail a11y", () => {
  test("protected order detail redirect target has no critical/serious WCAG AA violations", async ({
    page,
  }) => {
    // Anon visit to /orders/{id} gets redirected by middleware to `/`.
    // We assert the redirect target itself is a11y-clean, which is the
    // realistic landing experience for unauthenticated visitors.
    const response = await page.goto(
      "/orders/00000000-0000-0000-0000-000000000000"
    );
    // Either we end up on / (redirect) or, if the redirect is briefly
    // visible, on a 404 — either way, scan the final DOM.
    await page.waitForLoadState("networkidle");
    expect(response, "navigation should produce a response").not.toBeNull();
    await assertNoCriticalA11y(
      page,
      `/orders/{id} (final URL: ${page.url()})`
    );
  });
});

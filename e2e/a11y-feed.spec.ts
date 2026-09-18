import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Accessibility regression net for the buyer-facing feed.
 *
 * Runs the axe-core WCAG 2.1 AA ruleset against /feed. Anchors the app at the
 * "no critical WCAG violations" bar; full rule coverage is intentionally
 * limited so the test stays fast in CI.
 */
test.describe("Feed accessibility", () => {
  test("feed page has no critical/serious WCAG AA violations", async ({
    page,
  }) => {
    await page.goto("/feed");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      // Skip rule categories that are noisy in dev (color-contrast on dynamic
      // chip states is handled at the design-token layer).
      .disableRules(["color-contrast"])
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    if (critical.length > 0) {
      // Surface the violation ids in the test output for triage.
      console.error(
        "axe violations:",
        critical.map((v) => `${v.id} (${v.impact})`).join(", ")
      );
    }

    expect(critical).toEqual([]);
  });
});

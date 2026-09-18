import { test, expect } from "@playwright/test";
import type { APIResponse } from "@playwright/test";

/**
 * Public SEO surface — sitemap, robots, manifest, and PWA icons.
 *
 * These resources are consumed by crawlers and by add-to-home-screen
 * flows, so a broken sitemap.xml or missing icon would silently tank
 * discoverability and install behaviour.
 */

const EXPECTED_SITEMAP_URLS = [
  "/",
  "/feed",
  "/about",
  "/help",
  "/privacy",
  "/terms",
];

test.describe("SEO surface", () => {
  test("/sitemap.xml returns 200 and lists core URLs", async ({ request }) => {
    // The sitemap handler makes Supabase calls for stores and food items,
    // which can be slow when the database is unreachable. Give it room.
    test.setTimeout(60_000);
    const res = await request.get("/sitemap.xml", { timeout: 45_000 });
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("<urlset");

    // Pull out every <loc>...</loc> so we don't have to wrangle XML.
    const locs = Array.from(body.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]);
    expect(locs.length).toBeGreaterThan(0);

    for (const expectedPath of EXPECTED_SITEMAP_URLS) {
      // Each expected path should appear somewhere in a <loc>. The root path
      // "/" shows up as the bare host URL; everything else shows up as the
      // host followed by the path.
      const matches = locs.some((loc) => {
        try {
          const url = new URL(loc);
          if (expectedPath === "/") return url.pathname === "/" || url.pathname === "";
          return url.pathname === expectedPath;
        } catch {
          return false;
        }
      });
      expect(
        matches,
        `Expected a <loc> with pathname "${expectedPath}" in sitemap, got: ${JSON.stringify(locs)}`
      ).toBe(true);
    }
  });

  test("/robots.txt returns 200 with Sitemap: and Disallow: directives", async ({
    request,
  }) => {
    const res: APIResponse = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/Sitemap:\s*\S+/i);
    expect(body).toMatch(/Disallow:\s*\S+/i);
  });

  test("/manifest.json returns 200, is valid JSON, has name, short_name, icons", async ({
    request,
  }) => {
    const res = await request.get("/manifest.json");
    expect(res.status()).toBe(200);
    const ct = res.headers()["content-type"] ?? "";
    expect(ct).toMatch(/json/i);
    const body = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      throw new Error(`/manifest.json was not valid JSON. Body: ${body}`);
    }
    const manifest = parsed as Record<string, unknown>;
    expect(typeof manifest.name).toBe("string");
    expect((manifest.name as string).length).toBeGreaterThan(0);
    expect(typeof manifest.short_name).toBe("string");
    expect((manifest.short_name as string).length).toBeGreaterThan(0);
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect((manifest.icons as unknown[]).length).toBeGreaterThan(0);
  });

  test("/icon-192.png and /icon-512.png return 200 with image content-type", async ({
    request,
  }) => {
    for (const path of ["/icon-192.png", "/icon-512.png"]) {
      const res = await request.get(path);
      expect(res.status(), `${path} status`).toBe(200);
      const ct = res.headers()["content-type"] ?? "";
      expect(ct, `${path} content-type`).toMatch(/image\//i);
    }
  });
});

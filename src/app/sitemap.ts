import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  const { data: stores } = await supabase
    .from("stores")
    .select("id, updated_at")
    .eq("is_approved", true)
    .limit(5000);

  const { data: items } = await supabase
    .from("food_items")
    .select("id, store_id, updated_at")
    .eq("is_sold_out", false)
    .limit(5000);

  // Static pages — public marketing/legal pages that should always be
  // discoverable. Authenticated-only flows (cart, orders, profile, seller/*,
  // creator/*) intentionally stay out of the sitemap.
  const staticPages: MetadataRoute.Sitemap = [
    // Home
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    // Primary surface
    { url: `${BASE_URL}/feed`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    // Onboarding (visible to anon for signup)
    { url: `${BASE_URL}/onboarding`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    // Marketing pages
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE_URL}/help`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    // Legal pages — important for both SEO and trust signals
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  const storePages: MetadataRoute.Sitemap = (stores || []).map((store) => ({
    url: `${BASE_URL}/feed/${store.id}`,
    lastModified: new Date(store.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const itemPages: MetadataRoute.Sitemap = (items || []).map((item) => ({
    url: `${BASE_URL}/feed/${item.store_id}/${item.id}`,
    lastModified: new Date(item.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...storePages, ...itemPages];
}

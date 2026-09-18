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

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/feed`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/onboarding`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
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

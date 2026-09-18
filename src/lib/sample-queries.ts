import { createClient } from "@/lib/supabase/server";

/**
 * Public, anonymous-readable queries used by the marketing landing page.
 * These queries read approved + open stores/items, which the Supabase RLS
 * policies allow for unauthenticated visitors.
 */

export interface SampleStore {
  id: string;
  name: string;
  pickup_area: string;
  photo_url: string | null;
  rating: number;
  total_ratings: number;
}

export interface SampleItem {
  id: string;
  name: string;
  description: string;
  price: number;
  photo_urls: string[];
  dietary_tags: string[];
  store_id: string;
  store_name: string;
  pickup_area: string;
}

/** Top 3 stores by rating — for the "popular this week" preview. */
export async function getPopularStores(): Promise<SampleStore[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("stores")
    .select("id, name, pickup_area, photo_url, rating, total_ratings")
    .eq("is_approved", true)
    .eq("is_open", true)
    .order("rating", { ascending: false })
    .order("total_ratings", { ascending: false })
    .limit(3);
  return (data as SampleStore[] | null) || [];
}

/** Top 6 items (newest) — for the "fresh today" preview. */
export async function getFeaturedItems(): Promise<SampleItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("food_items")
    .select(
      "id, name, description, price, photo_urls, dietary_tags, store_id, store:stores!food_items_store_id_fkey(name, pickup_area, is_approved, is_open)"
    )
    .eq("is_sold_out", false)
    .order("created_at", { ascending: false })
    .limit(6);
  if (!data) return [];
  return (data as unknown as (SampleItem & {
    store: { name: string; pickup_area: string; is_approved: boolean; is_open: boolean } | null;
  })[])
    .filter((it) => it.store?.is_approved && it.store?.is_open)
    .map((it) => ({
      id: it.id,
      name: it.name,
      description: it.description,
      price: Number(it.price),
      photo_urls: it.photo_urls || [],
      dietary_tags: it.dietary_tags || [],
      store_id: it.store_id,
      store_name: it.store!.name,
      pickup_area: it.store!.pickup_area,
    }));
}

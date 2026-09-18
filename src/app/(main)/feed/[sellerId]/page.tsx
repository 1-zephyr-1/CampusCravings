import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { storeJsonLd, jsonLdScript } from "@/lib/seo";
import type { Store, FoodItem } from "@/types";
import SellerStoreClient from "./store-page-client";

/**
 * Seller-store page (server component).
 * Fetches store + items in parallel so we can emit per-page metadata
 * and JSON-LD FoodEstablishment structured data for SEO.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ sellerId: string }>;
}): Promise<Metadata> {
  const { sellerId } = await params;
  const supabase = await createClient();
  const { data: store } = await supabase
    .from("stores")
    .select("name, description, pickup_area")
    .eq("id", sellerId)
    .maybeSingle();

  if (!store) {
    return { title: "Store not found · CampusCravings" };
  }

  const title = `${store.name} · CampusCravings`;
  const description =
    store.description?.slice(0, 160) ||
    `Browse and pre-order homemade food from ${store.name} on CampusCravings. Pickup at ${store.pickup_area}.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "profile" },
    twitter: { card: "summary", title, description },
  };
}

export default async function SellerStorePage({
  params,
}: {
  params: Promise<{ sellerId: string }>;
}) {
  const { sellerId } = await params;
  const supabase = await createClient();

  const [storeRes, itemsRes] = await Promise.all([
    supabase
      .from("stores")
      .select(
        "id, user_id, name, description, photo_url, pickup_area, food_type, is_open, is_approved, rating, total_ratings, profile:profiles!stores_user_id_fkey(full_name, avatar_url)"
      )
      .eq("id", sellerId)
      .maybeSingle(),
    supabase
      .from("food_items")
      .select("*, store:stores!food_items_store_id_fkey(id, name, is_open, is_approved)")
      .eq("store_id", sellerId)
      .order("created_at", { ascending: false }),
  ]);

  const store = storeRes.data as Store | null;
  const items = ((itemsRes.data as FoodItem[] | null) || []).filter(
    (it) => it.store?.is_approved && it.store?.is_open
  );

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const jsonLd = store
    ? storeJsonLd({
        name: store.name,
        description:
          store.description ||
          `Homemade food by a BRAC University student. Pickup near ${store.pickup_area}.`,
        image: store.photo_url,
        url: `${baseUrl}/feed/${store.id}`,
        ratingValue:
          store.rating && store.rating > 0 ? store.rating : undefined,
        reviewCount:
          store.total_ratings && store.total_ratings > 0
            ? store.total_ratings
            : undefined,
        pickupArea: store.pickup_area,
        priceRange: "৳",
      })
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLdScript(jsonLd)}
        />
      )}
      <SellerStoreClient initialStore={store} initialItems={items} />
    </>
  );
}
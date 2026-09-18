import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { productJsonLd, jsonLdScript } from "@/lib/seo";
import { itemJsonLd } from "@/lib/seo/structured-data";
import type { FoodItem, Store } from "@/types";
import ItemDetailClient from "./item-detail-client";

/**
 * Item-detail page (server component).
 *
 * Fetches the item + store once on the server so we can:
 *   - emit per-page <title> + description metadata,
 *   - emit JSON-LD Product + FoodEstablishment structured data,
 * without making the interactive page a client component.
 *
 * The fetched data is passed to <ItemDetailClient> as initial props.
 * Auth-gated data (favorites) is re-fetched on the client.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ sellerId: string; itemId: string }>;
}): Promise<Metadata> {
  const { sellerId, itemId } = await params;
  const supabase = await createClient();
  const [{ data: item }, { data: store }] = await Promise.all([
    supabase
      .from("food_items")
      .select("name, description, photo_urls")
      .eq("id", itemId)
      .maybeSingle(),
    supabase.from("stores").select("name").eq("id", sellerId).maybeSingle(),
  ]);

  if (!item) {
    return { title: "Item not found · CampusCravings" };
  }

  const title = `${item.name}${store ? ` · ${store.name}` : ""} · CampusCravings`;
  const description =
    item.description?.slice(0, 160) ||
    `Pre-order ${item.name} on CampusCravings.`;
  const url = `/feed/${sellerId}/${itemId}`;
  const ogImages = item.photo_urls?.length
    ? [
        {
          url: item.photo_urls[0],
          width: 800,
          height: 320,
          alt: item.name,
        },
      ]
    : [
        {
          url: "/og-default.png",
          width: 1200,
          height: 630,
          alt: `${item.name} on CampusCravings`,
        },
      ];
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      images: ogImages,
      type: "article",
      url,
      siteName: "CampusCravings",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImages.map((i) => i.url),
    },
  };
}

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ sellerId: string; itemId: string }>;
}) {
  const { sellerId, itemId } = await params;
  const supabase = await createClient();

  const [{ data: item }, { data: store }] = await Promise.all([
    supabase
      .from("food_items")
      .select(
        "id, store_id, name, description, price, quantity, photo_urls, dietary_tags, spice_level, is_sold_out, average_rating, total_ratings"
      )
      .eq("id", itemId)
      .maybeSingle(),
    supabase
      .from("stores")
      .select(
        "id, user_id, name, pickup_area, photo_url, is_open, rating, total_ratings"
      )
      .eq("id", sellerId)
      .maybeSingle(),
  ]);

  // Related items: other food items from the same store.
  // Excludes the current item and sold-out ones. Limited to 6 for the
  // "More from this store" rail.
  const relatedItemsPromise = item
    ? supabase
        .from("food_items")
        .select(
          "id, store_id, name, description, price, quantity, is_sold_out, photo_urls, dietary_tags, spice_level, average_rating, total_ratings"
        )
        .eq("store_id", item.store_id)
        .neq("id", item.id)
        .eq("is_sold_out", false)
        .order("created_at", { ascending: false })
        .limit(6)
    : Promise.resolve({ data: [] as FoodItem[] });

  // Item-level reviews: reviews are store-scoped today, so we walk through
  // order_items for this item and look up the reviews on those orders.
  let reviewsData: unknown[] = [];
  if (item) {
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("order_id")
      .eq("item_id", item.id)
      .limit(50);
    const orderIds = Array.from(
      new Set((orderItems ?? []).map((r) => (r as { order_id: string }).order_id))
    );
    if (orderIds.length > 0) {
      const { data: reviews } = await supabase
        .from("reviews")
        .select(
          "id, order_id, user_id, store_id, rating, comment, created_at, user:profiles!reviews_user_id_fkey(full_name, avatar_url)"
        )
        .in("order_id", orderIds)
        .order("created_at", { ascending: false })
        .limit(3);
      reviewsData = reviews ?? [];
    }
  }

  const { data: relatedItems } = await relatedItemsPromise;

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const jsonLd = item && store
    ? productJsonLd({
        name: item.name,
        description: item.description || item.name,
        image: item.photo_urls || [],
        price: Number(item.price) || 0,
        sku: item.id,
        ratingValue:
          item.average_rating && Number(item.average_rating) > 0
            ? Number(item.average_rating)
            : undefined,
        reviewCount:
          item.total_ratings && Number(item.total_ratings) > 0
            ? Number(item.total_ratings)
            : undefined,
        availability: item.is_sold_out ? "SoldOut" : "InStock",
        sellerName: store.name,
        sellerUrl: `${baseUrl}/feed/${store.id}`,
        url: `${baseUrl}/feed/${store.id}/${item.id}`,
      })
    : null;

  const menuItemJsonLd = item && store
    ? itemJsonLd({
        id: item.id,
        name: item.name,
        description: item.description || item.name,
        price: Number(item.price) || 0,
        photo_urls: item.photo_urls || [],
        store: { name: store.name },
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
      {menuItemJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: menuItemJsonLd }}
        />
      )}
      <ItemDetailClient
        initialItem={item as FoodItem | null}
        initialStore={store as Store | null}
        initialRelatedItems={(relatedItems as FoodItem[] | null) ?? []}
        initialReviews={(reviewsData as unknown[]) ?? []}
      />
    </>
  );
}
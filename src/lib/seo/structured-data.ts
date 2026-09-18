/**
 * Schema.org structured-data helpers for CampusCravings.
 *
 * Each function returns a *string* of JSON suitable for inlining into a
 * server-rendered <script type="application/ld+json"> tag via
 * `dangerouslySetInnerHTML`.  Returning strings (rather than objects) keeps the
 * caller from having to JSON.stringify manually and matches the contract in
 * the SEO task spec.
 *
 * Schema reference:
 *   - Organization  → https://schema.org/Organization
 *   - WebSite       → https://schema.org/WebSite  (with SearchAction for Sitelinks Searchbox)
 *   - MenuItem      → https://schema.org/MenuItem  (subtype of FoodEntity)
 *   - FoodEstablishment → https://schema.org/FoodEstablishment
 */

const SITE_NAME = "CampusCravings";
const SITE_DESCRIPTION =
  "BRAC University peer-to-peer food marketplace. Pre-order homemade meals from fellow students and pick up on campus.";

function siteBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

/** Serialize a schema.org node into a JSON-LD script payload string. */
function toJsonLd(node: Record<string, unknown>): string {
  return JSON.stringify(node);
}

/**
 * Organization JSON-LD describing CampusCravings as a publisher.
 * Used on the marketing landing page alongside the WebSite node.
 */
export function organizationJsonLd(): string {
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: siteBaseUrl(),
    logo: `${siteBaseUrl()}/icon`,
    description: SITE_DESCRIPTION,
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      areaServed: "BD",
      availableLanguage: ["en", "bn"],
    },
  };
  return toJsonLd(node);
}

/**
 * WebSite JSON-LD with a SearchAction so Google can render a sitelinks
 * searchbox for the site.
 */
export function websiteJsonLd(): string {
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: siteBaseUrl(),
    description: SITE_DESCRIPTION,
    inLanguage: "en",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteBaseUrl()}/feed?q={search_term_string}`,
      },
      // schema.org: "query-input" — Google's required format
      "query-input": "required name=search_term_string",
    },
  };
  return toJsonLd(node);
}

export interface ItemJsonLdInput {
  id: string;
  name: string;
  description: string;
  price: number;
  photo_urls: string[];
  store: { name: string };
}

/**
 * MenuItem JSON-LD for a single food listing.
 * Maps CampusCravings rows → schema.org/MenuItem (a FoodEntity).
 */
export function itemJsonLd(item: ItemJsonLdInput): string {
  const baseUrl = siteBaseUrl();
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "MenuItem",
    name: item.name,
    description: item.description || item.name,
    image: item.photo_urls,
    sku: item.id,
    offers: {
      "@type": "Offer",
      price: item.price,
      priceCurrency: "BDT",
      availability: "https://schema.org/InStock",
      url: `${baseUrl}/feed/${item.store.name}`,
    },
  };
  return toJsonLd(node);
}

export interface StoreJsonLdInput {
  id: string;
  name: string;
  description: string;
  photo_url: string | null;
  rating: number;
  total_ratings: number;
  pickup_area: string;
}

/**
 * FoodEstablishment JSON-LD for a BRACU student-run store.
 * Pickup area is expressed as a PostalAddress streetAddress.
 */
export function storeJsonLd(store: StoreJsonLdInput): string {
  const baseUrl = siteBaseUrl();
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "FoodEstablishment",
    name: store.name,
    description: store.description || `Homemade food by a BRAC University student.`,
    url: `${baseUrl}/feed/${store.id}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: store.pickup_area,
      addressLocality: "Dhaka",
      addressCountry: "BD",
    },
    servesCuisine: ["Homemade", "Student-cooked"],
    priceRange: "৳",
  };
  if (store.photo_url) {
    node.image = store.photo_url;
  }
  if (store.rating > 0 && store.total_ratings > 0) {
    node.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: store.rating,
      reviewCount: store.total_ratings,
    };
  }
  return toJsonLd(node);
}

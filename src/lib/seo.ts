/**
 * Helpers for emitting JSON-LD structured data.
 * Each function returns a complete <script type="application/ld+json"> payload
 * for the relevant schema.org type.
 */

export interface JsonLdProduct {
  name: string;
  description: string;
  image: string[];
  price: number;
  priceCurrency?: string;
  availability?: "InStock" | "SoldOut" | "PreOrder";
  sku: string;
  ratingValue?: number;
  reviewCount?: number;
  sellerName: string;
  sellerUrl: string;
  url: string;
}

export function productJsonLd(p: JsonLdProduct) {
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    image: p.image,
    sku: p.sku,
    brand: { "@type": "Brand", name: p.sellerName },
    offers: {
      "@type": "Offer",
      price: p.price,
      priceCurrency: p.priceCurrency || "BDT",
      availability:
        p.availability === "SoldOut"
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
      url: p.url,
      seller: { "@type": "Organization", name: p.sellerName, url: p.sellerUrl },
    },
  };
  if (p.ratingValue != null && p.reviewCount != null && p.reviewCount > 0) {
    node.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: p.ratingValue,
      reviewCount: p.reviewCount,
    };
  }
  return node;
}

export interface JsonLdStore {
  name: string;
  description: string;
  image: string | null;
  url: string;
  ratingValue?: number;
  reviewCount?: number;
  pickupArea: string;
  priceRange?: string;
}

export function storeJsonLd(s: JsonLdStore) {
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "FoodEstablishment",
    name: s.name,
    description: s.description,
    url: s.url,
    address: { "@type": "PostalAddress", streetAddress: s.pickupArea },
    servesCuisine: ["Homemade", "Student-cooked"],
    acceptsReservations: "False",
  };
  if (s.image) node.image = s.image;
  if (s.priceRange) node.priceRange = s.priceRange;
  if (s.ratingValue != null && s.reviewCount != null && s.reviewCount > 0) {
    node.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: s.ratingValue,
      reviewCount: s.reviewCount,
    };
  }
  return node;
}

/** Convenience: render a <script> tag's children. */
export function jsonLdScript(obj: object) {
  return {
    __html: JSON.stringify(obj),
  };
}

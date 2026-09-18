import type { Metadata } from "next";
import { jsonLdScript } from "@/lib/seo";
import FeedClient from "./feed-page-client";

export const metadata: Metadata = {
  title: "Feed · CampusCravings",
  description:
    "Browse today's homemade meals from BRAC University students. Filter by category, dietary needs, price, and rating. Pre-order, then pick up on campus.",
  alternates: { canonical: "/feed" },
  openGraph: {
    title: "Feed · CampusCravings",
    description: "Browse today's homemade meals from BRAC University students.",
    type: "website",
    url: "/feed",
    siteName: "CampusCravings",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "CampusCravings feed — today's homemade meals",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Feed · CampusCravings",
    description: "Browse today's homemade meals from BRAC University students.",
    images: ["/og-default.png"],
  },
  robots: { index: true, follow: true },
};

const FEED_JSONLD = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "CampusCravings feed",
  description:
    "Browse and pre-order homemade meals from fellow BRAC University students.",
  url:
    (process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")) +
    "/feed",
};

export default function FeedPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(FEED_JSONLD)}
      />
      <FeedClient />
    </>
  );
}
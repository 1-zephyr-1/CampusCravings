import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { ToastContainer } from "@/components/ui/toast";
import { SWRegister } from "@/components/ui/sw-register";
import { PerfBudget } from "@/components/dev/perf-budget";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CampusCravings — BRAC University Food Marketplace",
  description:
    "Buy and pre-order homemade food from fellow BRAC University students. Campus-only, peer-to-peer food marketplace.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "CampusCravings",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "CampusCravings — BRAC University Food Marketplace",
    description:
      "Buy and pre-order homemade food from fellow BRAC University students. Campus-only, peer-to-peer food marketplace.",
    siteName: "CampusCravings",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CampusCravings — BRAC University Food Marketplace",
    description:
      "Buy and pre-order homemade food from fellow BRAC University students. Campus-only, peer-to-peer food marketplace.",
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  ),
};

export const viewport: Viewport = {
  themeColor: "#DC2626",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrains.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col antialiased bg-[var(--background)] text-[var(--foreground)]">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:p-3 focus:rounded-md focus:bg-[var(--primary)] focus:text-white focus:font-semibold focus:shadow-lg"
        >
          Skip to main content
        </a>
        <ThemeProvider>
          {/* Every route group (marketing / main / seller / creator) renders
              a <main id="main-content"> so the skip link above always works. */}
          {children}
        </ThemeProvider>
        <ToastContainer />
        <SWRegister />
        <PerfBudget />
      </body>
    </html>
  );
}

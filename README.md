# CampusCravings

A peer-to-peer food marketplace built for **BRAC University students**. Browse homemade food from fellow students, place pre-orders with a pickup time, and chat directly with the seller — all on a campus-only, BRACU-email-verified platform.

> Built with Next.js 16 (App Router) · React 19 · TypeScript · Supabase · Tailwind 4.

---

## What's inside

| Capability | Status |
|---|---|
| Email + Google OAuth (BRACU-only) | ✅ |
| Browse / search / dietary-filter feed | ✅ |
| Store pages + item detail with photos | ✅ |
| Cart, checkout, pickup-time picker | ✅ |
| Realtime order status updates | ✅ |
| **Realtime customer ↔ seller chat** (Phase 3) | ✅ |
| **Order event timeline** (Phase 4) | ✅ |
| **Push notifications (in-app inbox)** (Phase 4) | ✅ |
| Seller dashboard, item management, storefront | ✅ |
| Creator admin (users, sellers, listings, reports) | ✅ |
| **PWA install** (Phase 4) | ✅ |
| **JSON-LD structured data** (Phase 4) | ✅ |
| Playwright E2E auth-gate + marketing + a11y | ✅ |
| Lighthouse-friendly (semantic tokens, lazy images, AVIF/WebP) | ✅ |

---

## Quick start

```bash
# 1. Install
npm install

# 2. Set up environment
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# CREATOR_EMAIL (the address that gets auto-promoted to admin on signup).

# 3. Run database migrations (in Supabase SQL editor, in order)
#    supabase/migrations/001_initial_schema.sql
#    supabase/migrations/002_add_indexes_and_triggers.sql
#    supabase/migrations/003_add_food_type_and_fix_notifications.sql
#    supabase/migrations/004_security_hardening.sql
#    supabase/migrations/005_jwt_claims.sql       (optional — kept bundled)
#    supabase/migrations/006_messages.sql         (Phase 3 — chat)
#    supabase/migrations/007_order_events.sql     (Phase 4 — timeline)

# 4. Develop
npm run dev               # http://localhost:3000

# 5. Build & ship
npm run build
npm run start

# 6. Tests
npx playwright install chromium
npx playwright test
```

---

## Project structure

```
src/
├── app/
│   ├── (marketing)/          ← public landing page
│   ├── (auth)/               ← sign-in / callback / onboarding
│   ├── (main)/               ← buyer-facing routes (feed, cart, orders, profile)
│   │   ├── orders/[orderId]/messages/   ← realtime chat (customer)
│   │   └── notifications/    ← inbox (Phase 4)
│   ├── (seller)/             ← seller dashboard + storefront + chat (seller side)
│   ├── (creator)/            ← admin (creator-only)
│   ├── api/                  ← server actions live in src/lib/actions/
│   ├── error.tsx             ← root error boundary
│   ├── not-found.tsx         ← 404
│   ├── layout.tsx            ← root layout (fonts, theme, toast, skip-link)
│   ├── robots.ts
│   └── sitemap.ts
├── components/
│   ├── ui/                   ← Skeleton, EmptyState, SectionHeader, Toast, Modal…
│   ├── layout/               ← TopBar, Sidebar, BottomNav
│   ├── feed/                 ← ItemCard
│   ├── cart/                 ← CartItem, PickupTimePicker
│   ├── messages/             ← OrderThread, MessageBubble, MessageComposer (Phase 3)
│   ├── order/                ← OrderTimeline (Phase 4)
│   ├── seller/               ← OnboardingScore (Phase 4)
│   └── marketing/            ← Hero, HowItWorks, Testimonials, SafetyBadges
├── lib/
│   ├── actions/              ← server actions (checkout, profile, items)
│   ├── constants.ts          ← ORDER_STATUSES, DIETARY_TAGS, PICKUP_AREAS, …
│   ├── jwt-claims.ts         ← custom JWT claim helpers
│   ├── seo.ts                ← per-page metadata helpers
│   ├── seo/structured-data.ts ← JSON-LD generators (Phase 4)
│   ├── supabase/             ← client / server / middleware helpers
│   └── validators/           ← isBracuEmail, etc
└── types/                    ← shared TypeScript types
```

---

## Conventions

- **Semantic tokens only.** All colors come from `var(--*)` tokens defined in `src/app/globals.css`. No raw `text-gray-*` / `bg-white`.
- **Animations respect `prefers-reduced-motion`.** Every `transition-*` class has a sibling `motion-reduce:transition-none`.
- **Auth-required routes live under `(main)`, `(seller)`, `(creator)`.** Middleware redirects anon visitors to `/`.
- **Every page has a `<main id="main-content">`** so the skip-link in the root layout works.
- **RLS, not app-layer filters.** Authorization for sensitive tables (`messages`, `orders`, `order_events`) is enforced by Postgres policies — see `supabase/migrations/00*.sql`.
- **Realtime uses `postgres_changes` filtered server-side** (e.g. `order_id=eq.{uuid}`) and is always cleaned up via `supabase.removeChannel()` on unmount.
- **Optimistic UI** for any mutation the user expects to feel instant (sending a message, marking a notification read, toggling a favorite). Reconcile by row id.

---

## Testing

- **Playwright E2E** (`e2e/*.spec.ts`): marketing renders, footer nav, auth-gate for protected routes, messages auth-gate, axe-core accessibility scan on `/feed`.
- **Manual smoke** (realtime): open `/orders/{id}/messages` as the buyer in one tab and `/seller/orders/{id}/messages` as the seller in another — messages should round-trip without refresh.

```bash
npm run build && npm run start &
npx playwright test
```

---

## Roadmap

The app shipped in 4 phases:

- **Phase 1** — frontend overhaul: new landing, JWT middleware, design tokens, accessibility, SEO, item detail, cart, pickup picker.
- **Phase 2** — dashboard polish + Playwright E2E + symmetric seller-side messaging stub.
- **Phase 3** — realtime customer ↔ seller chat over Supabase Realtime with RLS.
- **Phase 4** — order timeline, notification inbox, settings page, PWA install, structured data, empty-state illustrations, seller onboarding score, share buttons, error-boundary audit.

Next: typed notifications routing, push notifications via service worker, dietary-pref-driven "Recommended for you" feed.

---

## License

UNLICENSED — internal BRAC University capstone project.

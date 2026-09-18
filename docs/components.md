# Components

## UI primitives

### Skeleton
Lightweight animated shimmer placeholder for loading states. Disables its animation under `prefers-reduced-motion`.
```ts
interface SkeletonProps {
  className?: string;
  shape?: "rect" | "pill" | "circle"; // default "rect"
}
```
```tsx
<Skeleton className="h-10 w-2/3" />
<Skeleton shape="circle" className="w-12 h-12" />
```

### EmptyState
Reusable empty state with optional icon/illustration, title, message, and CTA. Used wherever a list returns zero rows.
```ts
interface EmptyStateProps {
  icon?: ComponentType<{ size?: number; className?: string }>;
  illustration?: EmptyIllustrationVariant; // branded SVG; wins over icon
  title?: string;
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
  className?: string;
  children?: ReactNode;
}
```
```tsx
<EmptyState
  illustration="no-orders"
  title="No orders yet"
  message="When you place an order, it will show up here."
  ctaLabel="Browse food"
  ctaHref="/feed"
/>
```

### SectionHeader
Reusable section heading. `variant="accent-line"` adds the left red bar used throughout the app. `rightSlot` is for "See all" links or filter controls.
```ts
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  variant?: "default" | "accent-line"; // default "default"
  rightSlot?: ReactNode;
  className?: string;
  id?: string;
}
```
```tsx
<SectionHeader
  variant="accent-line"
  title="Trending near you"
  subtitle="Based on orders this week"
  rightSlot={<Link href="/feed">See all</Link>}
/>
```

### ConfirmModal
Accessible confirm dialog. Handles focus trap, restore-on-close, Escape-to-close, backdrop click, and body scroll lock.
```ts
interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string; // default "Confirm"
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean; // switches icon + button color to danger tokens
}
```
```tsx
<ConfirmModal
  open={isOpen}
  title="Cancel order?"
  message="This cannot be undone."
  confirmLabel="Yes, cancel"
  danger
  onConfirm={handleCancel}
  onCancel={() => setIsOpen(false)}
/>
```

### Toast
Simple, event-emitter-style toast API. Pair with the `ToastContainer` in the root layout (it's already mounted).
```ts
type ToastType = "success" | "error" | "info";

export function toast(message: string, type: ToastType = "info"): void;
export function ToastContainer(): JSX.Element | null;
```
```tsx
import { toast } from "@/components/ui/toast";

toast("Order placed!", "success");
toast("Couldn't save changes", "error");
```
Export: `toast(message, type)`. Use the `ToastContainer` in root layout (already there).

### QuantityStepper
Accessible ± stepper with distinct `aria-label`s per button. `min`/`max` are clamped on click and button disabled state mirrors them.
```ts
interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number; // default 1
  max?: number; // default 99
  label: string; // accessible group label, e.g. "Biryani quantity"
  size?: "sm" | "md"; // default "md"
  className?: string;
}
```
```tsx
<QuantityStepper
  value={qty}
  onChange={setQty}
  label="Biryani quantity"
  size="md"
/>
```

### FilterChip
Multi/single-select chip for dietary filters. Uses `aria-pressed` (multi) or `role="radio"` + `aria-checked` (single). Roving focus is the parent's responsibility.
```ts
interface FilterChipProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  mode?: "multi" | "single"; // default "multi"
  className?: string;
}
```
```tsx
<FilterChip
  label="Vegetarian"
  isActive={filters.includes("veg")}
  onClick={() => toggle("veg")}
/>
```

### Pagination
Numbered pager with prev/next and collapsed ellipsis on long ranges. Returns `null` when `totalPages <= 1`.
```ts
interface PaginationProps {
  page: number;          // 1-based
  totalPages: number;
  onPageChange: (page: number) => void;
}
```
```tsx
<Pagination
  page={page}
  totalPages={Math.ceil(total / pageSize)}
  onPageChange={setPage}
/>
```

### ThemeProvider
Wraps the app in `next-themes` with `attribute="class"`, `defaultTheme="light"`, `enableSystem`, and `disableTransitionOnChange`. Mounted once in the root layout — don't use directly.

```tsx
// app/layout.tsx
<ThemeProvider>{children}</ThemeProvider>
```

## Messaging (Phase 3)

### OrderThread
Realtime message thread for a single order. Shared by buyer-side `/orders/[orderId]/messages` and seller-side `/seller/orders/[orderId]/messages` pages; the page wrappers fetch order context and authorize, then render this.

Behavior:
- Initial `SELECT` of messages for the `order_id`, ordered by `created_at ASC`.
- Subscribes to `postgres_changes INSERT` on `messages` filtered by `order_id`; dedupes by id.
- Optimistic sends: local `_status: "sending"` row, then reconciles on Supabase response. Failed sends surface a retry button.
- Authorization is enforced by Postgres RLS (migration `006_messages.sql`), not in the component.

```ts
interface OrderThreadProps {
  orderId: string;
  viewerRole: "customer" | "seller";
  counterpartName: string;
  backHref: string;
  fallback?: { label: string; href: string }; // e.g. "Email seller instead"
}
```
```tsx
<OrderThread
  orderId={order.id}
  viewerRole="customer"
  counterpartName={order.seller_name}
  backHref={`/orders/${order.id}`}
/>
```

### MessageBubble
Single bubble in the order thread. "Mine" bubbles are right-aligned with the primary background; theirs are left-aligned with the surface background. Shows a spinner while `_status === "sending"` and a Retry button while `_status === "failed"`.

```ts
export interface MessageBubbleMessage {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  _status?: "sending" | "failed"; // in-memory only
}

interface MessageBubbleProps {
  message: MessageBubbleMessage;
  isMine: boolean;
  currentUserId: string;
  onRetry?: (message: MessageBubbleMessage) => void;
}
```
```tsx
<MessageBubble
  message={m}
  isMine={m.sender_id === userId}
  currentUserId={userId}
  onRetry={handleRetry}
/>
```

### MessageComposer
Auto-growing textarea + send button. Enter sends, Shift+Enter inserts a newline. Trims whitespace and rejects empty payloads (the DB has a `char_length(body) > 0` check).

```ts
interface MessageComposerProps {
  onSend: (text: string) => void | Promise<void>;
  disabled?: boolean;          // e.g. while auth is loading
  placeholder?: string;        // default "Type a message…"
}
```
```tsx
<MessageComposer
  onSend={handleSend}
  disabled={!user}
  placeholder="Message the seller…"
/>
```

## Layout

### TopBar
Sticky top bar with the CampusCravings logo (mobile-only — the sidebar shows it on desktop), a search input that routes to `/feed?q=…`, a notification bell with an unread badge (subscribes to `notifications` inserts), and a theme toggle that flips `light`/`dark` via `next-themes`. No props — mounted once in the root layout.

### Sidebar
Desktop-only (`hidden md:flex`) left rail at `w-60`. Renders the logo, the primary nav (Home, Search, My Orders, Profile), a Seller Hub link for `role === "seller"` or `"creator"`, an Admin Panel link for `role === "creator"`, the signed-in user's name/email, and a Sign Out button. Active link is detected via `usePathname()`. No props.

### BottomNav
Mobile-only (`md:hidden`) fixed bottom nav mirroring the sidebar's nav items (with seller/admin variants inserted for the right roles). Honors `env(safe-area-inset-bottom)` for notched devices. No props.

## Conventions
- All components use semantic tokens (`var(--*)`).
- All animations respect `prefers-reduced-motion`.

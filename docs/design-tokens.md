# Design tokens

All colors, spacing, and typography in this app come from CSS custom properties. Never use raw Tailwind color classes (`text-gray-500`, `bg-white`).

Source of truth: `src/app/globals.css`. Light tokens are defined on `:root`; dark tokens override them on the `.dark` class.

## Colors

| Token | Purpose | Light | Dark |
|---|---|---|---|
| `--background` | Page background | `#F8F8F8` | `#121212` |
| `--foreground` | Default body foreground | `#111827` | `#F9FAFB` |
| `--surface` | Card / panel background | `#FFFFFF` | `#1E1E1E` |
| `--surface-elev` | Elevated surface (hover, raised panels) | `#FFFFFF` | `#262626` |
| `--text` | Primary text | `#111827` | `#F9FAFB` |
| `--text-muted` | Secondary text (subtitles, helper) | `#4B5563` | `#D1D5DB` |
| `--text-subtle` | Tertiary text (timestamps, captions) | `#6B7280` | `#9CA3AF` |
| `--border` | Default border | `#E5E7EB` | `#333333` |
| `--border-strong` | Stronger border (dividers, scrollbar) | `#D1D5DB` | `#4B5563` |
| `--primary` | Brand color (CTA buttons, links, focus rings) | `#DC2626` | `#F87171` |
| `--primary-hover` | Primary hover state | `#B91C1C` | `#FCA5A5` |
| `--primary-soft` | Soft primary background (badges, hover states) | `#FEF2F2` | `rgba(220, 38, 38, 0.15)` |
| `--accent` | Accent color (gradients, secondary CTA) | `#F59E0B` | `#FCD34D` |
| `--success` | Success state (green) | `#16A34A` | `#22C55E` |
| `--success-soft` | Soft success background | `#DCFCE7` | `rgba(22, 163, 74, 0.2)` |
| `--danger` | Error / delete (red) | `#DC2626` | `#F87171` |
| `--danger-soft` | Soft danger background | `#FEE2E2` | `rgba(220, 38, 38, 0.2)` |
| `--warning` | Warning (amber) | `#F59E0B` | `#FCD34D` |
| `--warning-soft` | Soft warning background | `#FEF3C7` | `rgba(245, 158, 11, 0.2)` |

### Radii

| Token | Value |
|---|---|
| `--radius-sm` | `6px` |
| `--radius` | `10px` |
| `--radius-lg` | `16px` |
| `--radius-xl` | `22px` |

### Shadows

| Token | Value (light) | Value (dark) |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0, 0, 0, 0.04)` | (inherits) |
| `--shadow` | `0 4px 12px rgba(0, 0, 0, 0.06)` | `0 4px 12px rgba(0, 0, 0, 0.4)` |
| `--shadow-lg` | `0 8px 24px rgba(0, 0, 0, 0.08)` | `0 8px 24px rgba(0, 0, 0, 0.5)` |
| `--focus-ring` | `0 0 0 3px rgba(220, 38, 38, 0.35)` | `0 0 0 3px rgba(248, 113, 113, 0.45)` |

## Animation

| Class | Purpose | Reduced-motion fallback |
|---|---|---|
| `animate-shimmer` | Loading skeleton shimmer | `motion-reduce:animate-none` (and `@media (prefers-reduced-motion: reduce)` disables it) |
| `animate-fade-in` | Fade in on mount (backdrops, overlays) | `motion-reduce:animate-none` (and `@media (prefers-reduced-motion: reduce)` disables it) |
| `animate-slide-up` | Slide up + fade (toasts, modals) | `motion-reduce:animate-none` (and `@media (prefers-reduced-motion: reduce)` disables it) |

Underlying keyframes: `slide-up` (translateY 8px → 0, opacity 0 → 1, 0.3s ease-out), `fade-in` (opacity 0 → 1, 0.2s ease-out), `shimmer` (1.4s ease-in-out infinite on a 200% background).

## Conventions

- All buttons: `bg-[var(--primary)] text-white rounded-full px-5 py-2.5 hover:bg-[var(--primary-hover)] transition-colors motion-reduce:transition-none`
- All inputs: `bg-[var(--surface)] border border-[var(--border)] rounded-xl focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30`
- All cards: `bg-[var(--surface)] border border-[var(--border)] rounded-xl`

### Typography

Fonts are defined via the Tailwind theme: `--font-sans` (Inter) and `--font-mono` (JetBrains Mono). The body element uses `var(--font-sans), system-ui, sans-serif`.

### Utility helpers

- `.stamp-sold-out` — rotated (`-12deg`) stamp-style label, `border: 3px solid var(--primary)`, `color: var(--primary)`, uppercase.
- `.price-tag` — tabular-nums price with `1px dashed var(--border)` border.
- `.chip-active` — `bg-[var(--primary)] text-white`.
- `.chip-inactive` — `bg-[var(--surface)] text-[var(--text)] border border-[var(--border)]`.
- `.accent-line` — left-bordered accent (`border-left: 3px solid var(--primary)`).
- `.step-connector` — 2px wide vertical connector (used in multi-step flows); `.step-connector.active` uses `var(--primary)`.

### Focus

`:focus-visible` is styled globally with `outline: 2px solid var(--primary); outline-offset: 2px; border-radius: 4px` so every interactive element has a visible focus indicator without per-component overrides.

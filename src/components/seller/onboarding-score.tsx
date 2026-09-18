"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { useSupabase } from "@/lib/supabase/use-client";
import { useAuth } from "@/components/ui/auth-provider";
import type { FoodItem, Store } from "@/types";

interface CheckResult {
  label: string;
  points: number;
  passed: boolean;
  hint?: string;
  href?: string;
}

interface ScoreBreakdown {
  score: number;
  checks: CheckResult[];
}

const RING_RADIUS = 48;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function computeBreakdown(
  store: Store | null,
  items: FoodItem[],
  fullName: string | null,
  avatarUrl: string | null
): ScoreBreakdown {
  const activeItems = items.filter((i) => !i.is_sold_out);
  const itemsWithPhotos = items.filter(
    (i) => Array.isArray(i.photo_urls) && i.photo_urls.length > 0
  );

  const checks: CheckResult[] = [
    {
      label: "Add a store name",
      points: 10,
      passed: Boolean(store?.name && store.name.trim().length > 0),
      hint: "Name your store",
      href: "/seller/storefront",
    },
    {
      label: "Write a store description (30+ chars)",
      points: 15,
      passed: Boolean(store?.description && store.description.length >= 30),
      hint: "Tell buyers what you cook",
      href: "/seller/storefront",
    },
    {
      label: "Upload a store photo",
      points: 15,
      passed: Boolean(store?.photo_url),
      hint: "Add a store photo",
      href: "/seller/storefront",
    },
    {
      label: "Set a pickup area",
      points: 10,
      passed: Boolean(store?.pickup_area && store.pickup_area.trim().length > 0),
      hint: "Add a pickup area",
      href: "/seller/storefront",
    },
    {
      label: "List at least one active item",
      points: 20,
      passed: activeItems.length >= 1,
      hint: "List your first item",
      href: "/seller/new-item",
    },
    {
      label: "Add photos to an item",
      points: 15,
      passed: itemsWithPhotos.length >= 1,
      hint: "Add photos to an item",
      href: "/seller/items",
    },
    {
      label: "Add your full name",
      points: 5,
      passed: Boolean(fullName && fullName.trim().length > 0),
      hint: "Add your name",
      href: "/seller/edit-profile",
    },
    {
      label: "Upload a profile avatar",
      points: 10,
      passed: Boolean(avatarUrl),
      hint: "Add an avatar",
      href: "/seller/edit-profile",
    },
  ];

  const score = checks.reduce(
    (sum, c) => sum + (c.passed ? c.points : 0),
    0
  );

  return { score, checks };
}

function OnboardingScoreSkeleton() {
  return (
    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5">
      <div className="flex items-center gap-5">
        <Skeleton shape="circle" className="w-28 h-28 shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
    </div>
  );
}

export function OnboardingScore() {
  const { profile } = useAuth();
  const supabase = useSupabase();
  const [store, setStore] = useState<Store | null>(null);
  const [items, setItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;

    let cancelled = false;

    async function load() {
      try {
        const { data: storeData, error: storeErr } = await supabase
          .from("stores")
          .select("*")
          .eq("user_id", profile!.id)
          .maybeSingle();

        if (storeErr) throw storeErr;

        if (!storeData) {
          if (!cancelled) {
            setStore(null);
            setItems([]);
            setLoading(false);
          }
          return;
        }

        const { data: itemsData, error: itemsErr } = await supabase
          .from("food_items")
          .select("*")
          .eq("store_id", storeData.id);

        if (itemsErr) throw itemsErr;

        if (!cancelled) {
          setStore(storeData as Store);
          setItems((itemsData || []) as FoodItem[]);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [profile, supabase]);

  const breakdown = useMemo(
    () =>
      computeBreakdown(
        store,
        items,
        profile?.full_name ?? null,
        profile?.avatar_url ?? null
      ),
    [store, items, profile?.full_name, profile?.avatar_url]
  );

  if (loading) return <OnboardingScoreSkeleton />;

  if (error) {
    return (
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5">
        <p className="text-sm text-[var(--text-muted)]">
          Couldn&rsquo;t load your profile score: {error}
        </p>
      </div>
    );
  }

  const { score, checks } = breakdown;
  const missing = checks.filter((c) => !c.passed);
  const dashOffset = RING_CIRCUMFERENCE * (1 - score / 100);

  return (
    <section
      aria-label="Storefront completeness"
      className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5"
    >
      <div className="flex items-center gap-5">
        <div className="relative w-28 h-28 shrink-0">
          <svg
            viewBox="0 0 120 120"
            className="w-full h-full -rotate-90"
            aria-hidden="true"
          >
            <circle
              cx="60"
              cy="60"
              r={RING_RADIUS}
              stroke="var(--border)"
              strokeWidth="10"
              fill="none"
            />
            <circle
              cx="60"
              cy="60"
              r={RING_RADIUS}
              stroke="var(--primary)"
              strokeWidth="10"
              fill="none"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold font-mono text-[var(--text)]">
              {score}%
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} className="text-[var(--primary)]" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-[var(--text)]">
              Profile {score}% complete
            </h2>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            {score === 100
              ? "Your storefront looks great — buyers can find everything they need."
              : "Complete your storefront to attract more buyers."}
          </p>
        </div>
      </div>

      {missing.length > 0 ? (
        <ul role="list" className="mt-4 space-y-1">
          {missing.map((check) => (
            <li key={check.label}>
              <Link
                href={check.href ?? "/seller/storefront"}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2 rounded-lg",
                  "hover:bg-[var(--background)] transition-colors motion-reduce:transition-none",
                  "group"
                )}
              >
                <Circle
                  size={14}
                  className="text-[var(--text-subtle)] group-hover:text-[var(--primary)] shrink-0"
                  aria-hidden="true"
                />
                <span className="text-sm text-[var(--text)]">
                  {check.hint ?? check.label}
                </span>
                <span className="ml-auto text-xs font-mono text-[var(--text-subtle)]">
                  +{check.points}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 flex items-center gap-2 text-sm text-[var(--success)]">
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>All checks complete</span>
        </div>
      )}
    </section>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, PartyPopper, Sparkles } from "lucide-react";
import { clsx } from "clsx";

import { Skeleton } from "@/components/ui/skeleton";
import { useSupabase } from "@/lib/supabase/use-client";
import { useAuth } from "@/components/ui/auth-provider";
import type { FoodItem, Store } from "@/types";

type ChecklistItem = {
  id: string;
  label: string;
  passed: boolean;
  href: string;
};

function StoreSetupChecklistSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading setup checklist"
      className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5"
    >
      <Skeleton className="h-4 w-44 mb-3" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-9 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function StoreSetupChecklist() {
  const { profile } = useAuth();
  const supabase = useSupabase();
  const router = useRouter();

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

  const checklist: ChecklistItem[] = useMemo(() => {
    const hasName = Boolean(store?.name && store.name.trim().length > 0);
    const hasDescription = Boolean(
      store?.description && store.description.length >= 30
    );
    const hasPhoto = Boolean(store?.photo_url);
    const hasPickup = Boolean(
      store?.pickup_area && store.pickup_area.trim().length > 0
    );
    const hasItem = items.some((i) => !i.is_sold_out);

    return [
      {
        id: "name",
        label: "Add a store name",
        passed: hasName,
        href: "/seller/storefront",
      },
      {
        id: "description",
        label: "Add a store description (30+ chars)",
        passed: hasDescription,
        href: "/seller/storefront",
      },
      {
        id: "photo",
        label: "Add a store photo",
        passed: hasPhoto,
        href: "/seller/storefront",
      },
      {
        id: "pickup",
        label: "Set a pickup area",
        passed: hasPickup,
        href: "/seller/storefront",
      },
      {
        id: "item",
        label: "Add at least 1 item for sale",
        passed: hasItem,
        href: "/seller/new-item",
      },
    ];
  }, [store, items]);

  if (loading) return <StoreSetupChecklistSkeleton />;

  if (error) {
    return (
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5">
        <p className="text-sm text-[var(--text-muted)]">
          Couldn&rsquo;t load the setup checklist: {error}
        </p>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={16} className="text-[var(--primary)]" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-[var(--text)]">
            Set up your store
          </h2>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          Create your storefront to start selling to BRAC University students.
        </p>
        <Link
          href="/seller/storefront"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--primary)] text-white text-xs font-semibold hover:bg-[var(--primary-hover)] transition-colors motion-reduce:transition-none"
        >
          Set up store
        </Link>
      </div>
    );
  }

  const allComplete = checklist.every((c) => c.passed);

  // Celebration card — store is fully set up.
  if (allComplete) {
    return (
      <section
        aria-label="Store setup complete"
        className="bg-[var(--success-soft)] rounded-xl border border-[var(--success)]/30 p-5"
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--success)]/20 flex items-center justify-center">
            <PartyPopper size={20} className="text-[var(--success)]" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-[var(--text)]">
              Your store is ready!
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Everything is set up. Buyers can now find your store on the feed and place orders.
            </p>
            <button
              type="button"
              onClick={() => router.push("/seller/items")}
              className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-full bg-[var(--primary)] text-white text-xs font-semibold hover:bg-[var(--primary-hover)] transition-colors motion-reduce:transition-none"
            >
              Manage items
            </button>
          </div>
        </div>
      </section>
    );
  }

  const completed = checklist.filter((c) => c.passed).length;

  return (
    <section
      aria-label="Store setup checklist"
      className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[var(--primary)]" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-[var(--text)]">
            Finish setting up your store
          </h2>
        </div>
        <span className="text-xs font-mono text-[var(--text-muted)]">
          {completed}/{checklist.length}
        </span>
      </div>

      <ul role="list" className="space-y-1">
        {checklist.map((item) => {
          const interactive = !item.passed;
          const content = (
            <>
              {item.passed ? (
                <CheckCircle2
                  size={16}
                  className="text-[var(--success)] shrink-0"
                  aria-hidden="true"
                />
              ) : (
                <Circle
                  size={16}
                  className="text-[var(--text-subtle)] shrink-0 group-hover:text-[var(--primary)]"
                  aria-hidden="true"
                />
              )}
              <span
                className={clsx(
                  "text-sm",
                  item.passed
                    ? "text-[var(--text-muted)] line-through"
                    : "text-[var(--text)]"
                )}
              >
                {item.label}
              </span>
            </>
          );

          return (
            <li key={item.id}>
              {interactive ? (
                <Link
                  href={item.href}
                  className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--background)] transition-colors motion-reduce:transition-none"
                >
                  {content}
                </Link>
              ) : (
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
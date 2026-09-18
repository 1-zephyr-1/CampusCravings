"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Store, Users, UtensilsCrossed, X } from "lucide-react";
import { useSupabase } from "@/lib/supabase/use-client";
import { clsx } from "clsx";

type SearchResultType = "user" | "seller" | "listing";

interface SearchResult {
  id: string;
  type: SearchResultType;
  label: string;
  sublabel?: string;
  href: string;
}

const TYPE_META: Record<
  SearchResultType,
  { label: string; icon: typeof Users; chip: string }
> = {
  user: {
    label: "User",
    icon: Users,
    chip: "bg-[var(--primary-soft)] text-[var(--primary)]",
  },
  seller: {
    label: "Seller",
    icon: Store,
    chip: "bg-[var(--warning-soft)] text-[var(--warning)]",
  },
  listing: {
    label: "Listing",
    icon: UtensilsCrossed,
    chip: "bg-[var(--success)]/15 text-[var(--success)]",
  },
};

const DEBOUNCE_MS = 250;
const RESULT_LIMIT = 5;

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = useSupabase();

  // Debounce query.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  // Run search when debounced query changes.
  useEffect(() => {
    if (!debounced) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function runSearch() {
      const pattern = `%${debounced}%`;
      const [usersRes, sellersRes, listingsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, role")
          .or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
          .limit(RESULT_LIMIT),
        supabase
          .from("stores")
          .select("id, name, pickup_area")
          .ilike("name", pattern)
          .limit(RESULT_LIMIT),
        supabase
          .from("food_items")
          .select("id, name, store:stores(name)")
          .ilike("name", pattern)
          .limit(RESULT_LIMIT),
      ]);

      if (cancelled) return;

      const merged: SearchResult[] = [];

      for (const u of usersRes.data || []) {
        merged.push({
          id: u.id,
          type: "user",
          label: u.full_name || u.email || "User",
          sublabel: u.email,
          href: "/creator/users",
        });
      }

      for (const s of sellersRes.data || []) {
        merged.push({
          id: s.id,
          type: "seller",
          label: s.name,
          sublabel: s.pickup_area,
          href: "/creator/sellers",
        });
      }

      for (const l of listingsRes.data || []) {
        const store = l.store as { name?: string } | null;
        merged.push({
          id: l.id,
          type: "listing",
          label: l.name,
          sublabel: store?.name,
          href: "/creator/listings",
        });
      }

      setResults(merged);
      setLoading(false);
    }

    runSearch();
    return () => {
      cancelled = true;
    };
  }, [debounced, supabase]);

  // Close on outside click.
  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  // Close on Escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const grouped = useMemo(() => {
    const map: Record<SearchResultType, SearchResult[]> = {
      user: [],
      seller: [],
      listing: [],
    };
    for (const r of results) map[r.type].push(r);
    return map;
  }, [results]);

  const total = results.length;

  function handleSelect(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xl mx-auto hidden sm:block">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
          size={16}
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search users, sellers, listings..."
          aria-label="Search users, sellers, and listings"
          aria-expanded={open && (loading || total > 0)}
          aria-controls="global-search-results"
          role="combobox"
          className="w-full pl-9 pr-9 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-colors motion-reduce:transition-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-elev)] hover:text-[var(--text)] transition-colors motion-reduce:transition-none"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {open && debounced && (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute left-0 right-0 mt-2 max-h-[28rem] overflow-y-auto bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-50"
        >
          {loading && total === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
              Searching...
            </div>
          ) : total === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
              No matches for &ldquo;{debounced}&rdquo;
            </div>
          ) : (
            <div className="py-2">
              {(["user", "seller", "listing"] as const).map((type) => {
                const items = grouped[type];
                if (items.length === 0) return null;
                const meta = TYPE_META[type];
                const Icon = meta.icon;
                return (
                  <div key={type} className="mb-1 last:mb-0">
                    <div className="px-4 pt-2 pb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      <Icon size={11} aria-hidden="true" />
                      {meta.label}s
                    </div>
                    {items.map((r) => (
                      <button
                        key={`${type}-${r.id}`}
                        type="button"
                        onClick={() => handleSelect(r.href)}
                        role="option"
                        aria-selected="false"
                        className="w-full px-4 py-2 flex items-center gap-3 text-left hover:bg-[var(--background)] transition-colors motion-reduce:transition-none"
                      >
                        <span
                          aria-hidden="true"
                          className={clsx(
                            "shrink-0 w-7 h-7 rounded-lg flex items-center justify-center",
                            meta.chip
                          )}
                        >
                          <Icon size={13} />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-[var(--text)] truncate">
                            {r.label}
                          </span>
                          {r.sublabel && (
                            <span className="block text-xs text-[var(--text-muted)] truncate">
                              {r.sublabel}
                            </span>
                          )}
                        </span>
                        <span
                          aria-hidden="true"
                          className={clsx(
                            "shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                            meta.chip
                          )}
                        >
                          {meta.label}
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })}
              <div className="border-t border-[var(--border)] mt-1 px-4 py-2 text-[10px] uppercase tracking-wider text-[var(--text-muted)] flex items-center justify-between">
                <span>{total} result{total === 1 ? "" : "s"}</span>
                <span>Click to view all</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
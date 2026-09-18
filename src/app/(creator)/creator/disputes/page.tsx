"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle,
  Eye,
  FileText,
  Gavel,
  XCircle,
} from "lucide-react";
import { clsx } from "clsx";

import { useSupabase } from "@/lib/supabase/use-client";
import { useAuth } from "@/components/ui/auth-provider";
import { Dispute, DisputeStatus, Profile } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

type DisputeWithProfiles = Dispute & {
  filed_by_profile: Pick<Profile, "id" | "full_name" | "email" | "avatar_url"> | null;
  against_profile: Pick<Profile, "id" | "full_name" | "email" | "avatar_url"> | null;
};

const STATUS_CONFIG: Record<
  DisputeStatus,
  { label: string; color: string; icon: typeof AlertTriangle }
> = {
  open: {
    label: "Open",
    color: "bg-[var(--warning-soft)] text-[var(--warning)]",
    icon: AlertTriangle,
  },
  reviewing: {
    label: "Reviewing",
    color: "bg-[var(--primary-soft)] text-[var(--primary)]",
    icon: Eye,
  },
  resolved_buyer: {
    label: "Resolved for buyer",
    color: "bg-[var(--success)]/20 text-[var(--success)]",
    icon: CheckCircle,
  },
  resolved_seller: {
    label: "Resolved for seller",
    color: "bg-[var(--success)]/20 text-[var(--success)]",
    icon: CheckCircle,
  },
  dismissed: {
    label: "Dismissed",
    color: "bg-[var(--background)] text-[var(--text-muted)] border border-[var(--border)]",
    icon: XCircle,
  },
};

const CATEGORY_LABEL: Record<Dispute["category"], string> = {
  not_received: "Not received",
  quality: "Quality",
  missing_items: "Missing items",
  seller_unresponsive: "Seller unresponsive",
  other: "Other",
};

function Avatar({
  profile,
  fallbackName,
}: {
  profile: DisputeWithProfiles["filed_by_profile"];
  fallbackName: string;
}) {
  const initial =
    profile?.full_name?.[0] ||
    profile?.email?.[0]?.toUpperCase() ||
    fallbackName?.[0]?.toUpperCase() ||
    "?";
  return (
    <div
      aria-hidden="true"
      className="w-8 h-8 rounded-full bg-[var(--primary-soft)] flex items-center justify-center text-[var(--primary)] text-sm font-bold shrink-0"
    >
      {initial}
    </div>
  );
}

export default function DisputesPage() {
  const supabase = useSupabase();
  const { profile } = useAuth();
  const [disputes, setDisputes] = useState<DisputeWithProfiles[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | DisputeStatus>("all");
  const [active, setActive] = useState<DisputeWithProfiles | null>(null);
  const [resolveStatus, setResolveStatus] = useState<DisputeStatus>("reviewing");
  const [resolveNotes, setResolveNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchDisputes() {
      // RLS lets creators read all disputes. We pull the joined profile
      // fragments we need for the row UI.
      const { data, error } = await supabase
        .from("disputes")
        .select(
          `*,
           filed_by_profile:profiles!disputes_filed_by_fkey(id, full_name, email, avatar_url),
           against_profile:profiles!disputes_against_fkey(id, full_name, email, avatar_url)`,
        )
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (error) {
        // Migration may not be applied yet — surface gracefully.
        const code = (error as { code?: string }).code;
        if (code === "42P01" || /does not exist/i.test(error.message)) {
          toast("Disputes table isn't ready yet.", "info");
          setDisputes([]);
        } else {
          toast("Couldn't load disputes.", "error");
        }
      } else {
        setDisputes((data as DisputeWithProfiles[]) || []);
      }
      setLoading(false);
    }
    fetchDisputes();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const filtered = useMemo(() => {
    if (filter === "all") return disputes;
    return disputes.filter((d) => d.status === filter);
  }, [disputes, filter]);

  const pendingCount = disputes.filter((d) => d.status === "open").length;

  function openResolveModal(d: DisputeWithProfiles) {
    setActive(d);
    setResolveStatus(d.status === "open" ? "reviewing" : d.status);
    setResolveNotes(d.resolution_notes ?? "");
  }

  function closeResolveModal() {
    if (saving) return;
    setActive(null);
    setResolveNotes("");
  }

  async function handleResolve() {
    if (!active || !profile) return;
    setSaving(true);
    const isResolved =
      resolveStatus === "resolved_buyer" ||
      resolveStatus === "resolved_seller" ||
      resolveStatus === "dismissed";
    const updatePayload: Partial<Dispute> & {
      resolved_by?: string | null;
      resolved_at?: string | null;
    } = {
      status: resolveStatus,
      resolution_notes: resolveNotes.trim() || null,
    };
    if (isResolved) {
      updatePayload.resolved_by = profile.id;
      updatePayload.resolved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("disputes")
      .update(updatePayload)
      .eq("id", active.id);
    setSaving(false);

    if (error) {
      toast("Couldn't update dispute. Please try again.", "error");
      return;
    }

    setDisputes((prev) =>
      prev.map((d) =>
        d.id === active.id
          ? {
              ...d,
              ...updatePayload,
            }
          : d,
      ),
    );
    toast(`Dispute marked ${STATUS_CONFIG[resolveStatus].label.toLowerCase()}.`, "success");
    setActive(null);
    setResolveNotes("");
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-label="Loading disputes" role="status">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Disputes"
        subtitle="Resolve issues filed between buyers and sellers."
      />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-[var(--text)] sr-only">
          Disputes
        </h1>
        <div role="tablist" aria-label="Filter disputes" className="flex gap-2 flex-wrap">
          {(
            [
              "all",
              "open",
              "reviewing",
              "resolved_buyer",
              "resolved_seller",
              "dismissed",
            ] as const
          ).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={clsx(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-colors motion-reduce:transition-none capitalize",
                filter === f
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--background)] text-[var(--text-muted)] hover:bg-[var(--border)]",
              )}
            >
              {f === "all"
                ? "All"
                : f === "resolved_buyer"
                  ? "Resolved (Buyer)"
                  : f === "resolved_seller"
                    ? "Resolved (Seller)"
                    : f.charAt(0).toUpperCase() + f.slice(1)}
              {f === "open" && pendingCount > 0 && (
                <span className="ml-1.5 bg-[var(--primary)]/20 text-[var(--primary)] px-1.5 rounded-full text-xs">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-5 py-3 font-medium text-[var(--text-muted)]">
                  Order
                </th>
                <th className="text-left px-5 py-3 font-medium text-[var(--text-muted)]">
                  Filed by
                </th>
                <th className="text-left px-5 py-3 font-medium text-[var(--text-muted)]">
                  Against
                </th>
                <th className="text-left px-5 py-3 font-medium text-[var(--text-muted)]">
                  Category
                </th>
                <th className="text-left px-5 py-3 font-medium text-[var(--text-muted)]">
                  Reason
                </th>
                <th className="text-left px-5 py-3 font-medium text-[var(--text-muted)]">
                  Status
                </th>
                <th className="text-left px-5 py-3 font-medium text-[var(--text-muted)]">
                  Filed
                </th>
                <th className="text-right px-5 py-3 font-medium text-[var(--text-muted)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-0">
                    <EmptyState
                      icon={Gavel}
                      message={
                        disputes.length === 0
                          ? "No disputes filed yet. Buyers can report issues from completed orders."
                          : "No disputes match this filter."
                      }
                      className="border-0 rounded-none py-10"
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((d) => {
                  const config = STATUS_CONFIG[d.status];
                  return (
                    <tr
                      key={d.id}
                      className="border-b border-[var(--border)]/50 last:border-0 hover:bg-[var(--background)] transition-colors motion-reduce:transition-none"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/orders/${d.order_id}`}
                          className="font-mono text-[var(--primary)] hover:underline"
                        >
                          #{d.order_id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar
                            profile={d.filed_by_profile}
                            fallbackName={d.filed_by_profile?.full_name ?? "F"}
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-[var(--text)] truncate max-w-[140px]">
                              {d.filed_by_profile?.full_name ||
                                d.filed_by_profile?.email ||
                                "Unknown"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar
                            profile={d.against_profile}
                            fallbackName={d.against_profile?.full_name ?? "A"}
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-[var(--text)] truncate max-w-[140px]">
                              {d.against_profile?.full_name ||
                                d.against_profile?.email ||
                                "Unknown"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--background)] text-[var(--text-muted)] border border-[var(--border)]">
                          {CATEGORY_LABEL[d.category]}
                        </span>
                      </td>
                      <td className="px-5 py-3 max-w-[220px]">
                        <p className="text-[var(--text)] truncate" title={d.reason}>
                          {d.reason}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={clsx(
                            "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap",
                            config.color,
                          )}
                        >
                          <config.icon size={10} aria-hidden="true" />
                          {config.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[var(--text-muted)] whitespace-nowrap">
                        {new Date(d.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openResolveModal(d)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-[var(--primary-soft)] text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors motion-reduce:transition-none"
                        >
                          <Gavel size={12} aria-hidden="true" />
                          Resolve
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {active && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="resolve-dispute-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeResolveModal();
          }}
        >
          <div
            className="absolute inset-0 bg-black/50 animate-fade-in motion-reduce:animate-none"
            aria-hidden="true"
          />
          <div className="relative bg-[var(--surface)] rounded-2xl shadow-xl max-w-md w-full p-6 animate-slide-up motion-reduce:animate-none border border-[var(--border)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[var(--primary-soft)] flex items-center justify-center">
                <Gavel size={18} className="text-[var(--primary)]" />
              </div>
              <h3
                id="resolve-dispute-title"
                className="text-lg font-semibold text-[var(--text)]"
              >
                Resolve dispute
              </h3>
            </div>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              <FileText
                size={12}
                className="inline mr-1 align-text-bottom"
                aria-hidden="true"
              />
              Order{" "}
              <Link
                href={`/orders/${active.order_id}`}
                className="text-[var(--primary)] hover:underline"
              >
                #{active.order_id.slice(0, 8)}
              </Link>{" "}
              — {CATEGORY_LABEL[active.category]}
            </p>

            <div
              className="mb-4 p-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] max-h-32 overflow-y-auto"
            >
              {active.reason}
            </div>

            <label
              htmlFor="resolve-status"
              className="block text-xs font-medium text-[var(--text-muted)] mb-1"
            >
              Status
            </label>
            <Select
              id="resolve-status"
              size="sm"
              value={resolveStatus}
              onChange={(e) =>
                setResolveStatus(e.target.value as DisputeStatus)
              }
              className="mb-3"
            >
              <option value="open">Open</option>
              <option value="reviewing">Reviewing</option>
              <option value="resolved_buyer">Resolved for buyer</option>
              <option value="resolved_seller">Resolved for seller</option>
              <option value="dismissed">Dismissed</option>
            </Select>

            <label
              htmlFor="resolve-notes"
              className="block text-xs font-medium text-[var(--text-muted)] mb-1"
            >
              Resolution notes (optional)
            </label>
            <Textarea
              id="resolve-notes"
              size="sm"
              value={resolveNotes}
              onChange={(e) => setResolveNotes(e.target.value)}
              placeholder="What was decided?"
              rows={4}
              autoGrow
              className="mb-4"
            />

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={closeResolveModal}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-elev)] rounded-lg transition-colors motion-reduce:transition-none border border-[var(--border)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResolve}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] rounded-lg hover:bg-[var(--primary-hover)] transition-colors motion-reduce:transition-none disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

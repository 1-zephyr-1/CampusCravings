"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Ban,
  ShieldCheck,
  ShieldOff,
  Trash2,
  EyeOff,
  Eye,
  Flag,
  CheckCircle2,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useSupabase } from "@/lib/supabase/use-client";
import { creatorActionsTableExists, type CreatorActionType } from "@/lib/supabase/log-creator-action";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { clsx } from "clsx";

interface CreatorActionRow {
  id: string;
  created_at: string;
  actor_email: string | null;
  action_type: CreatorActionType | string;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  metadata: Record<string, unknown> | null;
}

interface ActionMeta {
  label: string;
  icon: LucideIcon;
  chip: string;
}

const ACTION_META: Record<string, ActionMeta> = {
  "user.ban": {
    label: "Banned user",
    icon: Ban,
    chip: "bg-[var(--danger)]/15 text-[var(--danger)]",
  },
  "user.unban": {
    label: "Unbanned user",
    icon: ShieldCheck,
    chip: "bg-[var(--success)]/15 text-[var(--success)]",
  },
  "seller.approve": {
    label: "Approved seller",
    icon: ShieldCheck,
    chip: "bg-[var(--success)]/15 text-[var(--success)]",
  },
  "seller.revoke": {
    label: "Revoked seller",
    icon: ShieldOff,
    chip: "bg-[var(--warning-soft)] text-[var(--warning)]",
  },
  "listing.delete": {
    label: "Deleted listing",
    icon: Trash2,
    chip: "bg-[var(--danger)]/15 text-[var(--danger)]",
  },
  "listing.hide": {
    label: "Hid listing",
    icon: EyeOff,
    chip: "bg-[var(--text-muted)]/15 text-[var(--text-muted)]",
  },
  "listing.unhide": {
    label: "Unhid listing",
    icon: Eye,
    chip: "bg-[var(--success)]/15 text-[var(--success)]",
  },
  "report.reviewed": {
    label: "Reviewed report",
    icon: Flag,
    chip: "bg-[var(--primary-soft)] text-[var(--primary)]",
  },
  "report.resolved": {
    label: "Resolved report",
    icon: CheckCircle2,
    chip: "bg-[var(--success)]/15 text-[var(--success)]",
  },
  "report.dismissed": {
    label: "Dismissed report",
    icon: XCircle,
    chip: "bg-[var(--text-muted)]/15 text-[var(--text-muted)]",
  },
};

function metaFor(actionType: string): ActionMeta {
  return (
    ACTION_META[actionType] ?? {
      label: actionType,
      icon: Activity,
      chip: "bg-[var(--background)] text-[var(--text-muted)] border border-[var(--border)]",
    }
  );
}

export default function ActivityPage() {
  const [tableReady, setTableReady] = useState<boolean | null>(null);
  const [actions, setActions] = useState<CreatorActionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const supabase = useSupabase();

  useEffect(() => {
    let cancelled = false;

    async function probe() {
      const exists = await creatorActionsTableExists(supabase);
      if (cancelled) return;
      setTableReady(exists);

      if (!exists) {
        setLoading(false);
        return;
      }

      const { data, count } = await supabase
        .from("creator_actions")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (cancelled) return;
      setActions((data as CreatorActionRow[]) || []);
      setTotal(count || 0);
      setLoading(false);
    }

    probe();
    return () => {
      cancelled = true;
    };
  }, [page, supabase]);

  if (loading) {
    return (
      <div className="space-y-4" aria-label="Loading activity log" role="status">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Activity</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Every moderation action taken from the creator panel.
        </p>
      </div>

      {tableReady === false ? (
        <EmptyState
          illustration="notifications"
          title="Activity log coming soon"
          message="Once the creator_actions table is provisioned, every ban, approval, and deletion you perform from this panel will appear here for auditing."
        />
      ) : actions.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No activity yet"
          message="No admin actions have been recorded yet. Ban, approve, or delete something to start the log."
        />
      ) : (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
          <ul className="divide-y divide-[var(--border)]/60">
            {actions.map((row) => {
              const meta = metaFor(row.action_type);
              const Icon = meta.icon;
              return (
                <li key={row.id} className="px-5 py-4 flex items-start gap-4">
                  <span
                    aria-hidden="true"
                    className={clsx(
                      "shrink-0 w-9 h-9 rounded-full flex items-center justify-center",
                      meta.chip
                    )}
                  >
                    <Icon size={16} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[var(--text)]">
                        {meta.label}
                      </span>
                      {row.target_label && (
                        <span className="text-sm text-[var(--text-muted)] truncate">
                          &middot; {row.target_label}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      by {row.actor_email || "unknown"} &middot;{" "}
                      {new Date(row.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span
                    aria-hidden="true"
                    className={clsx(
                      "shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full",
                      meta.chip
                    )}
                  >
                    {row.action_type}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {tableReady && total > PAGE_SIZE && (
        <Pagination
          page={page}
          totalPages={Math.ceil(total / PAGE_SIZE)}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
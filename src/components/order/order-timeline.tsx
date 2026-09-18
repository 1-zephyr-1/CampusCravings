"use client";

import { useEffect, useState } from "react";
import {
  PackagePlus,
  Check,
  Sparkles,
  CheckCircle2,
  XCircle,
  Ban,
  MessageSquare,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { clsx } from "clsx";
import { useSupabase } from "@/lib/supabase/use-client";
import { Skeleton } from "@/components/ui/skeleton";

interface OrderTimelineProps {
  orderId: string;
}

export interface OrderEvent {
  id: string;
  order_id: string;
  actor_id: string | null;
  event_type:
    | "placed"
    | "accepted"
    | "declined"
    | "ready"
    | "completed"
    | "cancelled"
    | "note_added"
    | "message_sent";
  metadata: Record<string, unknown>;
  created_at: string;
}

interface SyntheticEvent {
  event_type: OrderEvent["event_type"];
  created_at: string;
  title: string;
  description?: string;
}

const EVENT_META: Record<
  OrderEvent["event_type"],
  { title: string; icon: LucideIcon; tone: string }
> = {
  placed: {
    title: "Order placed",
    icon: PackagePlus,
    tone: "text-[var(--primary)] bg-[var(--primary-soft)]",
  },
  accepted: {
    title: "Accepted by seller",
    icon: Check,
    tone: "text-[var(--success)] bg-[var(--success-soft)]",
  },
  ready: {
    title: "Marked ready for pickup",
    icon: Sparkles,
    tone: "text-[var(--primary)] bg-[var(--primary-soft)]",
  },
  completed: {
    title: "Completed",
    icon: CheckCircle2,
    tone: "text-[var(--success)] bg-[var(--success-soft)]",
  },
  declined: {
    title: "Declined",
    icon: XCircle,
    tone: "text-[var(--danger)] bg-[var(--danger)]/10",
  },
  cancelled: {
    title: "Cancelled",
    icon: Ban,
    tone: "text-[var(--danger)] bg-[var(--danger)]/10",
  },
  message_sent: {
    title: "Message sent",
    icon: MessageSquare,
    tone: "text-[var(--text-muted)] bg-[var(--background)]",
  },
  note_added: {
    title: "Note added",
    icon: FileText,
    tone: "text-[var(--text-muted)] bg-[var(--background)]",
  },
};

/**
 * Derive synthetic timeline events from an order's status when the
 * order_events table is empty (e.g. migration not yet applied, or
 * historical orders predating the timeline feature).
 */
export function deriveSyntheticEvents(
  status: string,
  createdAt: string,
  updatedAt: string,
  declineReason: string | null,
): SyntheticEvent[] {
  const events: SyntheticEvent[] = [
    {
      event_type: "placed",
      created_at: createdAt,
      title: "Order placed",
    },
  ];

  const progressedAt = updatedAt || createdAt;

  switch (status) {
    case "accepted":
      events.push({
        event_type: "accepted",
        created_at: progressedAt,
        title: "Accepted by seller",
      });
      break;
    case "ready":
      events.push(
        {
          event_type: "accepted",
          created_at: progressedAt,
          title: "Accepted by seller",
        },
        {
          event_type: "ready",
          created_at: progressedAt,
          title: "Marked ready for pickup",
        },
      );
      break;
    case "completed":
      events.push(
        {
          event_type: "accepted",
          created_at: progressedAt,
          title: "Accepted by seller",
        },
        {
          event_type: "ready",
          created_at: progressedAt,
          title: "Marked ready for pickup",
        },
        {
          event_type: "completed",
          created_at: progressedAt,
          title: "Completed",
        },
      );
      break;
    case "declined":
      events.push({
        event_type: "declined",
        created_at: progressedAt,
        title: "Declined",
        description: declineReason || undefined,
      });
      break;
    case "cancelled":
      events.push({
        event_type: "cancelled",
        created_at: progressedAt,
        title: "Cancelled",
      });
      break;
    default:
      break;
  }

  return events;
}

export function OrderTimeline({ orderId }: OrderTimelineProps) {
  const supabase = useSupabase();
  const [events, setEvents] = useState<OrderEvent[] | null>(null);
  const [orderStatus, setOrderStatus] = useState<{
    status: string;
    created_at: string;
    updated_at: string;
    decline_reason: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // 1. Fetch the events table (may be empty / may not exist yet).
      const { data: rows, error } = await supabase
        .from("order_events")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

      // Also fetch the order itself so we can synthesize fallback events.
      const { data: orderRow } = await supabase
        .from("orders")
        .select("status, created_at, updated_at, decline_reason")
        .eq("id", orderId)
        .single();

      if (cancelled) return;

      // If the events table doesn't exist yet (migration not applied),
      // Supabase returns a 404-ish error. Fall back to synthetic events.
      if (!error && rows && rows.length > 0) {
        setEvents(rows as OrderEvent[]);
      } else {
        setEvents([]);
      }

      if (orderRow) {
        setOrderStatus({
          status: orderRow.status,
          created_at: orderRow.created_at,
          updated_at: orderRow.updated_at,
          decline_reason: orderRow.decline_reason ?? null,
        });
      }
    }

    load();

    const channel = supabase
      .channel(`order-events-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "order_events",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          const newEvent = payload.new as OrderEvent;
          setEvents((prev) => {
            if (!prev) return [newEvent];
            if (prev.some((e) => e.id === newEvent.id)) return prev;
            return [...prev, newEvent].sort((a, b) =>
              a.created_at.localeCompare(b.created_at),
            );
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [orderId, supabase]);

  // Loading state — events haven't been fetched yet.
  if (events === null) {
    return (
      <div
        className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 mb-4"
        aria-label="Loading timeline"
        role="status"
      >
        <p className="text-sm font-semibold text-[var(--text)] mb-3">
          Activity
        </p>
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton shape="circle" className="w-7 h-7 shrink-0" />
              <div className="flex-1 space-y-1.5 pt-1">
                <Skeleton className="h-3 w-2/5" />
                <Skeleton className="h-3 w-1/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Build the final rendered list: real events if we have any, otherwise
  // fall back to synthetic events derived from the order row.
  const realEvents = events;
  const syntheticEvents: SyntheticEvent[] =
    realEvents.length === 0 && orderStatus
      ? deriveSyntheticEvents(
          orderStatus.status,
          orderStatus.created_at,
          orderStatus.updated_at,
          orderStatus.decline_reason,
        )
      : [];

  const showEmpty = realEvents.length === 0 && syntheticEvents.length === 0;

  return (
    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 mb-4">
      <p className="text-sm font-semibold text-[var(--text)] mb-3">Activity</p>

      {showEmpty ? (
        <p className="text-sm text-[var(--text-muted)] py-4 text-center">
          No activity yet
        </p>
      ) : (
        <ol className="relative">
          {syntheticEvents.length > 0
            ? syntheticEvents.map((ev, idx) => (
                <TimelineRow
                  key={`synthetic-${idx}`}
                  icon={EVENT_META[ev.event_type].icon}
                  title={ev.title}
                  description={ev.description}
                  timestamp={ev.created_at}
                  isLast={idx === syntheticEvents.length - 1}
                  tone={EVENT_META[ev.event_type].tone}
                />
              ))
            : realEvents.map((ev, idx) => {
                const meta = EVENT_META[ev.event_type];
                const description =
                  ev.event_type === "declined" &&
                  typeof ev.metadata?.reason === "string"
                    ? ev.metadata.reason
                    : undefined;
                return (
                  <TimelineRow
                    key={ev.id}
                    icon={meta.icon}
                    title={meta.title}
                    description={description}
                    timestamp={ev.created_at}
                    isLast={idx === realEvents.length - 1}
                    tone={meta.tone}
                  />
                );
              })}
        </ol>
      )}
    </div>
  );
}

interface TimelineRowProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  timestamp: string;
  isLast: boolean;
  tone: string;
}

function TimelineRow({
  icon: Icon,
  title,
  description,
  timestamp,
  isLast,
  tone,
}: TimelineRowProps) {
  return (
    <li className="relative flex items-start gap-3 pb-4 last:pb-0">
      {/* Left rail */}
      <div className="flex flex-col items-center">
        <span
          className={clsx(
            "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
            tone,
          )}
          aria-hidden="true"
        >
          <Icon size={14} />
        </span>
        {!isLast && (
          <span
            aria-hidden="true"
            className="flex-1 w-px bg-[var(--border)] mt-1"
            style={{ minHeight: "1.5rem" }}
          />
        )}
      </div>

      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-sm font-medium text-[var(--text)]">{title}</p>
        {description ? (
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {description}
          </p>
        ) : null}
        <p className="text-xs text-[var(--text-subtle)] mt-0.5">
          {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
        </p>
      </div>
    </li>
  );
}

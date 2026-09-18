"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  BellOff,
  BellRing,
  Check,
  CheckCheck,
  ChevronRight,
  MessageSquare,
  Tag,
} from "lucide-react";
import {
  formatDistanceToNow,
  isSameDay,
  isThisWeek,
  isYesterday,
  startOfDay,
} from "date-fns";
import { clsx } from "clsx";
import type { ComponentType } from "react";

import { useAuth } from "@/components/ui/auth-provider";
import { useSupabase } from "@/lib/supabase/use-client";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionHeader } from "@/components/ui/section-header";
import type { Notification, NotificationType } from "@/types";

const TYPE_ICONS: Record<NotificationType, ComponentType<{ size?: number; className?: string }>> = {
  order: Bell,
  message: MessageSquare,
  promotion: Tag,
  system: BellRing,
};

/**
 * Notification inbox for the current user.
 *
 * Mirrors the realtime pattern from `<TopBar />`: a postgres_changes INSERT
 * subscription filtered by `user_id` so only this user's rows flow through.
 *
 * Read state is optimistic — the UI updates first, then the DB UPDATE is
 * issued. On a Realtime UPDATE we'd reconcile, but in practice reads are
 * driven by user click and we don't need that loop.
 */
export function NotificationsInbox() {
  const { user } = useAuth();
  const supabase = useSupabase();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function fetchInitial() {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, title, message, link, is_read, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (cancelled) return;
      setNotifications((data || []) as Notification[]);
      setLoading(false);
    }

    fetchInitial();

    const channel = supabase
      .channel("notifications-inbox")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user!.id}`,
        },
        (payload) => {
          const incoming = payload.new as Notification;
          setNotifications((prev) => {
            if (prev.some((n) => n.id === incoming.id)) return prev;
            return [incoming, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    supabase.from("notifications").update({ is_read: true }).eq("id", id);
  }

  async function markAllRead() {
    if (unreadCount === 0 || markingAll) return;
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    setMarkingAll(true);
    setNotifications((prev) =>
      prev.map((n) => (unreadIds.includes(n.id) ? { ...n, is_read: true } : n))
    );

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user!.id)
      .eq("is_read", false);

    setMarkingAll(false);

    // If the UPDATE silently no-op'd (e.g. RLS rejected), roll back the
    // optimistic state so the UI doesn't lie about what's read.
    if (error) {
      setNotifications((prev) =>
        prev.map((n) =>
          unreadIds.includes(n.id) ? { ...n, is_read: false } : n
        )
      );
    }
  }

  const groups = useMemo(() => groupByDay(notifications), [notifications]);

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-4">
      <SectionHeader
        title="Notifications"
        rightSlot={
          <button
            type="button"
            onClick={markAllRead}
            disabled={unreadCount === 0 || markingAll}
            aria-label="Mark all notifications as read"
            className={clsx(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
              "border border-[var(--border)] text-[var(--text-muted)]",
              "hover:bg-[var(--bg)] hover:text-[var(--text)] transition-colors",
              "motion-reduce:transition-none",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            )}
          >
            {unreadCount === 0 ? (
              <CheckCheck size={14} aria-hidden="true" />
            ) : (
              <Check size={14} aria-hidden="true" />
            )}
            Mark all read
            {unreadCount > 0 ? (
              <span
                aria-hidden="true"
                className="ml-0.5 min-w-[18px] h-[18px] px-1 bg-[var(--primary)] text-white text-[10px] font-bold rounded-full flex items-center justify-center"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </button>
        }
      />

      {loading ? (
        <div
          className="space-y-3"
          aria-label="Loading notifications"
          role="status"
        >
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title="No notifications yet"
          message="We'll let you know when something happens."
        />
      ) : (
        <div
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label="Notifications"
          className="space-y-6"
        >
          {groups.map(({ label, items }) => (
            <section key={label} aria-labelledby={`group-${label}`}>
              <h3
                id={`group-${label}`}
                className="text-xs font-semibold uppercase tracking-wide text-[var(--text-subtle)] mb-2"
              >
                {label}
              </h3>
              <ul className="space-y-2">
                {items.map((n) => (
                  <NotificationRow
                    key={n.id}
                    notification={n}
                    onActivate={() => {
                      if (!n.is_read) markRead(n.id);
                    }}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

interface NotificationRowProps {
  notification: Notification;
  onActivate: () => void;
}

function NotificationRow({ notification, onActivate }: NotificationRowProps) {
  const Icon = TYPE_ICONS[notification.type] ?? Bell;
  const time = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
  });

  const content = (
    <article
      className={clsx(
        "flex items-start gap-3 p-3 rounded-xl border transition-colors",
        "motion-reduce:transition-none",
        notification.is_read
          ? "bg-[var(--surface)] border-[var(--border)]"
          : "bg-[var(--primary-soft)] border-[var(--primary)]/30"
      )}
    >
      {/* unread dot */}
      <span
        aria-hidden="true"
        className={clsx(
          "mt-1.5 shrink-0 w-2 h-2 rounded-full",
          notification.is_read
            ? "bg-transparent"
            : "bg-[var(--primary)]"
        )}
      />

      <div
        className={clsx(
          "shrink-0 w-9 h-9 rounded-full flex items-center justify-center",
          notification.is_read
            ? "bg-[var(--bg)] text-[var(--text-muted)]"
            : "bg-[var(--surface)] text-[var(--primary)]"
        )}
        aria-hidden="true"
      >
        <Icon size={16} />
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={clsx(
            "text-sm truncate",
            notification.is_read
              ? "font-medium text-[var(--text)]"
              : "font-semibold text-[var(--text)]"
          )}
        >
          {notification.title}
        </p>
        {notification.message ? (
          <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">
            {notification.message}
          </p>
        ) : null}
        <p className="text-[11px] text-[var(--text-subtle)] mt-1">{time}</p>
      </div>

      {notification.link ? (
        <ChevronRight
          size={16}
          className="shrink-0 text-[var(--text-subtle)] mt-2"
          aria-hidden="true"
        />
      ) : null}
    </article>
  );

  if (notification.link) {
    return (
      <li>
        <Link
          href={notification.link}
          onClick={onActivate}
          className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] rounded-xl"
        >
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={onActivate}
        disabled={notification.is_read}
        className={clsx(
          "w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] rounded-xl",
          notification.is_read ? "cursor-default" : "cursor-pointer"
        )}
      >
        {content}
      </button>
    </li>
  );
}

interface Group {
  label: "Today" | "Yesterday" | "This Week" | "Earlier";
  items: Notification[];
}

function groupByDay(items: Notification[]): Group[] {
  const today: Notification[] = [];
  const yesterday: Notification[] = [];
  const thisWeek: Notification[] = [];
  const earlier: Notification[] = [];

  const todayStart = startOfDay(new Date());

  for (const item of items) {
    const d = new Date(item.created_at);
    if (isSameDay(d, todayStart)) {
      today.push(item);
    } else if (isYesterday(d)) {
      yesterday.push(item);
    } else if (isThisWeek(d, { weekStartsOn: 1 })) {
      thisWeek.push(item);
    } else {
      earlier.push(item);
    }
  }

  const groups: Group[] = [];
  if (today.length) groups.push({ label: "Today", items: today });
  if (yesterday.length) groups.push({ label: "Yesterday", items: yesterday });
  if (thisWeek.length) groups.push({ label: "This Week", items: thisWeek });
  if (earlier.length) groups.push({ label: "Earlier", items: earlier });
  return groups;
}

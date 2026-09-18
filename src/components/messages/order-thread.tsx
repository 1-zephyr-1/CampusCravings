"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, MessageSquare } from "lucide-react";
import { useSupabase } from "@/lib/supabase/use-client";
import { useAuth } from "@/components/ui/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { clsx } from "clsx";

import {
  MessageBubble,
  type MessageBubbleMessage,
} from "@/components/messages/message-bubble";
import { MessageComposer } from "@/components/messages/message-composer";

export interface OrderThreadProps {
  orderId: string;
  viewerRole: "customer" | "seller";
  counterpartName: string;
  /** Where the "back" arrow points (parent page). */
  backHref: string;
  /** Optional small footer link (e.g. "Email seller instead" fallback). */
  fallback?: {
    label: string;
    href: string;
  };
}

/**
 * Realtime message thread for a single order.
 *
 * Shared by the buyer-side (`/orders/[orderId]/messages`) and seller-side
 * (`/seller/orders/[orderId]/messages`) pages. The page wrappers fetch
 * order context + authorize, then render this component.
 *
 * Behavior:
 * - Initial fetch: SELECT messages where order_id = {orderId}, ordered by created_at ASC.
 * - Realtime: subscribe to `postgres_changes INSERT` on `messages` filtered by order_id.
 * - Optimistic send: insert into local state with `_status: "sending"`, send to
 *   Supabase, reconcile by id. Realtime echoes are deduped by id.
 * - Failed sends: mark `_status: "failed"`, surface a retry button on the bubble.
 *
 * Authorization is enforced by Postgres RLS (see migration 006_messages.sql),
 * not by this component.
 */
export function OrderThread({
  orderId,
  viewerRole,
  counterpartName,
  backHref,
  fallback,
}: OrderThreadProps) {
  const supabase = useSupabase();
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageBubbleMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const userId = user?.id ?? "";

  // ── Initial fetch ──────────────────────────────────────────────────────
  // `loading` starts true via initial state; we intentionally do NOT reset
  // it back to true inside the effect (that triggers a cascading render).
  // Each `<OrderThread>` is keyed by its `orderId` server-side, so the
  // component remounts rather than re-running for a different order.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, sender_id, body, created_at")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        toast("Couldn't load messages", "error");
        setLoading(false);
        return;
      }
      setMessages((data ?? []) as MessageBubbleMessage[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, supabase]);

  // ── Realtime subscription ──────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`order:${orderId}:messages`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          const row = payload.new as MessageBubbleMessage;
          setMessages((prev) => {
            // Dedupe: optimistic echo (same id from our own insert) or
            // already-appended message (real-time + initial fetch overlap).
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, supabase]);

  // ── Auto-scroll to bottom when new messages arrive ─────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  // ── Send a message ─────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (text: string) => {
      if (!user) return;
      const optimisticId = `optimistic-${crypto.randomUUID()}`;
      const optimistic: MessageBubbleMessage = {
        id: optimisticId,
        sender_id: user.id,
        body: text,
        created_at: new Date().toISOString(),
        _status: "sending",
      };
      setMessages((prev) => [...prev, optimistic]);

      const { data, error } = await supabase
        .from("messages")
        .insert({ order_id: orderId, sender_id: user.id, body: text })
        .select("id, sender_id, body, created_at")
        .single();

      if (error || !data) {
        toast("Failed to send message", "error");
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticId ? { ...m, _status: "failed" } : m
          )
        );
        return;
      }

      // Reconcile: replace optimistic with the real row from Supabase.
      // Realtime will also fire; the dedupe in the subscription handler
      // ensures we don't double-render.
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? (data as MessageBubbleMessage) : m))
      );
    },
    [orderId, supabase, user]
  );

  const handleRetry = useCallback(
    async (message: MessageBubbleMessage) => {
      // Clear the failed flag, then re-send.
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id ? { ...m, _status: "sending" } : m
        )
      );
      const { data, error } = await supabase
        .from("messages")
        .insert({
          order_id: orderId,
          sender_id: message.sender_id,
          body: message.body,
        })
        .select("id, sender_id, body, created_at")
        .single();

      if (error || !data) {
        toast("Failed to send message", "error");
        setMessages((prev) =>
          prev.map((m) =>
            m.id === message.id ? { ...m, _status: "failed" } : m
          )
        );
        return;
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? (data as MessageBubbleMessage) : m))
      );
    },
    [orderId, supabase]
  );

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="max-w-2xl mx-auto px-4 md:px-6 py-4 md:py-6 flex flex-col"
    >
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-3 transition-colors motion-reduce:transition-none"
      >
        <ChevronLeft size={16} aria-hidden="true" />
        Back
      </Link>

      <section
        className={clsx(
          "flex flex-col bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden",
          "h-[calc(100vh-9rem)] min-h-[28rem]"
        )}
        aria-label="Message thread"
      >
        <header
          className="px-4 py-3 border-b flex items-center gap-3"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            aria-hidden="true"
            className="w-10 h-10 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] flex items-center justify-center shrink-0"
          >
            <MessageSquare size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-[var(--text)] truncate">
              Chat with {counterpartName}
            </h1>
            <p className="text-xs text-[var(--text-muted)]">
              {viewerRole === "customer"
                ? "Direct line to the seller for this order"
                : "Direct line to the buyer for this order"}
            </p>
          </div>
        </header>

        <div
          ref={scrollRef}
          role="log"
          aria-live="polite"
          aria-label="Messages"
          className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2"
        >
          {loading ? (
            <div className="space-y-2" aria-label="Loading messages">
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-10 w-1/2 ml-auto" />
              <Skeleton className="h-10 w-3/5" />
            </div>
          ) : messages.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No messages yet"
              message="Say hi to get the conversation started."
            />
          ) : (
            messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                isMine={m.sender_id === userId}
                currentUserId={userId}
                onRetry={handleRetry}
              />
            ))
          )}
        </div>

        <MessageComposer onSend={handleSend} disabled={!user} />
      </section>

      {fallback ? (
        <p className="mt-3 text-center text-xs text-[var(--text-subtle)]">
          Offline?{" "}
          <a
            href={fallback.href}
            className="underline hover:text-[var(--text-muted)]"
          >
            {fallback.label}
          </a>
        </p>
      ) : null}
    </main>
  );
}

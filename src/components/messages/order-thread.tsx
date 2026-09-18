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

/** How long the "typing…" indicator stays visible after the last keystroke. */
const TYPING_TIMEOUT_MS = 4_000;

/** Signed-URL lifetime (seconds). 5 minutes is plenty for a chat view. */
const SIGNED_URL_TTL_SECONDS = 60 * 5;

import {
  MessageBubble,
  type MessageAttachment,
  type MessageBubbleMessage,
} from "@/components/messages/message-bubble";
import {
  MessageComposer,
  type ComposerAttachment,
} from "@/components/messages/message-composer";

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
 * - Initial fetch: SELECT messages + their attachments where order_id = {orderId}.
 * - Attachments are fetched separately and joined client-side; storage paths
 *   are converted to signed URLs for the current viewer (5 min lifetime).
 * - Realtime: subscribe to `postgres_changes INSERT` on `messages` filtered by
 *   order_id. New attachments arrive separately (the parent INSERT brings
 *   empty attachments; we re-resolve them on the fly so we don't need a
 *   second realtime subscription).
 * - Optimistic send: insert into local state with `_status: "sending"`,
 *   upload each attachment to storage, insert into `message_attachments`,
 *   reconcile by id. Realtime echoes are deduped by id.
 * - Failed sends: mark `_status: "failed"`, surface a retry button on the bubble.
 *
 * Authorization is enforced by Postgres RLS (see migrations 006_messages.sql
 * and 010_message_attachments.sql), not by this component.
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

  // ── Load a single message's attachments as signed URLs ──────────────
  // We hold off on joining attachments to messages during the initial
  // fetch so the messages render ASAP (text first, images shortly after).
  const loadAttachments = useCallback(
    async (messageIds: string[]): Promise<Map<string, MessageAttachment[]>> => {
      const out = new Map<string, MessageAttachment[]>();
      if (messageIds.length === 0) return out;
      const { data: rows, error } = await supabase
        .from("message_attachments")
        .select("id, message_id, storage_path, mime_type, size_bytes")
        .in("message_id", messageIds);
      if (error || !rows) return out;
      // Mint signed URLs in one call per attachment. For a typical chat,
      // most messages have 0–1 attachments, so this is cheap.
      for (const row of rows) {
        const { data: urlData } = await supabase.storage
          .from("message-attachments")
          .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);
        const signedUrl = urlData?.signedUrl ?? "";
        const list = out.get(row.message_id) ?? [];
        list.push({
          id: row.id,
          storage_path: row.storage_path,
          signedUrl,
          mime_type: row.mime_type,
          size_bytes: row.size_bytes,
        });
        out.set(row.message_id, list);
      }
      return out;
    },
    [supabase],
  );

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
        .select("id, sender_id, body, created_at, read_at")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        toast("Couldn't load messages", "error");
        setLoading(false);
        return;
      }
      const rows = (data ?? []) as MessageBubbleMessage[];
      setMessages(rows);
      setLoading(false);

      // Lazily hydrate attachments. We don't block rendering on them.
      const ids = rows.map((r) => r.id);
      const map = await loadAttachments(ids);
      if (cancelled) return;
      setMessages((prev) =>
        prev.map((m) => {
          const atts = map.get(m.id);
          return atts ? { ...m, attachments: atts } : m;
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, supabase, loadAttachments]);

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
        async (payload) => {
          const row = payload.new as MessageBubbleMessage;
          // Dedupe: optimistic echo (same id from our own insert) or
          // already-appended message (real-time + initial fetch overlap).
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });
          // Hydrate attachments (if any) for this new message.
          const map = await loadAttachments([row.id]);
          if (map.size === 0) return;
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== row.id) return m;
              const atts = map.get(m.id);
              return atts ? { ...m, attachments: atts } : m;
            }),
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          const row = payload.new as MessageBubbleMessage;
          setMessages((prev) =>
            prev.map((m) => (m.id === row.id ? { ...m, ...row } : m))
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, supabase, loadAttachments]);

  // ── Typing indicator (ephemeral broadcast) ────────────────────────────
  // The composer fires `onTyping`; we forward to a presence/broadcast
  // channel. Incoming pings from the counterpart set `counterpartTyping`.
  const [counterpartTyping, setCounterpartTyping] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`order:${orderId}:typing`, {
      config: { broadcast: { self: false, ack: false } },
    });
    channel
      .on("broadcast", { event: "typing" }, (payload) => {
        // Ignore our own echoes (self: false already filters, but be defensive).
        if (payload?.payload?.userId === userId) return;
        setCounterpartTyping(true);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(
          () => setCounterpartTyping(false),
          TYPING_TIMEOUT_MS
        );
      })
      .subscribe();
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [orderId, supabase, userId]);

  const lastTypingBroadcastRef = useRef<number | null>(null);
  const broadcastTyping = useCallback(() => {
    if (!userId) return;
    // Rate-limit: only fire a broadcast at most once every ~2s while the
    // user is typing. The composer fires onTyping() on every keystroke;
    // without throttling we'd flood the channel.
    const now = Date.now();
    if (
      lastTypingBroadcastRef.current &&
      now - lastTypingBroadcastRef.current < 2_000
    ) {
      return;
    }
    lastTypingBroadcastRef.current = now;
    const channel = supabase.channel(`order:${orderId}:typing`);
    void channel.send({
      type: "broadcast",
      event: "typing",
      payload: { userId },
    });
  }, [orderId, supabase, userId]);

  // ── Mark unread incoming messages as read on mount and on incoming rows ──
  // Run once after the initial fetch lands AND whenever a new message arrives
  // from the counterpart (so we mark it read the moment it shows up).
  const markRead = useCallback(async () => {
    if (!userId) return;
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("order_id", orderId)
      .neq("sender_id", userId)
      .is("read_at", null);
  }, [orderId, supabase, userId]);

  // Mark on initial load.
  const initialReadFiredRef = useRef(false);
  useEffect(() => {
    if (loading || initialReadFiredRef.current) return;
    initialReadFiredRef.current = true;
    void markRead();
  }, [loading, markRead]);

  // Mark whenever a new incoming message lands.
  useEffect(() => {
    if (loading) return;
    const last = messages[messages.length - 1];
    if (!last) return;
    if (last.sender_id === userId) return; // our own message
    if (last.read_at) return; // already read
    void markRead();
  }, [messages, loading, userId, markRead]);

  // ── Auto-scroll to bottom when new messages arrive ─────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  // ── Send a message (text + optional image attachments) ────────────────
  const handleSend = useCallback(
    async (text: string, attachments: ComposerAttachment[]) => {
      if (!user) return;
      const optimisticId = `optimistic-${crypto.randomUUID()}`;
      const optimisticAttachments: MessageAttachment[] = attachments.map(
        (a) => ({
          id: a.localId,
          storage_path: "",
          signedUrl: a.previewUrl,
          mime_type: a.file.type,
          size_bytes: a.file.size,
        }),
      );
      const optimistic: MessageBubbleMessage = {
        id: optimisticId,
        sender_id: user.id,
        body: text,
        created_at: new Date().toISOString(),
        _status: "sending",
        attachments:
          optimisticAttachments.length > 0 ? optimisticAttachments : undefined,
      };
      setMessages((prev) => [...prev, optimistic]);

      const { data, error } = await supabase
        .from("messages")
        .insert({
          order_id: orderId,
          sender_id: user.id,
          body: text.length > 0 ? text : null,
        })
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

      const realMessageId = (data as { id: string }).id;

      // Upload attachments serially (not parallel) so a single failure on
      // a later file doesn't strand earlier ones in storage. We could
      // parallelize but the cost/benefit doesn't justify the complexity
      // for max-4 images. The DB rows are inserted only after storage
      // succeeds, so we never record orphaned DB rows.
      const uploaded: MessageAttachment[] = [];
      for (const a of attachments) {
        const safeName = a.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${orderId}/${realMessageId}/${a.localId}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("message-attachments")
          .upload(path, a.file, { upsert: false });
        if (upErr) {
          toast(`Couldn't upload ${a.file.name}`, "error");
          // Clean up already-uploaded files so we don't leak storage.
          for (const prior of uploaded) {
            await supabase.storage
              .from("message-attachments")
              .remove([prior.storage_path]);
          }
          setMessages((prev) =>
            prev.map((m) =>
              m.id === optimisticId ? { ...m, _status: "failed" } : m
            )
          );
          return;
        }
        const { data: row, error: insErr } = await supabase
          .from("message_attachments")
          .insert({
            message_id: realMessageId,
            order_id: orderId,
            storage_path: path,
            mime_type: a.file.type,
            size_bytes: a.file.size,
          })
          .select("id, storage_path, mime_type, size_bytes")
          .single();
        if (insErr || !row) {
          // Roll back the file we just uploaded.
          await supabase.storage
            .from("message-attachments")
            .remove([path]);
          for (const prior of uploaded) {
            await supabase.storage
              .from("message-attachments")
              .remove([prior.storage_path]);
          }
          toast(`Couldn't save ${a.file.name}`, "error");
          setMessages((prev) =>
            prev.map((m) =>
              m.id === optimisticId ? { ...m, _status: "failed" } : m
            )
          );
          return;
        }
        const { data: urlData } = await supabase.storage
          .from("message-attachments")
          .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);
        uploaded.push({
          id: row.id,
          storage_path: row.storage_path,
          signedUrl: urlData?.signedUrl ?? "",
          mime_type: row.mime_type,
          size_bytes: row.size_bytes,
        });
      }

      // Reconcile: replace optimistic with the real row + real attachments.
      // Realtime will also fire; the dedupe in the subscription handler
      // ensures we don't double-render.
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticId
            ? ({
                ...(data as MessageBubbleMessage),
                attachments: uploaded.length > 0 ? uploaded : undefined,
              } as MessageBubbleMessage)
            : m
        )
      );
      // Revoke local preview URLs — we now have signed URLs.
      attachments.forEach((a) => URL.revokeObjectURL(a.previewUrl));
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
          body: message.body && message.body.length > 0 ? message.body : null,
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
              {counterpartTyping ? (
                <span>
                  <span className="sr-only">{counterpartName} is typing</span>
                  typing…
                </span>
              ) : viewerRole === "customer" ? (
                "Direct line to the seller for this order"
              ) : (
                "Direct line to the buyer for this order"
              )}
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

          {counterpartTyping ? (
            <div
              className="flex justify-start"
              role="status"
              aria-live="polite"
              aria-label={`${counterpartName} is typing`}
            >
              <div className="rounded-2xl rounded-bl-md px-3.5 py-2 bg-[var(--surface)] border border-[var(--border)] flex items-center gap-1">
                <span className="sr-only">{counterpartName} is typing</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:-0.3s] motion-reduce:animate-none" />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:-0.15s] motion-reduce:animate-none" />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce motion-reduce:animate-none" />
              </div>
            </div>
          ) : null}
        </div>

        <MessageComposer
          onSend={handleSend}
          disabled={!user}
          onTyping={broadcastTyping}
        />
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

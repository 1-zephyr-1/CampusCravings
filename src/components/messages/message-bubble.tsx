"use client";

import { Check, AlertCircle, RotateCw } from "lucide-react";
import { clsx } from "clsx";

export interface MessageBubbleMessage {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  /** In-memory only. Not stored on the DB row. */
  _status?: "sending" | "failed";
}

interface MessageBubbleProps {
  message: MessageBubbleMessage;
  isMine: boolean;
  /** Current user id — used for retry button when a send fails. */
  currentUserId: string;
  /** Optional retry callback — wired up by the parent when a send fails. */
  onRetry?: (message: MessageBubbleMessage) => void;
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

/**
 * A single message bubble in the order thread.
 *
 * "Mine" bubbles are right-aligned with the primary background.
 * "Theirs" are left-aligned with the surface background.
 * Optimistic sends show a tiny spinner; failed sends show a retry button.
 */
export function MessageBubble({
  message,
  isMine,
  currentUserId,
  onRetry,
}: MessageBubbleProps) {
  const failed = message._status === "failed";
  const sending = message._status === "sending";

  return (
    <div
      className={clsx(
        "flex w-full",
        isMine ? "justify-end" : "justify-start"
      )}
      role="listitem"
    >
      <div
        className={clsx(
          "max-w-[78%] md:max-w-[68%]",
          "rounded-2xl px-3.5 py-2",
          "text-sm leading-relaxed",
          "break-words whitespace-pre-wrap",
          isMine
            ? "bg-[var(--primary)] text-white rounded-br-md"
            : "bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] rounded-bl-md"
        )}
      >
        <div>{message.body}</div>
        <div
          className={clsx(
            "mt-1 flex items-center gap-1 text-[10px]",
            isMine ? "text-white/70 justify-end" : "text-[var(--text-subtle)]"
          )}
        >
          <time dateTime={message.created_at} className="tabular-nums">
            {formatTime(message.created_at)}
          </time>
          {isMine && sending && (
            <span
              aria-label="Sending"
              className="inline-block w-2 h-2 rounded-full bg-white/70 animate-pulse motion-reduce:animate-none"
            />
          )}
          {isMine && !sending && !failed && (
            <Check size={10} aria-hidden="true" className="opacity-80" />
          )}
          {failed && (
            <>
              <AlertCircle size={10} aria-hidden="true" />
              <span>Failed</span>
              {onRetry && currentUserId === message.sender_id && (
                <button
                  type="button"
                  onClick={() => onRetry(message)}
                  aria-label="Retry sending message"
                  className="ml-1 inline-flex items-center gap-0.5 underline hover:no-underline"
                >
                  <RotateCw size={10} aria-hidden="true" />
                  Retry
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

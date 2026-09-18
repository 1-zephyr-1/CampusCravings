"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { clsx } from "clsx";

interface MessageComposerProps {
  onSend: (text: string) => void | Promise<void>;
  /** Optional: show a disabled state while the parent is mid-send. */
  disabled?: boolean;
  /** Optional placeholder override. */
  placeholder?: string;
}

/**
 * Composer for the order message thread.
 *
 * - Enter to send.
 * - Shift+Enter inserts a newline.
 * - Disabled while empty or while a parent-level send is in flight.
 * - Trims whitespace; rejects empty payloads (the DB has a
 *   `char_length(body) > 0` CHECK constraint).
 */
export function MessageComposer({
  onSend,
  disabled = false,
  placeholder = "Type a message…",
}: MessageComposerProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea up to a sane max height.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    setText("");
    await onSend(trimmed);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  }

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
      className="border-t p-3 md:p-4 flex items-end gap-2"
      style={{ borderColor: "var(--border)" }}
      aria-label="Send a message"
    >
      <label htmlFor="message-input" className="sr-only">
        Message
      </label>
      <textarea
        id="message-input"
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        maxLength={2000}
        aria-label="Message body"
        className={clsx(
          "flex-1 resize-none rounded-xl border px-3 py-2 text-sm",
          "bg-[var(--background)] text-[var(--text)]",
          "border-[var(--border)]",
          "focus:outline-none focus:border-[var(--primary)]",
          "placeholder:text-[var(--text-subtle)]",
          "disabled:opacity-60"
        )}
      />
      <button
        type="submit"
        disabled={!canSend}
        aria-label="Send message"
        className={clsx(
          "shrink-0 inline-flex items-center justify-center",
          "w-10 h-10 rounded-full",
          "bg-[var(--primary)] text-white",
          "hover:bg-[var(--primary-hover)]",
          "transition-colors motion-reduce:transition-none",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <Send size={16} aria-hidden="true" />
      </button>
    </form>
  );
}

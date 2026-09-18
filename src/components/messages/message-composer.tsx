"use client";

import {
  useState,
  useRef,
  useEffect,
  type KeyboardEvent,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { Send, Paperclip, X, ImagePlus } from "lucide-react";
import { clsx } from "clsx";

export interface ComposerAttachment {
  /** Local-only id for React keys + remove buttons. */
  localId: string;
  file: File;
  /** Optional preview URL for image thumbnails. Revoked on unmount. */
  previewUrl: string;
}

/** 5 MB per file — matches the storage RLS check constraint. */
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 4;

interface MessageComposerProps {
  onSend: (
    text: string,
    attachments: ComposerAttachment[],
  ) => void | Promise<void>;
  /** Optional: show a disabled state while the parent is mid-send. */
  disabled?: boolean;
  /** Optional placeholder override. */
  placeholder?: string;
  /**
   * Fires when the user types (after the first character). Use to broadcast
   * a typing-indicator ping to the other party. Not fired on programmatic
   * value changes.
   */
  onTyping?: () => void;
}

/**
 * Composer for the order message thread.
 *
 * - Enter to send. Shift+Enter inserts a newline.
 * - Image attachments (up to 4 files, 5 MB each). Click-to-pick or drag/drop.
 * - Send button is disabled when neither text nor attachments are present.
 * - Trims whitespace; the DB has a CHECK constraint but image-only messages
 *   are allowed (body is nullable after migration 010).
 */
export function MessageComposer({
  onSend,
  disabled = false,
  placeholder = "Type a message…",
  onTyping,
}: MessageComposerProps) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-grow textarea up to a sane max height.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  // Revoke object URLs on unmount or when an attachment is removed.
  useEffect(() => {
    return () => {
      attachments.forEach((a) => URL.revokeObjectURL(a.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function removeAttachment(localId: string) {
    setAttachments((prev) => {
      const next = prev.filter((a) => a.localId !== localId);
      const removed = prev.find((a) => a.localId === localId);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  }

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const incoming = Array.from(files);
    setAttachments((prev) => {
      const room = Math.max(0, MAX_FILES - prev.length);
      const accepted: ComposerAttachment[] = [];
      for (const file of incoming) {
        if (accepted.length >= room) break;
        if (!file.type.startsWith("image/")) continue;
        if (file.size > MAX_BYTES) continue;
        accepted.push({
          localId: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
        });
      }
      return [...prev, ...accepted];
    });
  }

  function handleFileInput(e: ChangeEvent<HTMLInputElement>) {
    addFiles(e.target.files);
    // Reset so picking the same file twice fires a change event.
    e.target.value = "";
  }

  function handleDrop(e: DragEvent<HTMLFormElement>) {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    addFiles(e.dataTransfer.files);
  }

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;
    if (disabled) return;
    setText("");
    // Detach attachments: send a snapshot so the parent owns them after send.
    const snapshot = attachments.slice();
    setAttachments([]);
    await onSend(trimmed, snapshot);
    // Snapshot previewUrls are revoked by the parent after upload completes
    // (or by unmount cleanup if the user navigates away mid-send).
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  }

  const canSend =
    (text.trim().length > 0 || attachments.length > 0) && !disabled;

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    if (e.target.value.length > 0) {
      onTyping?.();
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
      className="border-t p-3 md:p-4 flex flex-col gap-2"
      style={{ borderColor: "var(--border)" }}
      aria-label="Send a message"
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {attachments.length > 0 && (
        <ul
          aria-label="Attached images"
          className="flex flex-wrap gap-2"
        >
          {attachments.map((a) => (
            <li
              key={a.localId}
              className="relative w-16 h-16 rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--background)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.previewUrl}
                alt=""
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeAttachment(a.localId)}
                aria-label="Remove attached image"
                className="absolute top-0.5 right-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-black/70 text-white hover:bg-black/90"
              >
                <X size={12} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div
        className={clsx(
          "flex items-end gap-2 rounded-xl",
          dragOver && "ring-2 ring-[var(--primary)]/40 ring-offset-1",
        )}
      >
        <input
          ref={fileInputRef}
          id="message-attachments"
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInput}
          className="sr-only"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || attachments.length >= MAX_FILES}
          aria-label="Attach image"
          title={
            attachments.length >= MAX_FILES
              ? `Up to ${MAX_FILES} images`
              : "Attach an image (up to 5 MB each)"
          }
          className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--primary)]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors motion-reduce:transition-none"
        >
          <Paperclip size={16} aria-hidden="true" />
        </button>
        <label htmlFor="message-input" className="sr-only">
          Message
        </label>
        <textarea
          id="message-input"
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={
            dragOver ? "Drop to attach" : attachments.length > 0 ? "Add a caption (optional)" : placeholder
          }
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
          aria-label={attachments.length > 0 ? "Send message with image" : "Send message"}
          className={clsx(
            "shrink-0 inline-flex items-center justify-center",
            "w-10 h-10 rounded-full",
            "bg-[var(--primary)] text-white",
            "hover:bg-[var(--primary-hover)]",
            "transition-colors motion-reduce:transition-none",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {attachments.length > 0 ? (
            <ImagePlus size={16} aria-hidden="true" />
          ) : (
            <Send size={16} aria-hidden="true" />
          )}
        </button>
      </div>
      {dragOver && (
        <p className="text-xs text-[var(--text-muted)] text-center" role="status">
          Drop to attach
        </p>
      )}
    </form>
  );
}

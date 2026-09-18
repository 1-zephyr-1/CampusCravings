"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { clsx } from "clsx";
import { toast } from "@/components/ui/toast";

interface ShareButtonProps {
  /** Title passed to navigator.share / used in aria-label. */
  title: string;
  /** Body text passed to navigator.share. */
  text: string;
  /** Absolute URL to share. If omitted, `path` is joined with window.location.origin. */
  url?: string;
  /** Path joined with window.location.origin when `url` is not provided (e.g. "/orders/123"). */
  path?: string;
  /** Visual variant. Default shows icon + label; `icon-only` collapses the label. */
  variant?: "default" | "icon-only";
  /** Optional extra classes to merge into the button. */
  className?: string;
}

function resolveUrl(url?: string, path?: string): string {
  if (url) return url;
  if (typeof window !== "undefined" && path) {
    return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
  }
  return path ?? "";
}

export function ShareButton({
  title,
  text,
  url,
  path,
  variant = "default",
  className,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shareUrl = resolveUrl(url, path);

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url: shareUrl });
        return;
      } catch (err) {
        // User cancellation (AbortError) is expected — fall through silently.
        // Any other share failure also falls through to the clipboard path.
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }

    // Fallback: clipboard copy with toast confirmation.
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        toast("Link copied to clipboard", "success");
        window.setTimeout(() => setCopied(false), 2000);
        return;
      } catch {
        // Fall through to a generic error toast.
      }
    }

    toast("Couldn't share right now. Please copy the link manually.", "error");
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={`Share ${title}`}
      className={clsx(
        "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--text-muted)] border border-[var(--border)] rounded-lg hover:border-[var(--primary)]/30 hover:text-[var(--primary)] transition-colors motion-reduce:transition-none",
        variant === "icon-only" && "px-2",
        className
      )}
    >
      {copied ? (
        <Check size={variant === "icon-only" ? 14 : 12} aria-hidden="true" />
      ) : (
        <Share2 size={variant === "icon-only" ? 14 : 12} aria-hidden="true" />
      )}
      {variant !== "icon-only" && <span>{copied ? "Copied" : "Share"}</span>}
      {/* Screen-reader announcement when copy succeeds. */}
      <span className="sr-only" aria-live="polite">
        {copied ? "Link copied to clipboard" : ""}
      </span>
    </button>
  );
}

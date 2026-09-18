"use client";

import { useState, useMemo } from "react";
import { Clock, ChevronDown, X } from "lucide-react";
import { clsx } from "clsx";

interface PickupTimePickerProps {
  value: string;
  onChange: (iso: string) => void;
  /** Minimum minutes from now (default 30). */
  minMinutes?: number;
  /** Maximum days from now (default 7). */
  maxDays?: number;
  /** Optional className for the wrapper. */
  className?: string;
  /** Optional id for the input. */
  id?: string;
  /** Label for screen readers / placeholder context. */
  label?: string;
}

/**
 * Native `<input type="datetime-local">`-based picker wrapped with proper
 * min/max constraints (now + 30 min, now + 7 days by default) and a quick
 * preset row ("In 1 hour", "Tonight 7 PM", "Tomorrow lunch").
 *
 * Why native: `<input type="datetime-local">` works without any third-party
 * dep, gives a real picker UI on all modern browsers, and degrades to a
 * plain text input on older Safari.
 *
 * The component stores an ISO string internally and emits an ISO string on
 * change so callers don't have to parse the local-formatted value.
 */
export function PickupTimePicker({
  value,
  onChange,
  minMinutes = 30,
  maxDays = 7,
  className,
  id = "pickup-time",
  label = "Pickup time",
}: PickupTimePickerProps) {
  // Convert ISO → "YYYY-MM-DDTHH:mm" (the format datetime-local expects).
  function toLocalInput(iso: string): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  const minDate = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + minMinutes);
    return d;
  }, [minMinutes]);

  const maxDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + maxDays);
    return d;
  }, [maxDays]);

  const [open, setOpen] = useState(false);

  function applyPreset(preset: "now" | "in1h" | "tonight7" | "tomorrowLunch") {
    const d = new Date();
    switch (preset) {
      case "now":
        d.setMinutes(d.getMinutes() + minMinutes);
        break;
      case "in1h":
        d.setHours(d.getHours() + 1);
        d.setMinutes(0, 0, 0);
        break;
      case "tonight7":
        d.setHours(19, 0, 0, 0);
        if (d.getTime() < minDate.getTime()) {
          // Past 7 PM? Push to tomorrow.
          d.setDate(d.getDate() + 1);
        }
        break;
      case "tomorrowLunch":
        d.setDate(d.getDate() + 1);
        d.setHours(13, 0, 0, 0);
        break;
    }
    if (d.getTime() > maxDate.getTime()) {
      d.setTime(maxDate.getTime());
    }
    if (d.getTime() < minDate.getTime()) {
      d.setTime(minDate.getTime());
    }
    onChange(d.toISOString());
    setOpen(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const local = e.target.value;
    if (!local) {
      onChange("");
      return;
    }
    const parsed = new Date(local);
    if (Number.isNaN(parsed.getTime())) return;
    onChange(parsed.toISOString());
  }

  const displayValue = value
    ? new Date(value).toLocaleString(undefined, {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  return (
    <div className={clsx("relative", className)}>
      <label
        htmlFor={id}
        className="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1 mb-1"
      >
        <Clock size={12} aria-hidden="true" />
        {label}
      </label>

      {/* Display field — clicking opens the picker. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        className={clsx(
          "w-full flex items-center justify-between gap-2 px-3 py-2 bg-[var(--background)] border rounded-lg text-sm text-left transition-colors motion-reduce:transition-none",
          open
            ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/30"
            : "border-[var(--border)] hover:border-[var(--primary)]/50",
          value ? "text-[var(--text)]" : "text-[var(--text-subtle)]"
        )}
      >
        <span className="truncate">
          {displayValue || "Choose pickup time…"}
        </span>
        {value ? (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Clear pickup time"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="p-0.5 rounded hover:bg-[var(--border)]"
          >
            <X size={14} aria-hidden="true" />
          </span>
        ) : (
          <ChevronDown
            size={14}
            className={clsx(
              "transition-transform motion-reduce:transition-none",
              open && "rotate-180"
            )}
            aria-hidden="true"
          />
        )}
      </button>

      {open && (
        <div
          id={`${id}-panel`}
          role="dialog"
          aria-label={`${label} picker`}
          className="absolute z-30 mt-1 w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg p-3 space-y-3 animate-fade-in"
        >
          {/* Quick presets */}
          <div>
            <p className="text-[11px] uppercase tracking-wide font-semibold text-[var(--text-subtle)] mb-1.5">
              Quick pick
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <PresetButton onClick={() => applyPreset("in1h")}>
                In 1 hour
              </PresetButton>
              <PresetButton onClick={() => applyPreset("tonight7")}>
                Tonight 7 PM
              </PresetButton>
              <PresetButton onClick={() => applyPreset("tomorrowLunch")}>
                Tomorrow 1 PM
              </PresetButton>
              <PresetButton onClick={() => applyPreset("now")}>
                As soon as possible
              </PresetButton>
            </div>
          </div>

          {/* Custom date+time */}
          <div>
            <label
              htmlFor={id}
              className="text-[11px] uppercase tracking-wide font-semibold text-[var(--text-subtle)] block mb-1"
            >
              Or pick exact time
            </label>
            <input
              id={id}
              type="datetime-local"
              value={toLocalInput(value)}
              min={toLocalInput(minDate.toISOString())}
              max={toLocalInput(maxDate.toISOString())}
              onChange={handleInputChange}
              className="w-full px-2.5 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
            />
            <p className="mt-1 text-[11px] text-[var(--text-subtle)]">
              Earliest {minDate.toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              })}{" "}
              · Latest {maxDate.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function PresetButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2.5 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-xs font-medium text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors motion-reduce:transition-none"
    >
      {children}
    </button>
  );
}
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/ui/auth-provider";
import { useSupabase } from "@/lib/supabase/use-client";
import { SectionHeader } from "@/components/ui/section-header";
import { toast } from "@/components/ui/toast";
import { NotificationPrefs } from "@/components/notifications/notification-prefs";
import { DIETARY_TAGS } from "@/lib/constants";
import {
  ArrowLeft,
  Check,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Sun,
  User as UserIcon,
  Utensils,
} from "lucide-react";
import { clsx } from "clsx";

const DIET_KEY = "campuscravings:dietary-prefs";

/** Safely read JSON from localStorage with a fallback. */
function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

export default function SettingsPage() {
  const router = useRouter();
  const { profile, loading } = useAuth();
  const supabase = useSupabase();
  const { theme, setTheme, resolvedTheme } = useTheme();

  // localStorage-backed state — initialized to defaults for SSR consistency.
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage after mount.
  useEffect(() => {
    setDietaryPrefs(readJson<string[]>(DIET_KEY, []));
    setHydrated(true);
  }, []);

  function toggleDietaryTag(tag: string) {
    setDietaryPrefs((prev) => {
      const next = prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag];
      writeJson(DIET_KEY, next);
      toast("Saved", "success");
      return next;
    });
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  // Use resolvedTheme for the "current" indicator (handles the "system" case).
  const effectiveTheme = theme === "system" ? resolvedTheme : theme;

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-4">
      <Link
        href="/profile"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] mb-3 transition-colors motion-reduce:transition-none"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Back to profile
      </Link>

      <h1 className="text-xl font-bold text-[var(--text)] mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Appearance */}
        <section
          aria-labelledby="appearance-heading"
          className="p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)]"
        >
          <SectionHeader
            id="appearance-heading"
            title="Appearance"
            subtitle="Choose how CampusCravings looks on this device."
          />
          <div
            role="radiogroup"
            aria-label="Theme"
            className="grid grid-cols-3 gap-2"
          >
            {[
              { value: "light", label: "Light", icon: Sun },
              { value: "dark", label: "Dark", icon: Moon },
              { value: "system", label: "System", icon: Monitor },
            ].map(({ value, label, icon: Icon }) => {
              const selected = theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setTheme(value)}
                  className={clsx(
                    "relative flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border text-xs font-medium transition-colors motion-reduce:transition-none",
                    selected
                      ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                      : "border-[var(--border)] bg-[var(--background)] text-[var(--text-muted)] hover:border-[var(--primary)]/30 hover:text-[var(--text)]"
                  )}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{label}</span>
                  {selected ? (
                    <span
                      aria-hidden="true"
                      className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[var(--primary)] text-white flex items-center justify-center"
                    >
                      <Check size={10} strokeWidth={3} />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-[var(--text-subtle)]">
            Currently: <span className="font-medium capitalize">{effectiveTheme ?? theme}</span>
          </p>
        </section>

        {/* Notifications */}
        <NotificationPrefs />

        {/* Dietary preferences */}
        <section
          aria-labelledby="dietary-heading"
          className="p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)]"
        >
          <SectionHeader
            id="dietary-heading"
            title="Dietary preferences"
            subtitle="We'll use these to highlight matching items in your feed."
          />
          <div className="flex flex-wrap gap-2">
            {DIETARY_TAGS.map((tag) => {
              const selected = dietaryPrefs.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleDietaryTag(tag)}
                  className={clsx(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors motion-reduce:transition-none",
                    selected
                      ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                      : "bg-[var(--background)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--primary)]/30 hover:text-[var(--text)]"
                  )}
                >
                  <Utensils size={12} aria-hidden="true" />
                  {tag}
                  {selected ? (
                    <Check
                      size={12}
                      strokeWidth={3}
                      aria-hidden="true"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-[var(--text-subtle)]">
            {hydrated && dietaryPrefs.length > 0
              ? `${dietaryPrefs.length} selected`
              : "None selected yet"}
          </p>
        </section>

        {/* Account */}
        <section
          aria-labelledby="account-heading"
          className="p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)]"
        >
          <SectionHeader
            id="account-heading"
            title="Account"
            subtitle="Manage your profile and session."
          />
          {loading ? (
            <div className="space-y-2">
              <div className="h-4 w-1/2 rounded bg-[var(--background)]" />
              <div className="h-3 w-1/3 rounded bg-[var(--background)]" />
            </div>
          ) : !profile ? (
            <p className="text-sm text-[var(--text-muted)]">
              You&apos;re not signed in.
            </p>
          ) : (
            <>
              <dl className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <dt className="sr-only">Name</dt>
                  <UserIcon
                    size={14}
                    className="text-[var(--text-muted)] mt-0.5"
                    aria-hidden="true"
                  />
                  <dd className="text-[var(--text)]">
                    {profile.full_name || "—"}
                  </dd>
                </div>
                <div className="flex items-start gap-2">
                  <dt className="sr-only">Email</dt>
                  <Mail
                    size={14}
                    className="text-[var(--text-muted)] mt-0.5"
                    aria-hidden="true"
                  />
                  <dd className="text-[var(--text-muted)] break-all">
                    {profile.email}
                  </dd>
                </div>
                <div className="flex items-start gap-2">
                  <dt className="sr-only">Role</dt>
                  <span
                    className={clsx(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize",
                      profile.role === "seller"
                        ? "bg-[var(--warning-soft)] text-[var(--warning)]"
                        : profile.role === "creator"
                          ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                          : "bg-[var(--background)] text-[var(--text-muted)]"
                    )}
                  >
                    {profile.role}
                  </span>
                </div>
              </dl>

              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <Link
                  href="/profile/edit"
                  className="inline-flex items-center justify-center gap-1.5 flex-1 px-4 py-2 rounded-lg text-sm font-medium border border-[var(--border)] bg-[var(--background)] text-[var(--text)] hover:border-[var(--primary)]/30 transition-colors motion-reduce:transition-none"
                >
                  Edit profile
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center justify-center gap-1.5 flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/15 transition-colors motion-reduce:transition-none"
                >
                  <LogOut size={14} aria-hidden="true" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

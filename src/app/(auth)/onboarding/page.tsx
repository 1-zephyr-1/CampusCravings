"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import { useRouter } from "next/navigation";
import { useSupabase } from "@/lib/supabase/use-client";
import { useAuth } from "@/components/ui/auth-provider";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  ChefHat,
  Check,
  Image as ImageIcon,
  Leaf,
  Sparkles,
  ShoppingBag,
  Store,
  Utensils,
  X,
} from "lucide-react";
import clsx from "clsx";

import type { UserRole } from "@/types";

type Step = 1 | 2 | 3;

const DIETARY_TAGS = [
  "Vegetarian",
  "Vegan",
  "Halal",
  "Kosher",
  "Gluten-free",
  "Dairy-free",
  "Nut-free",
  "Spicy",
];

const PICKUP_AREAS = [
  "North Campus",
  "South Campus",
  "East Campus",
  "West Campus",
  "Residences",
  "Other",
];

const TOTAL_STEPS = 3;

const STEP_LABELS: Record<Step, string> = {
  1: "Choose your role",
  2: "About you",
  3: "Preferences",
};

function redirectForRole(role: UserRole): string {
  switch (role) {
    case "seller":
      return "/seller/dashboard";
    case "creator":
      return "/creator";
    case "customer":
    default:
      return "/feed";
  }
}

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>(1);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [dietaryTags, setDietaryTags] = useState<string[]>([]);
  const [storeName, setStoreName] = useState("");
  const [pickupArea, setPickupArea] = useState("North Campus");
  const [creatorBio, setCreatorBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [error, setError] = useState("");
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const attemptedNavigationRef = useRef<string | null>(null);

  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const supabase = useSupabase();

  // Hold off rendering until auth has resolved so we don't flash empty state
  // for signed-in users.
  useEffect(() => {
    if (user !== undefined) setAuthReady(true);
  }, [user]);

  // Has the user entered anything beyond the initial empty state? Used by
  // the leave confirmation guard.
  const isDirty = useMemo(() => {
    return (
      selectedRole !== null ||
      displayName.trim().length > 0 ||
      avatarUrl.trim().length > 0 ||
      dietaryTags.length > 0 ||
      storeName.trim().length > 0 ||
      creatorBio.trim().length > 0 ||
      pickupArea !== "North Campus"
    );
  }, [
    selectedRole,
    displayName,
    avatarUrl,
    dietaryTags,
    storeName,
    creatorBio,
    pickupArea,
  ]);

  // Intercept in-app navigation (Next.js Link clicks, router.push) so the
  // user can't silently abandon mid-wizard.
  useEffect(() => {
    if (!isDirty || loading) return;

    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      // Allow links to the same page (anchor links etc).
      if (anchor.pathname === window.location.pathname) return;
      event.preventDefault();
      event.stopPropagation();
      attemptedNavigationRef.current = href;
      setShowLeaveModal(true);
    };

    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [isDirty, loading]);

  // Also intercept the browser back/forward & unload events.
  useEffect(() => {
    if (!isDirty) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const validateStep = useCallback(
    (target: Step): string | null => {
      if (target === 1) {
        if (!selectedRole) return "Pick a role to continue.";
        return null;
      }
      if (target === 2) {
        const name = displayName.trim();
        if (name.length < 2)
          return "Display name must be at least 2 characters.";
        if (name.length > 40)
          return "Display name must be 40 characters or fewer.";
        if (avatarUrl.trim() && !/^https?:\/\//i.test(avatarUrl.trim()))
          return "Avatar URL must start with http:// or https://";
        return null;
      }
      if (target === 3) {
        if (selectedRole === "seller") {
          if (!storeName.trim())
            return "Give your shop a name so customers can find it.";
          if (storeName.trim().length > 60)
            return "Shop name is too long (60 characters max).";
          if (!pickupArea) return "Pick a pickup area.";
        }
        if (selectedRole === "creator" && creatorBio.trim().length > 280) {
          return "Bio is too long (280 characters max).";
        }
        return null;
      }
      return null;
    },
    [
      selectedRole,
      displayName,
      avatarUrl,
      storeName,
      pickupArea,
      creatorBio,
    ]
  );

  const goNext = () => {
    const next = (step + 1) as Step;
    const validationError = validateStep(next);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setStep(next);
  };

  const goBack = () => {
    setError("");
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  };

  const toggleDietaryTag = (tag: string) => {
    setDietaryTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleFinish = async () => {
    setError("");
    const finalValidation = validateStep(3);
    if (finalValidation) {
      setError(finalValidation);
      return;
    }
    if (!user) {
      setError("You need to be signed in to finish.");
      return;
    }
    if (!selectedRole) {
      setError("Pick a role to continue.");
      return;
    }

    setLoading(true);
    try {
      // 1. Update profile (role + full_name + avatar_url)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          role: selectedRole,
          full_name: displayName.trim(),
          avatar_url: avatarUrl.trim() || null,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // 2. Customer preferences — store dietary tags on the profile so they
      // are available everywhere the user surfaces (we don't have a
      // dedicated `preferences` table).
      if (selectedRole === "customer") {
        const { error: prefsError } = await supabase
          .from("profiles")
          .update({ dietary_tags: dietaryTags })
          .eq("id", user.id);
        if (prefsError) throw prefsError;
      }

      // 3. Seller — create the store + push dietary defaults (none).
      if (selectedRole === "seller") {
        const { error: storeError } = await supabase.from("stores").insert({
          user_id: user.id,
          name: storeName.trim(),
          description: "",
          pickup_area: pickupArea,
        });
        if (storeError) throw storeError;
      }

      // 4. Creator — keep the bio on the profile for now.
      if (selectedRole === "creator" && creatorBio.trim()) {
        const { error: bioError } = await supabase
          .from("profiles")
          .update({ bio: creatorBio.trim() })
          .eq("id", user.id);
        // bio column may not exist yet; treat as soft failure.
        if (bioError && bioError.code !== "PGRST204") throw bioError;
      }

      await refreshProfile();
      router.push(redirectForRole(selectedRole));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const confirmLeave = () => {
    setShowLeaveModal(false);
    const href = attemptedNavigationRef.current ?? "/";
    attemptedNavigationRef.current = null;
    router.push(href);
  };

  // Lightweight loading fallback while we wait for auth resolution. Avoids
  // a flash of the "no user" empty state for signed-in users.
  if (!authReady || !user) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Skeleton className="h-10 w-2/3 mb-3" />
          <Skeleton className="h-5 w-1/2 mb-8" />
          <Skeleton className="h-32 w-full mb-4" />
          <Skeleton className="h-32 w-full mb-4" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
        <EmptyState
          icon={Utensils}
          title="Finishing sign-in…"
          message="Hang tight, we're getting your account ready."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <header className="text-center mb-6">
          <Utensils
            size={44}
            className="mx-auto mb-3 text-[var(--primary)]"
            aria-hidden
          />
          <h1 className="text-2xl font-bold text-[var(--text)] mb-1">
            Welcome to CampusCravings
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Let&apos;s get you set up — it only takes a minute.
          </p>
        </header>

        <Stepper currentStep={step} />

        <div className="mt-6 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm p-6">
          {step === 1 && (
            <Step1
              selectedRole={selectedRole}
              onSelect={(role) => {
                setSelectedRole(role);
                setError("");
              }}
            />
          )}
          {step === 2 && (
            <Step2
              displayName={displayName}
              onDisplayNameChange={(v) => {
                setDisplayName(v);
                setError("");
              }}
              avatarUrl={avatarUrl}
              onAvatarUrlChange={(v) => {
                setAvatarUrl(v);
                setError("");
              }}
            />
          )}
          {step === 3 && (
            <Step3
              role={selectedRole}
              dietaryTags={dietaryTags}
              onToggleTag={toggleDietaryTag}
              storeName={storeName}
              onStoreNameChange={(v) => {
                setStoreName(v);
                setError("");
              }}
              pickupArea={pickupArea}
              onPickupAreaChange={(v) => {
                setPickupArea(v);
                setError("");
              }}
              creatorBio={creatorBio}
              onCreatorBioChange={(v) => {
                setCreatorBio(v);
                setError("");
              }}
            />
          )}

          {error ? (
            <p
              role="alert"
              className="mt-4 text-sm text-[var(--danger)] text-center"
            >
              {error}
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 1 || loading}
            className={clsx(
              "px-4 py-2 rounded-lg text-sm font-medium border border-[var(--border)]",
              "text-[var(--text)] hover:bg-[var(--surface-elev)]",
              "transition-colors motion-reduce:transition-none",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              step === 1 && "invisible"
            )}
          >
            Back
          </button>

          {step < TOTAL_STEPS ? (
            <LoadingButton
              size="lg"
              onClick={goNext}
              className="flex-1"
              disabled={step === 1 && !selectedRole}
            >
              Next
            </LoadingButton>
          ) : (
            <LoadingButton
              size="lg"
              onClick={handleFinish}
              loading={loading}
              className="flex-1"
            >
              Done
            </LoadingButton>
          )}
        </div>

        <p className="text-xs text-[var(--text-subtle)] text-center mt-5">
          You can change these later in profile settings.
        </p>
      </div>

      <ConfirmModal
        open={showLeaveModal}
        title="Leave onboarding?"
        message="Your progress will be lost if you leave now. You can always finish setting up later."
        confirmLabel="Leave"
        danger
        onConfirm={confirmLeave}
        onCancel={() => {
          attemptedNavigationRef.current = null;
          setShowLeaveModal(false);
        }}
      />
    </div>
  );
}

/* ---------- Stepper ---------- */

function Stepper({ currentStep }: { currentStep: Step }) {
  const percent = (currentStep / TOTAL_STEPS) * 100;
  const steps: Step[] = [1, 2, 3];

  return (
    <div aria-label={`Onboarding progress, step ${currentStep} of ${TOTAL_STEPS}`}>
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
        <span className="font-medium text-[var(--text)]">
          Step {currentStep} / {TOTAL_STEPS}
        </span>
        <span>{STEP_LABELS[currentStep]}</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={TOTAL_STEPS}
        aria-valuenow={currentStep}
        aria-valuetext={`Step ${currentStep} of ${TOTAL_STEPS}: ${STEP_LABELS[currentStep]}`}
        className="h-2 w-full rounded-full bg-[var(--border)] overflow-hidden"
      >
        <div
          className="h-full bg-[var(--primary)] transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
      <ol className="mt-4 grid grid-cols-3 gap-2 text-xs">
        {steps.map((s) => {
          const isDone = s < currentStep;
          const isCurrent = s === currentStep;
          return (
            <li
              key={s}
              aria-current={isCurrent ? "step" : undefined}
              className={clsx(
                "flex items-center gap-2 rounded-md px-2 py-1",
                isCurrent && "bg-[var(--primary-soft)] text-[var(--primary)]",
                isDone && "text-[var(--text)]",
                !isCurrent && !isDone && "text-[var(--text-subtle)]"
              )}
            >
              <span
                className={clsx(
                  "w-5 h-5 rounded-full flex items-center justify-center font-semibold",
                  isDone && "bg-[var(--primary)] text-white",
                  isCurrent &&
                    "bg-[var(--primary)] text-white",
                  !isDone &&
                    !isCurrent &&
                    "bg-[var(--surface)] border border-[var(--border)]"
                )}
              >
                {isDone ? (
                  <Check size={12} aria-hidden />
                ) : (
                  s
                )}
              </span>
              <span className="truncate">
                {s === 1 ? "Role" : s === 2 ? "Profile" : "Preferences"}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ---------- Step 1: Role ---------- */

function Step1({
  selectedRole,
  onSelect,
}: {
  selectedRole: UserRole | null;
  onSelect: (role: UserRole) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text)] mb-1">
        How do you want to use CampusCravings?
      </h2>
      <p className="text-sm text-[var(--text-muted)] mb-5">
        You can always switch later, but this shapes what you see first.
      </p>

      <div className="space-y-3">
        <RoleCard
          role="customer"
          icon={ShoppingBag}
          title="Customer"
          description="Browse and pre-order homemade food from fellow students."
          selected={selectedRole === "customer"}
          onSelect={() => onSelect("customer")}
        />
        <RoleCard
          role="seller"
          icon={ChefHat}
          title="Seller"
          description="Sell your homemade food on campus."
          selected={selectedRole === "seller"}
          onSelect={() => onSelect("seller")}
        />
        <RoleCard
          role="creator"
          icon={Sparkles}
          title="Creator"
          description="Curate listings, run reports, and help grow the marketplace."
          selected={selectedRole === "creator"}
          onSelect={() => onSelect("creator")}
        />
      </div>
    </div>
  );
}

function RoleCard({
  icon: Icon,
  title,
  description,
  selected,
  onSelect,
}: {
  role: UserRole;
  icon: typeof ShoppingBag;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={clsx(
        "w-full p-4 rounded-xl border-2 text-left flex items-center gap-4",
        "transition-colors motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40",
        selected
          ? "border-[var(--primary)] bg-[var(--primary-soft)]"
          : "border-[var(--border)] hover:border-[var(--border-strong)] bg-[var(--surface)]"
      )}
    >
      <div
        className={clsx(
          "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
          selected
            ? "bg-[var(--primary)] text-white"
            : "bg-[var(--surface-elev)] text-[var(--text-muted)] border border-[var(--border)]"
        )}
      >
        <Icon size={22} aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[var(--text)]">{title}</p>
        <p className="text-sm text-[var(--text-muted)]">{description}</p>
      </div>
      <div
        aria-hidden
        className={clsx(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
          selected
            ? "border-[var(--primary)] bg-[var(--primary)]"
            : "border-[var(--border-strong)]"
        )}
      >
        {selected ? (
          <Check size={12} className="text-white" />
        ) : null}
      </div>
    </button>
  );
}

/* ---------- Step 2: Profile ---------- */

function Step2({
  displayName,
  onDisplayNameChange,
  avatarUrl,
  onAvatarUrlChange,
}: {
  displayName: string;
  onDisplayNameChange: (v: string) => void;
  avatarUrl: string;
  onAvatarUrlChange: (v: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewError, setPreviewError] = useState(false);

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Create a local object URL so the user can preview immediately. We
    // don't upload at this stage — the URL is stored on the profile only
    // if it resolves through Supabase storage in a later flow.
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      onAvatarUrlChange(result);
      setPreviewError(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text)] mb-1">
        Make it yours
      </h2>
      <p className="text-sm text-[var(--text-muted)] mb-5">
        Pick a display name and an avatar so people recognize you.
      </p>

      <div className="flex items-center gap-4 mb-5">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-[var(--surface-elev)] border border-[var(--border)] flex items-center justify-center shrink-0">
          {avatarUrl && !previewError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="Avatar preview"
              onError={() => setPreviewError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <ImageIcon size={28} className="text-[var(--text-subtle)]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-medium border",
              "border-[var(--border)] text-[var(--text)]",
              "hover:bg-[var(--surface-elev)]",
              "transition-colors motion-reduce:transition-none"
            )}
          >
            Upload image
          </button>
          <p className="text-xs text-[var(--text-subtle)] mt-1.5">
            Or paste a URL below.
          </p>
        </div>
      </div>

      <Field
        label="Display name"
        htmlFor="display-name"
        required
        helper="Shown on your reviews, comments, and orders."
      >
        <input
          id="display-name"
          type="text"
          value={displayName}
          onChange={(e) => onDisplayNameChange(e.target.value)}
          placeholder="e.g. Amma's Kitchen"
          maxLength={40}
          className={inputClasses}
        />
      </Field>

      <Field label="Avatar URL (optional)" htmlFor="avatar-url">
        <input
          id="avatar-url"
          type="url"
          inputMode="url"
          value={avatarUrl}
          onChange={(e) => onAvatarUrlChange(e.target.value)}
          placeholder="https://..."
          className={inputClasses}
        />
      </Field>
    </div>
  );
}

const inputClasses = clsx(
  "w-full px-4 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg",
  "text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)]",
  "focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]",
  "transition-colors motion-reduce:transition-none"
);

function Field({
  label,
  htmlFor,
  required,
  helper,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-[var(--text)] mb-1.5"
      >
        {label}
        {required ? (
          <span className="text-[var(--danger)] ml-1" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      {children}
      {helper ? (
        <p className="text-xs text-[var(--text-subtle)] mt-1.5">{helper}</p>
      ) : null}
    </div>
  );
}

/* ---------- Step 3: Preferences ---------- */

function Step3(props: {
  role: UserRole | null;
  dietaryTags: string[];
  onToggleTag: (tag: string) => void;
  storeName: string;
  onStoreNameChange: (v: string) => void;
  pickupArea: string;
  onPickupAreaChange: (v: string) => void;
  creatorBio: string;
  onCreatorBioChange: (v: string) => void;
}) {
  const {
    role,
    dietaryTags,
    onToggleTag,
    storeName,
    onStoreNameChange,
    pickupArea,
    onPickupAreaChange,
    creatorBio,
    onCreatorBioChange,
  } = props;

  if (role === "seller") {
    return (
      <div>
        <h2 className="text-lg font-semibold text-[var(--text)] mb-1 flex items-center gap-2">
          <Store size={18} aria-hidden /> Tell us about your shop
        </h2>
        <p className="text-sm text-[var(--text-muted)] mb-5">
          You can edit these anytime. Admin approval comes next.
        </p>

        <Field
          label="Shop name"
          htmlFor="shop-name"
          required
          helper="You'll need admin approval before your shop goes live."
        >
          <input
            id="shop-name"
            type="text"
            value={storeName}
            onChange={(e) => onStoreNameChange(e.target.value)}
            placeholder="e.g. Amma's Kitchen"
            maxLength={60}
            className={inputClasses}
          />
        </Field>

        <Field label="Pickup area" htmlFor="pickup-area" required>
          <select
            id="pickup-area"
            value={pickupArea}
            onChange={(e) => onPickupAreaChange(e.target.value)}
            className={clsx(inputClasses, "appearance-none pr-10")}
          >
            {PICKUP_AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </Field>
      </div>
    );
  }

  if (role === "creator") {
    return (
      <div>
        <h2 className="text-lg font-semibold text-[var(--text)] mb-1 flex items-center gap-2">
          <Sparkles size={18} aria-hidden /> Creator intro
        </h2>
        <p className="text-sm text-[var(--text-muted)] mb-5">
          A short bio helps the team know who they&apos;re working with.
        </p>

        <Field
          label="Short bio"
          htmlFor="creator-bio"
          helper={`${creatorBio.length} / 280`}
        >
          <textarea
            id="creator-bio"
            value={creatorBio}
            onChange={(e) => onCreatorBioChange(e.target.value.slice(0, 280))}
            rows={4}
            placeholder="What kinds of food do you love curating?"
            className={clsx(inputClasses, "min-h-[96px] resize-none")}
          />
        </Field>
      </div>
    );
  }

  // customer (default)
  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text)] mb-1 flex items-center gap-2">
        <Leaf size={18} aria-hidden /> Any dietary preferences?
      </h2>
      <p className="text-sm text-[var(--text-muted)] mb-5">
        We&apos;ll surface food that matches what you pick. You can change
        these later.
      </p>

      <div className="flex flex-wrap gap-2">
        {DIETARY_TAGS.map((tag) => {
          const active = dietaryTags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onToggleTag(tag)}
              aria-pressed={active}
              className={clsx(
                "px-3 py-1.5 rounded-full text-sm font-medium border",
                "transition-colors motion-reduce:transition-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40",
                active
                  ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                  : "bg-[var(--surface)] text-[var(--text)] border-[var(--border)] hover:border-[var(--border-strong)]"
              )}
            >
              {tag}
              {active ? (
                <X
                  size={12}
                  className="inline-block ml-1.5 -mt-0.5"
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import { useSupabase } from "@/lib/supabase/use-client";
import { useAuth } from "@/components/ui/auth-provider";
import { useRouter } from "next/navigation";
import { ChevronLeft, Camera, Loader2, Check } from "lucide-react";
import { toast } from "@/components/ui/toast";
import Link from "next/link";
import Image from "next/image";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export default function EditProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const supabase = useSupabase();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(() => profile?.full_name ?? "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    () => profile?.avatar_url ?? null
  );
  const [hasEditedName, setHasEditedName] = useState(false);
  const [hasEditedPhoto, setHasEditedPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const effectiveFullName = hasEditedName ? fullName : (profile?.full_name ?? "");
  const effectivePhotoPreview = hasEditedPhoto
    ? photoPreview
    : (profile?.avatar_url ?? null);

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_PHOTO_BYTES) {
      toast("Photo must be under 5MB.", "error");
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast("Only JPEG, PNG, WebP, and GIF images are allowed.", "error");
      return;
    }

    setHasEditedPhoto(true);
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || saving) return;

    if (!effectiveFullName.trim()) {
      toast("Name cannot be empty.", "error");
      return;
    }

    setSaving(true);

    let avatarUrl = profile.avatar_url;

    if (photoFile) {
      const ext = photoFile.name.split(".").pop();
      const path = `${profile.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, photoFile, { upsert: true });

      if (uploadError) {
        toast("Failed to upload photo. Please try again.", "error");
        setSaving(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      avatarUrl = urlData.publicUrl;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: effectiveFullName.trim(),
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    if (error) {
      toast("Failed to update profile. Please try again.", "error");
      setSaving(false);
      return;
    }

    await refreshProfile();
    setSaving(false);
    setSaved(true);
    toast("Profile saved.", "success");

    setTimeout(() => {
      router.push("/profile");
    }, 1200);
  }

  if (!profile) return null;

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-4">
      <Link
        href="/profile"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-4 transition-colors motion-reduce:transition-none"
      >
        <ChevronLeft size={16} aria-hidden="true" />
        Back to profile
      </Link>

      <h1 className="text-xl font-bold text-[var(--text)] mb-6">Edit profile</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="relative group">
            {effectivePhotoPreview ? (
              <Image
                src={effectivePhotoPreview}
                alt="Profile photo preview"
                width={96}
                height={96}
                className="w-24 h-24 rounded-full object-cover border-2 border-[var(--border)]"
              />
            ) : (
              <div
                aria-hidden="true"
                className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white text-2xl font-bold"
              >
                {getInitials(effectiveFullName || profile.full_name)}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Change profile photo"
              className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity motion-reduce:transition-none cursor-pointer"
            >
              <Camera size={20} className="text-white" aria-hidden="true" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              onChange={handlePhotoSelect}
              className="hidden"
              aria-label="Profile photo file input"
            />
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-[var(--primary)] font-medium hover:underline"
          >
            Change photo
          </button>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="fullName"
            className="text-sm font-medium text-[var(--text)]"
          >
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            value={effectiveFullName}
            onChange={(e) => {
              setHasEditedName(true);
              setFullName(e.target.value);
            }}
            placeholder="Your full name"
            className="w-full px-4 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-colors motion-reduce:transition-none"
          />
        </div>

        <div className="p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
          <p className="text-xs text-[var(--text-muted)]">
            Email and role cannot be changed here. Contact{" "}
            <a
              href="mailto:support@campuscravings.app"
              className="text-[var(--primary)] hover:underline"
            >
              support
            </a>{" "}
            for account changes.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving || saved}
          className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white rounded-full text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors motion-reduce:transition-none disabled:opacity-60"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              Saving…
            </>
          ) : saved ? (
            <>
              <Check size={16} aria-hidden="true" />
              Saved!
            </>
          ) : (
            "Save changes"
          )}
        </button>
      </form>
    </div>
  );
}
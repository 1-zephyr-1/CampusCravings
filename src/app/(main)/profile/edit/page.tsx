"use client";

import { useState, useRef } from "react";
import { useSupabase } from "@/lib/supabase/use-client";
import { useAuth } from "@/components/ui/auth-provider";
import { useRouter } from "next/navigation";
import { ChevronLeft, Camera, Loader2, Check } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function EditProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const supabase = useSupabase();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(() => profile?.full_name ?? "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(() => profile?.avatar_url ?? null);
  const [hasEditedName, setHasEditedName] = useState(false);
  const [hasEditedPhoto, setHasEditedPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const effectiveFullName = hasEditedName ? fullName : (profile?.full_name ?? "");
  const effectivePhotoPreview = hasEditedPhoto ? photoPreview : (profile?.avatar_url ?? null);

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Photo must be under 5MB");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      alert("Only JPEG, PNG, WebP, and GIF are allowed");
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
      alert("Name cannot be empty");
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
        alert("Failed to upload photo");
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
      alert("Failed to update profile");
      setSaving(false);
      return;
    }

    await refreshProfile();
    setSaving(false);
    setSaved(true);

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
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
      <Link
        href="/profile"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white mb-4"
      >
        <ChevronLeft size={16} />
        Back
      </Link>

      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
        Edit Profile
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col items-center gap-4">
          <div className="relative group">
            {effectivePhotoPreview ? (
              <Image
                src={effectivePhotoPreview}
                alt="Preview"
                width={96}
                height={96}
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-600 to-amber-500 flex items-center justify-center text-white text-2xl font-bold">
                {getInitials(effectiveFullName || profile.full_name)}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <Camera size={20} className="text-white" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handlePhotoSelect}
              className="hidden"
            />
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-red-600 font-medium hover:underline"
          >
            Change photo
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-900 dark:text-white">
            Full Name
          </label>
          <input
            type="text"
            value={effectiveFullName}
            onChange={(e) => {
              setHasEditedName(true);
              setFullName(e.target.value);
            }}
            placeholder="Your full name"
            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600/30 focus:border-red-600 transition-colors"
          />
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500">
            Email and role cannot be changed here. Contact support for account
            changes.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving || saved}
          className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-full text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <Check size={16} />
              Saved!
            </>
          ) : (
            "Save Changes"
          )}
        </button>
      </form>
    </div>
  );
}

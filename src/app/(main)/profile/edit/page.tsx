"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/ui/auth-provider";
import { useRouter } from "next/navigation";
import { ChevronLeft, Camera, Loader2, Check } from "lucide-react";
import Link from "next/link";

export default function EditProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      if (profile.avatar_url) {
        setPhotoPreview(profile.avatar_url);
      }
    }
  }, [profile]);

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

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || saving) return;

    if (!fullName.trim()) {
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
        full_name: fullName.trim(),
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
        className="inline-flex items-center gap-1 text-sm text-bark hover:text-espresso dark:hover:text-cream mb-4"
      >
        <ChevronLeft size={16} />
        Back
      </Link>

      <h1 className="text-xl font-bold text-espresso dark:text-cream mb-6">
        Edit Profile
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col items-center gap-4">
          <div className="relative group">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Preview"
                className="w-24 h-24 rounded-full object-cover border-2 border-sand dark:border-[#4A3D30]"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-tomato to-turmeric flex items-center justify-center text-white text-2xl font-bold">
                {getInitials(fullName || profile.full_name)}
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
            className="text-xs text-tomato font-medium hover:underline"
          >
            Change photo
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-espresso dark:text-cream">
            Full Name
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            className="w-full px-4 py-2.5 bg-surface border border-sand rounded-xl text-sm text-espresso dark:bg-surface-dark dark:border-[#4A3D30] dark:text-cream focus:outline-none focus:ring-2 focus:ring-tomato/30 focus:border-tomato transition-colors"
          />
        </div>

        <div className="p-4 bg-surface dark:bg-surface-dark rounded-xl border border-sand dark:border-[#4A3D30]">
          <p className="text-xs text-bark">
            Email and role cannot be changed here. Contact support for account
            changes.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving || saved}
          className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-tomato text-white rounded-full text-sm font-semibold hover:bg-tomato-hover transition-colors disabled:opacity-60"
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

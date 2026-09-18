"use client";

import { useEffect, useState, useRef } from "react";

import { useSupabase } from "@/lib/supabase/use-client";
import { useAuth } from "@/components/ui/auth-provider";
import { useRouter } from "next/navigation";
import { Store } from "@/types";
import { MAX_UPLOAD_SIZE, ALLOWED_IMAGE_TYPES } from "@/lib/constants";
import { clsx } from "clsx";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, X, Save } from "lucide-react";
import Image from "next/image";

export default function SellerStorefrontPage() {
  const { profile } = useAuth();
  const supabase = useSupabase();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    pickup_area: "",
    food_type: "",
    is_open: false,
  });

  useEffect(() => {
    if (!profile) return;

    async function init() {
      const { data } = await supabase
        .from("stores")
        .select("*")
        .eq("user_id", profile!.id)
        .single();

      if (data) {
        setStore(data);
        setForm({
          name: data.name,
          description: data.description || "",
          pickup_area: data.pickup_area,
          food_type: data.food_type || "",
          is_open: data.is_open,
        });
        if (data.photo_url) {
          setPreview(data.photo_url);
        }
      }

      setLoading(false);
    }

    init();
  }, [profile, supabase]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_UPLOAD_SIZE) {
      setError("Image exceeds 5MB limit");
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Not a supported image type");
      return;
    }

    setError("");
    setPhotoFile(file);

    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    setPhotoFile(null);
    setPreview(store?.photo_url || null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) {
      setError("Store name is required");
      return;
    }

    setSaving(true);
    setError("");

    let photoUrl = store?.photo_url || null;

    if (photoFile && store) {
      const ext = photoFile.name.split(".").pop();
      const path = `stores/${store.id}/profile.${ext}`;
      const { data, error: uploadError } = await supabase.storage
        .from("food-images")
        .upload(path, photoFile, { upsert: true });

      if (uploadError) {
        setError("Failed to upload photo");
        setSaving(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("food-images")
        .getPublicUrl(data.path);

      photoUrl = urlData.publicUrl;
    }

    if (store) {
      const { error: updateError } = await supabase
        .from("stores")
        .update({
          name: form.name.trim(),
          description: form.description.trim(),
          pickup_area: form.pickup_area.trim(),
          is_open: form.is_open,
          photo_url: photoUrl,
        })
        .eq("id", store.id);

      if (updateError) {
        setError("Failed to update store");
        setSaving(false);
        return;
      }
    } else {
      const { data: newStore, error: insertError } = await supabase
        .from("stores")
        .insert({
          user_id: profile!.id,
          name: form.name.trim(),
          description: form.description.trim(),
          pickup_area: form.pickup_area.trim(),
          is_open: form.is_open,
          photo_url: photoUrl,
        })
        .select()
        .single();

      if (insertError || !newStore) {
        setError("Failed to create store");
        setSaving(false);
        return;
      }

      setStore(newStore);
    }

    setSaving(false);
    router.refresh();
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4" aria-label="Loading storefront" role="status">
        <Skeleton className="h-8 w-48 rounded-lg mb-4" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-4">
      <h1 className="text-xl font-bold text-[var(--text)] mb-4">
        {store ? "Edit Storefront" : "Set Up Storefront"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)] space-y-4">
          <div>
            <label htmlFor="store-name" className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
              Store Name *
            </label>
            <input
              id="store-name"
              type="text"
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g. Amma's Kitchen"
              className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
            />
          </div>

          <div>
            <label htmlFor="store-description" className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
              Description
            </label>
            <textarea
              id="store-description"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Tell customers about your cooking..."
              rows={3}
              className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] resize-none"
            />
          </div>

          <div>
            <label htmlFor="store-pickup" className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
              Pickup Location *
            </label>
            <input
              id="store-pickup"
              type="text"
              value={form.pickup_area}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, pickup_area: e.target.value }))
              }
              placeholder="e.g. Room 301, Student Union Building"
              className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
            />
            <p className="text-xs text-[var(--text-subtle)] mt-1">
              Enter the exact location where students can pick up their orders
            </p>
          </div>

          <div>
            <label htmlFor="store-food-type" className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
              Food Type / Cuisine
            </label>
            <input
              id="store-food-type"
              type="text"
              value={form.food_type}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, food_type: e.target.value }))
              }
              placeholder="e.g. Bangladeshi, Indian, Fast Food, Desserts"
              className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
            />
            <p className="text-xs text-[var(--text-subtle)] mt-1">
              What type of food do you specialize in?
            </p>
          </div>

          <div>
            <span className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
              Store Photo
            </span>

            {preview && (
              <div className="relative inline-block mb-2">
                <Image
                  src={preview}
                  alt="Store photo"
                  width={96}
                  height={96}
                  className="w-24 h-24 object-cover rounded-xl border border-[var(--border)]"
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  aria-label="Remove store photo"
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[var(--primary)] text-white rounded-full flex items-center justify-center hover:bg-[var(--primary-hover)] transition-colors motion-reduce:transition-none"
                >
                  <X size={10} aria-hidden="true" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 border border-[var(--border)] rounded-xl text-xs font-medium text-[var(--text-muted)] hover:border-[var(--primary)]/50 hover:text-[var(--primary)] transition-colors motion-reduce:transition-none"
            >
              <Upload size={14} aria-hidden="true" />
              {preview ? "Change Photo" : "Upload Photo"}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              aria-label="Upload store photo"
              className="hidden"
            />
          </div>
        </div>

        <div className="p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text)]">
                Store Status
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {form.is_open
                  ? "Customers can place orders"
                  : "Store is closed for orders"}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.is_open}
              aria-label="Store open/closed"
              onClick={() =>
                setForm((prev) => ({ ...prev, is_open: !prev.is_open }))
              }
              className={clsx(
                "relative w-11 h-6 rounded-full transition-colors motion-reduce:transition-none",
                form.is_open ? "bg-[var(--success)]" : "bg-[var(--border)]"
              )}
            >
              <span
                className={clsx(
                  "absolute top-0.5 left-0.5 w-5 h-5 bg-[var(--surface)] rounded-full transition-transform motion-reduce:transition-none shadow-sm",
                  form.is_open && "translate-x-5"
                )}
              />
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-xs text-[var(--danger)] font-medium text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-[var(--primary)] text-white rounded-full text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors motion-reduce:transition-none disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <span
                aria-hidden="true"
                className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"
              />
              Saving...
            </>
          ) : (
            <>
              <Save size={16} aria-hidden="true" />
              {store ? "Save Changes" : "Create Store"}
            </>
          )}
        </button>
      </form>
    </div>
  );
}

"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/ui/auth-provider";
import { useRouter } from "next/navigation";
import { Store } from "@/types";
import { PICKUP_AREAS, MAX_UPLOAD_SIZE, ALLOWED_IMAGE_TYPES } from "@/lib/constants";
import { clsx } from "clsx";
import { Upload, X, Save, Store as StoreIcon } from "lucide-react";

export default function SellerStorefrontPage() {
  const { profile } = useAuth();
  const supabase = createClient();
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
          is_open: data.is_open,
        });
        if (data.photo_url) {
          setPreview(data.photo_url);
        }
      }

      setLoading(false);
    }

    init();
  }, [profile]);

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
          pickup_area: form.pickup_area,
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
          pickup_area: form.pickup_area,
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
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4">
        <div className="h-8 w-48 bg-sand/30 dark:bg-[#3A2E20] rounded-lg animate-pulse mb-4" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-sand/30 dark:bg-[#3A2E20] rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-4">
      <h1 className="text-xl font-bold text-espresso dark:text-cream mb-4">
        {store ? "Edit Storefront" : "Set Up Storefront"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-4 bg-surface dark:bg-surface-dark rounded-xl border border-sand dark:border-[#4A3D30] space-y-4">
          <div>
            <label className="block text-xs font-medium text-bark mb-1.5">
              Store Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g. Amma's Kitchen"
              className="w-full px-3 py-2.5 bg-cream dark:bg-cream-dark border border-sand dark:border-[#4A3D30] rounded-xl text-sm text-espresso dark:text-cream placeholder:text-bark/50 focus:outline-none focus:ring-2 focus:ring-tomato/30 focus:border-tomato"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-bark mb-1.5">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Tell customers about your cooking..."
              rows={3}
              className="w-full px-3 py-2.5 bg-cream dark:bg-cream-dark border border-sand dark:border-[#4A3D30] rounded-xl text-sm text-espresso dark:text-cream placeholder:text-bark/50 focus:outline-none focus:ring-2 focus:ring-tomato/30 focus:border-tomato resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-bark mb-1.5">
              Pickup Area
            </label>
            <div className="flex flex-wrap gap-2">
              {PICKUP_AREAS.map((area) => (
                <button
                  key={area}
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, pickup_area: area }))
                  }
                  className={clsx(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                    form.pickup_area === area
                      ? "bg-tomato text-white border-tomato"
                      : "bg-cream dark:bg-cream-dark border-sand dark:border-[#4A3D30] text-bark hover:border-tomato/50"
                  )}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-bark mb-1.5">
              Store Photo
            </label>

            {preview && (
              <div className="relative inline-block mb-2">
                <img
                  src={preview}
                  alt="Store photo"
                  className="w-24 h-24 object-cover rounded-xl border border-sand dark:border-[#4A3D30]"
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-chili text-white rounded-full flex items-center justify-center"
                >
                  <X size={10} />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 border border-sand dark:border-[#4A3D30] rounded-xl text-xs font-medium text-bark hover:border-tomato/50 hover:text-tomato transition-colors"
            >
              <Upload size={14} />
              {preview ? "Change Photo" : "Upload Photo"}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        <div className="p-4 bg-surface dark:bg-surface-dark rounded-xl border border-sand dark:border-[#4A3D30]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-espresso dark:text-cream">
                Store Status
              </p>
              <p className="text-xs text-bark">
                {form.is_open
                  ? "Customers can place orders"
                  : "Store is closed for orders"}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setForm((prev) => ({ ...prev, is_open: !prev.is_open }))
              }
              className={clsx(
                "relative w-11 h-6 rounded-full transition-colors",
                form.is_open ? "bg-herb" : "bg-sand dark:bg-[#4A3D30]"
              )}
            >
              <span
                className={clsx(
                  "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm",
                  form.is_open && "translate-x-5"
                )}
              />
            </button>
          </div>
        </div>

        {error && (
          <p className="text-xs text-chili font-medium text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-tomato text-white rounded-full text-sm font-semibold hover:bg-tomato-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={16} />
              {store ? "Save Changes" : "Create Store"}
            </>
          )}
        </button>
      </form>
    </div>
  );
}

"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/ui/auth-provider";
import { useRouter } from "next/navigation";
import { Category, Store } from "@/types";
import { DIETARY_TAGS, SPICE_LEVELS, MAX_PHOTOS_PER_ITEM, MAX_UPLOAD_SIZE, ALLOWED_IMAGE_TYPES } from "@/lib/constants";
import { clsx } from "clsx";
import { Upload, X, ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";

export default function NewItemPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [store, setStore] = useState<Store | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    quantity: "",
    spice_level: 0,
    ordering_window: "",
    dietary_tags: [] as string[],
  });

  useEffect(() => {
    if (!profile) return;

    async function init() {
      const [{ data: storeData }, { data: cats }] = await Promise.all([
        supabase
          .from("stores")
          .select("*")
          .eq("user_id", profile!.id)
          .single(),
        supabase
          .from("categories")
          .select("*")
          .order("name"),
      ]);

      setStore(storeData);
      setCategories(cats || []);
    }

    init();
  }, [profile]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);
    const valid = selected.filter((f) => {
      if (f.size > MAX_UPLOAD_SIZE) {
        setError(`${f.name} exceeds 5MB limit`);
        return false;
      }
      if (!ALLOWED_IMAGE_TYPES.includes(f.type)) {
        setError(`${f.name} is not a supported image type`);
        return false;
      }
      return true;
    });

    if (files.length + valid.length > MAX_PHOTOS_PER_ITEM) {
      setError(`Maximum ${MAX_PHOTOS_PER_ITEM} photos allowed`);
      return;
    }

    setError("");
    setFiles((prev) => [...prev, ...valid]);

    valid.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreviews((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }

  function removePhoto(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleDietaryTag(tag: string) {
    setForm((prev) => ({
      ...prev,
      dietary_tags: prev.dietary_tags.includes(tag)
        ? prev.dietary_tags.filter((t) => t !== tag)
        : [...prev.dietary_tags, tag],
    }));
  }

  function toggleCategory(catId: string) {
    setSelectedCategories((prev) =>
      prev.includes(catId)
        ? prev.filter((c) => c !== catId)
        : [...prev, catId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!store) return;

    if (!form.name.trim() || !form.price || !form.quantity) {
      setError("Name, price, and quantity are required");
      return;
    }

    setUploading(true);
    setError("");

    const photoUrls: string[] = [];

    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `${store.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error: uploadError } = await supabase.storage
        .from("food-images")
        .upload(path, file);

      if (uploadError) {
        setError("Failed to upload image");
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("food-images")
        .getPublicUrl(data.path);

      photoUrls.push(urlData.publicUrl);
    }

    const { data: item, error: insertError } = await supabase
      .from("food_items")
      .insert({
        store_id: store.id,
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        quantity: Number(form.quantity),
        spice_level: form.spice_level,
        ordering_window: form.ordering_window || null,
        dietary_tags: form.dietary_tags,
        photo_urls: photoUrls,
      })
      .select()
      .single();

    if (insertError || !item) {
      setError("Failed to create item");
      setUploading(false);
      return;
    }

    if (selectedCategories.length > 0) {
      const catInserts = selectedCategories.map((catId) => ({
        item_id: item.id,
        category_id: catId,
      }));
      await supabase.from("item_categories").insert(catInserts);
    }

    router.push("/seller/items");
  }

  if (!store) {
    return (
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-16 text-center">
        <p className="text-sm text-bark">
          You need a store to create items.
        </p>
        <Link
          href="/seller/storefront"
          className="inline-flex mt-3 px-4 py-2 bg-tomato text-white rounded-full text-sm font-semibold"
        >
          Set Up Store
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-4">
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/seller/items"
          className="p-2 rounded-lg text-bark hover:bg-sand/50 dark:hover:bg-[#3A2E20] transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold text-espresso dark:text-cream">
          New Item
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-4 bg-surface dark:bg-surface-dark rounded-xl border border-sand dark:border-[#4A3D30] space-y-4">
          <div>
            <label className="block text-xs font-medium text-bark mb-1.5">
              Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g. Chicken Biryani"
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
              placeholder="What makes your dish special?"
              rows={3}
              className="w-full px-3 py-2.5 bg-cream dark:bg-cream-dark border border-sand dark:border-[#4A3D30] rounded-xl text-sm text-espresso dark:text-cream placeholder:text-bark/50 focus:outline-none focus:ring-2 focus:ring-tomato/30 focus:border-tomato resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-bark mb-1.5">
                Price (৳) *
              </label>
              <input
                type="number"
                min="1"
                value={form.price}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, price: e.target.value }))
                }
                placeholder="0"
                className="w-full px-3 py-2.5 bg-cream dark:bg-cream-dark border border-sand dark:border-[#4A3D30] rounded-xl text-sm text-espresso dark:text-cream font-mono placeholder:text-bark/50 focus:outline-none focus:ring-2 focus:ring-tomato/30 focus:border-tomato"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-bark mb-1.5">
                Quantity *
              </label>
              <input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, quantity: e.target.value }))
                }
                placeholder="0"
                className="w-full px-3 py-2.5 bg-cream dark:bg-cream-dark border border-sand dark:border-[#4A3D30] rounded-xl text-sm text-espresso dark:text-cream font-mono placeholder:text-bark/50 focus:outline-none focus:ring-2 focus:ring-tomato/30 focus:border-tomato"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-bark mb-1.5">
              Ordering Window
            </label>
            <input
              type="text"
              value={form.ordering_window}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  ordering_window: e.target.value,
                }))
              }
              placeholder="e.g. 12pm - 3pm"
              className="w-full px-3 py-2.5 bg-cream dark:bg-cream-dark border border-sand dark:border-[#4A3D30] rounded-xl text-sm text-espresso dark:text-cream placeholder:text-bark/50 focus:outline-none focus:ring-2 focus:ring-tomato/30 focus:border-tomato"
            />
          </div>
        </div>

        <div className="p-4 bg-surface dark:bg-surface-dark rounded-xl border border-sand dark:border-[#4A3D30]">
          <label className="block text-xs font-medium text-bark mb-2">
            Spice Level
          </label>
          <div className="flex gap-2">
            {SPICE_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() =>
                  setForm((prev) => ({ ...prev, spice_level: level.value }))
                }
                className={clsx(
                  "flex-1 py-2 rounded-xl text-xs font-medium border transition-colors",
                  form.spice_level === level.value
                    ? "bg-tomato text-white border-tomato"
                    : "bg-cream dark:bg-cream-dark border-sand dark:border-[#4A3D30] text-bark hover:border-tomato/50"
                )}
              >
                {level.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 bg-surface dark:bg-surface-dark rounded-xl border border-sand dark:border-[#4A3D30]">
          <label className="block text-xs font-medium text-bark mb-2">
            Dietary Tags
          </label>
          <div className="flex flex-wrap gap-2">
            {DIETARY_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleDietaryTag(tag)}
                className={clsx(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                  form.dietary_tags.includes(tag)
                    ? "bg-tomato text-white border-tomato"
                    : "bg-cream dark:bg-cream-dark border-sand dark:border-[#4A3D30] text-bark hover:border-tomato/50"
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 bg-surface dark:bg-surface-dark rounded-xl border border-sand dark:border-[#4A3D30]">
          <label className="block text-xs font-medium text-bark mb-2">
            Categories
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className={clsx(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                  selectedCategories.includes(cat.id)
                    ? "bg-tomato text-white border-tomato"
                    : "bg-cream dark:bg-cream-dark border-sand dark:border-[#4A3D30] text-bark hover:border-tomato/50"
                )}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 bg-surface dark:bg-surface-dark rounded-xl border border-sand dark:border-[#4A3D30]">
          <label className="block text-xs font-medium text-bark mb-2">
            Photos ({files.length}/{MAX_PHOTOS_PER_ITEM})
          </label>

          {previews.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
              {previews.map((src, i) => (
                <div key={i} className="relative shrink-0">
                  <img
                    src={src}
                    alt={`Preview ${i + 1}`}
                    className="w-20 h-20 object-cover rounded-xl border border-sand dark:border-[#4A3D30]"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-chili text-white rounded-full flex items-center justify-center"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {files.length < MAX_PHOTOS_PER_ITEM && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-6 border-2 border-dashed border-sand dark:border-[#4A3D30] rounded-xl text-bark hover:border-tomato/50 hover:text-tomato transition-colors"
            >
              <Upload size={18} />
              <span className="text-xs font-medium">
                Add Photo
              </span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {error && (
          <p className="text-xs text-chili font-medium text-center">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={uploading}
          className="w-full py-3 bg-tomato text-white rounded-full text-sm font-semibold hover:bg-tomato-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus size={16} />
              Create Item
            </>
          )}
        </button>
      </form>
    </div>
  );
}

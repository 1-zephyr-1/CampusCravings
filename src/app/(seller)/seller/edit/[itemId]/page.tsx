"use client";

import { useEffect, useState, useRef, use } from "react";

import { useSupabase } from "@/lib/supabase/use-client";
import { useAuth } from "@/components/ui/auth-provider";
import { useRouter } from "next/navigation";
import { Category, Store, FoodItem } from "@/types";
import { DIETARY_TAGS, SPICE_LEVELS, MAX_PHOTOS_PER_ITEM, MAX_UPLOAD_SIZE, ALLOWED_IMAGE_TYPES } from "@/lib/constants";
import { clsx } from "clsx";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, X, ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function EditItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = use(params);
  const { profile } = useAuth();
  const supabase = useSupabase();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [store, setStore] = useState<Store | null>(null);
  const [item, setItem] = useState<FoodItem | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const [existingUrls, setExistingUrls] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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

      if (storeData) {
        const { data: itemData } = await supabase
          .from("food_items")
          .select("*")
          .eq("id", itemId)
          .eq("store_id", storeData.id)
          .single();

        if (itemData) {
          setItem(itemData);
          setForm({
            name: itemData.name,
            description: itemData.description,
            price: String(itemData.price),
            quantity: String(itemData.quantity),
            spice_level: itemData.spice_level,
            ordering_window: itemData.ordering_window || "",
            dietary_tags: itemData.dietary_tags || [],
          });
          setExistingUrls(itemData.photo_urls || []);

          const { data: catLinks } = await supabase
            .from("item_categories")
            .select("category_id")
            .eq("item_id", itemId);

          setSelectedCategories(
            (catLinks || []).map((cl) => cl.category_id)
          );
        }
      }

      setLoading(false);
    }

    init();
  }, [profile, itemId, supabase]);

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

    if (existingUrls.length + newFiles.length + valid.length > MAX_PHOTOS_PER_ITEM) {
      setError(`Maximum ${MAX_PHOTOS_PER_ITEM} photos allowed`);
      return;
    }

    setError("");
    setNewFiles((prev) => [...prev, ...valid]);

    valid.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreviews((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }

  function removeExistingPhoto(index: number) {
    setExistingUrls((prev) => prev.filter((_, i) => i !== index));
  }

  function removeNewPhoto(index: number) {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
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
    if (!store || !item) return;

    if (!form.name.trim() || !form.price || !form.quantity) {
      setError("Name, price, and quantity are required");
      return;
    }

    setUploading(true);
    setError("");

    const photoUrls = [...existingUrls];

    for (const file of newFiles) {
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

    const { error: updateError } = await supabase
      .from("food_items")
      .update({
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        quantity: Number(form.quantity),
        spice_level: form.spice_level,
        ordering_window: form.ordering_window || null,
        dietary_tags: form.dietary_tags,
        photo_urls: photoUrls,
      })
      .eq("id", item.id);

    if (updateError) {
      setError("Failed to update item");
      setUploading(false);
      return;
    }

    await supabase
      .from("item_categories")
      .delete()
      .eq("item_id", item.id);

    if (selectedCategories.length > 0) {
      const catInserts = selectedCategories.map((catId) => ({
        item_id: item.id,
        category_id: catId,
      }));
      await supabase.from("item_categories").insert(catInserts);
    }

    router.push("/seller/items");
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4" aria-label="Loading item" role="status">
        <Skeleton className="h-8 w-48 rounded-lg mb-4" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-16 text-center">
        <p className="text-sm text-[var(--text-muted)]">Item not found</p>
        <Link
          href="/seller/items"
          className="inline-flex mt-3 px-4 py-2 bg-[var(--primary)] text-white rounded-full text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors motion-reduce:transition-none"
        >
          Back to Items
        </Link>
      </div>
    );
  }

  const totalPhotos = existingUrls.length + newFiles.length;

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-4">
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/seller/items"
          aria-label="Back to items"
          className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--background)] transition-colors motion-reduce:transition-none"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </Link>
        <h1 className="text-xl font-bold text-[var(--text)]">
          Edit Item
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)] space-y-4">
          <div>
            <label htmlFor="edit-name" className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
              Name *
            </label>
            <input
              id="edit-name"
              type="text"
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
            />
          </div>

          <div>
            <label htmlFor="edit-description" className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
              Description
            </label>
            <textarea
              id="edit-description"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={3}
              className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-price" className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                Price (৳) *
              </label>
              <input
                id="edit-price"
                type="number"
                min="1"
                value={form.price}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, price: e.target.value }))
                }
                className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] font-mono placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
              />
            </div>
            <div>
              <label htmlFor="edit-qty" className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                Quantity *
              </label>
              <input
                id="edit-qty"
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, quantity: e.target.value }))
                }
                className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] font-mono placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-window" className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
              Ordering Window
            </label>
            <input
              id="edit-window"
              type="text"
              value={form.ordering_window}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  ordering_window: e.target.value,
                }))
              }
              placeholder="e.g. 12pm - 3pm"
              className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
            />
          </div>
        </div>

        <div className="p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
          <span className="block text-xs font-medium text-[var(--text-muted)] mb-2">
            Spice Level
          </span>
          <div role="radiogroup" aria-label="Spice level" className="flex gap-2">
            {SPICE_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                role="radio"
                aria-checked={form.spice_level === level.value}
                onClick={() =>
                  setForm((prev) => ({ ...prev, spice_level: level.value }))
                }
                className={clsx(
                  "flex-1 py-2 rounded-xl text-xs font-medium border transition-colors motion-reduce:transition-none",
                  form.spice_level === level.value
                    ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                    : "bg-[var(--background)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)]/40 hover:text-[var(--text)]"
                )}
              >
                {level.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
          <span className="block text-xs font-medium text-[var(--text-muted)] mb-2">
            Dietary Tags
          </span>
          <div role="group" aria-label="Dietary tags" className="flex flex-wrap gap-2">
            {DIETARY_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                aria-pressed={form.dietary_tags.includes(tag)}
                onClick={() => toggleDietaryTag(tag)}
                className={clsx(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors motion-reduce:transition-none",
                  form.dietary_tags.includes(tag)
                    ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                    : "bg-[var(--background)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)]/40 hover:text-[var(--text)]"
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
          <span className="block text-xs font-medium text-[var(--text-muted)] mb-2">
            Categories
          </span>
          <div role="group" aria-label="Categories" className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                aria-pressed={selectedCategories.includes(cat.id)}
                onClick={() => toggleCategory(cat.id)}
                className={clsx(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors motion-reduce:transition-none",
                  selectedCategories.includes(cat.id)
                    ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                    : "bg-[var(--background)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)]/40 hover:text-[var(--text)]"
                )}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
          <span className="block text-xs font-medium text-[var(--text-muted)] mb-2">
            Photos ({totalPhotos}/{MAX_PHOTOS_PER_ITEM})
          </span>

          {(existingUrls.length > 0 || previews.length > 0) && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
              {existingUrls.map((src, i) => (
                <div key={`exist-${i}`} className="relative shrink-0">
                  <Image
                    src={src}
                    alt={`Photo ${i + 1}`}
                    width={80}
                    height={80}
                    className="w-20 h-20 object-cover rounded-xl border border-[var(--border)]"
                  />
                  <button
                    type="button"
                    onClick={() => removeExistingPhoto(i)}
                    aria-label={`Remove photo ${i + 1}`}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[var(--primary)] text-white rounded-full flex items-center justify-center hover:bg-[var(--primary-hover)] transition-colors motion-reduce:transition-none"
                  >
                    <X size={10} aria-hidden="true" />
                  </button>
                </div>
              ))}
              {previews.map((src, i) => (
                <div key={`new-${i}`} className="relative shrink-0">
                  <Image
                    src={src}
                    alt={`New photo ${i + 1}`}
                    width={80}
                    height={80}
                    className="w-20 h-20 object-cover rounded-xl border border-[var(--border)]"
                  />
                  <button
                    type="button"
                    onClick={() => removeNewPhoto(i)}
                    aria-label={`Remove new photo ${i + 1}`}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[var(--primary)] text-white rounded-full flex items-center justify-center hover:bg-[var(--primary-hover)] transition-colors motion-reduce:transition-none"
                  >
                    <X size={10} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {totalPhotos < MAX_PHOTOS_PER_ITEM && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-6 border-2 border-dashed border-[var(--border)] rounded-xl text-[var(--text-muted)] hover:border-[var(--primary)]/40 hover:text-[var(--primary)] transition-colors motion-reduce:transition-none"
            >
              <Upload size={18} aria-hidden="true" />
              <span className="text-xs font-medium">Add Photo</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            aria-label="Upload food item photos"
            className="hidden"
          />
        </div>

        {error && (
          <p role="alert" className="text-xs text-[var(--danger)] font-medium text-center">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={uploading}
          className="w-full py-3 bg-[var(--primary)] text-white rounded-full text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors motion-reduce:transition-none disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {uploading ? (
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
              Save Changes
            </>
          )}
        </button>
      </form>
    </div>
  );
}

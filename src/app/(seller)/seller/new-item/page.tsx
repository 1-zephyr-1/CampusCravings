"use client";

import { useEffect, useState, useRef, useMemo } from "react";

import { useSupabase } from "@/lib/supabase/use-client";
import { useAuth } from "@/components/ui/auth-provider";
import { useRouter } from "next/navigation";
import { Category, FoodItem, Store } from "@/types";
import {
  DIETARY_TAGS,
  SPICE_LEVELS,
  MAX_PHOTOS_PER_ITEM,
  MAX_UPLOAD_SIZE,
  ALLOWED_IMAGE_TYPES,
} from "@/lib/constants";
import { clsx } from "clsx";
import { Upload, X, ArrowLeft, Plus, PartyPopper } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "@/components/ui/toast";
import { ItemCard } from "@/components/feed/item-card";

type FormErrors = {
  name?: string;
  description?: string;
  price?: string;
  quantity?: string;
  photos?: string;
};

const NAME_MIN = 3;
const NAME_MAX = 50;
const DESCRIPTION_MAX = 500;

export default function NewItemPage() {
  const { profile } = useAuth();
  const supabase = useSupabase();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [store, setStore] = useState<Store | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState<Record<keyof FormErrors, boolean>>({
    name: false,
    description: false,
    price: false,
    quantity: false,
    photos: false,
  });
  const [showFirstItemCelebration, setShowFirstItemCelebration] = useState(false);

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
  }, [profile, supabase]);

  // Live-validate as the user types. Computed during render (not in an effect)
  // so errors stay in sync without causing an extra cascading render.
  const errors = useMemo(
    () => validate(form, files.length),
    // validate is a stable pure function defined below; no need to include it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, files.length]
  );

  const descriptionLength = form.description.length;

  function validate(values: typeof form, photoCount: number): FormErrors {
    const next: FormErrors = {};

    const trimmedName = values.name.trim();
    if (!trimmedName) {
      next.name = "Name is required.";
    } else if (trimmedName.length < NAME_MIN) {
      next.name = `Name must be at least ${NAME_MIN} characters.`;
    } else if (trimmedName.length > NAME_MAX) {
      next.name = `Name must be ${NAME_MAX} characters or fewer.`;
    }

    if (values.description.length > DESCRIPTION_MAX) {
      next.description = `Description must be ${DESCRIPTION_MAX} characters or fewer.`;
    }

    if (!values.price) {
      next.price = "Price is required.";
    } else {
      const n = Number(values.price);
      if (Number.isNaN(n)) {
        next.price = "Price must be a number.";
      } else if (n <= 0) {
        next.price = "Price must be greater than 0.";
      }
    }

    if (!values.quantity) {
      next.quantity = "Quantity is required.";
    } else if (Number(values.quantity) < 1 || Number.isNaN(Number(values.quantity))) {
      next.quantity = "Quantity must be at least 1.";
    }

    if (photoCount < 1) {
      next.photos = `Add at least 1 photo (up to ${MAX_PHOTOS_PER_ITEM}).`;
    } else if (photoCount > MAX_PHOTOS_PER_ITEM) {
      next.photos = `Maximum ${MAX_PHOTOS_PER_ITEM} photos allowed.`;
    }

    return next;
  }

  function markTouched(field: keyof FormErrors) {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  }

  function shouldShow(field: keyof FormErrors) {
    return Boolean(touched[field] && errors[field]);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    markTouched("photos");
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
    markTouched("photos");
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

    // Force-touch all fields so any remaining errors surface.
    setTouched({
      name: true,
      description: true,
      price: true,
      quantity: true,
      photos: true,
    });

    const liveErrors = errors;
    if (Object.keys(liveErrors).length > 0) {
      setError("Please fix the highlighted fields and try again.");
      return;
    }

    // Check existing item count to know whether this is a first-item celebration.
    let firstItem = false;
    try {
      const { count, error: countErr } = await supabase
        .from("food_items")
        .select("id", { count: "exact", head: true })
        .eq("store_id", store.id);
      if (!countErr) {
        firstItem = (count ?? 0) === 0;
      }
    } catch {
      // ignore — don't block submit if pre-count fails
    }

    setUploading(true);
    setError("");

    const photoUrls: string[] = [];

    try {
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

      if (firstItem) {
        // Trigger the toast right before navigating so it's visible.
        toast("🎉 Your first item is live!", "success");
        setShowFirstItemCelebration(true);
        // Allow the modal to render, then route.
        setTimeout(() => {
          router.push("/seller/items");
        }, 2200);
      } else {
        router.push("/seller/items");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setUploading(false);
    }
  }

  if (!store) {
    return (
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-16 text-center">
        <p className="text-sm text-[var(--text-muted)]">
          You need a store to create items.
        </p>
        <Link
          href="/seller/storefront"
          className="inline-flex mt-3 px-4 py-2 bg-[var(--primary)] text-white rounded-full text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors motion-reduce:transition-none"
        >
          Set Up Store
        </Link>
      </div>
    );
  }

  const nameErrorId = shouldShow("name") ? "new-name-error" : undefined;
  const descErrorId = shouldShow("description") ? "new-description-error" : undefined;
  const priceErrorId = shouldShow("price") ? "new-price-error" : undefined;
  const qtyErrorId = shouldShow("quantity") ? "new-qty-error" : undefined;
  const photosErrorId = shouldShow("photos") ? "new-photos-error" : undefined;

  const descriptionOverLimit = form.description.length > DESCRIPTION_MAX;

  // Build a synthetic FoodItem for the live preview. Fields not yet captured
  // are filled with sensible defaults so ItemCard renders cleanly.
  const previewItem: FoodItem = {
    id: "preview",
    store_id: store.id,
    name: form.name.trim() || "Untitled item",
    description: form.description.trim(),
    price: Number(form.price) || 0,
    quantity: Number(form.quantity) || 0,
    is_sold_out: false,
    ordering_window: form.ordering_window || null,
    photo_urls: previews,
    dietary_tags: form.dietary_tags,
    spice_level: form.spice_level,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    store: store,
  };

  const isPreviewEmpty =
    !form.name.trim() &&
    !form.description.trim() &&
    !form.price &&
    previews.length === 0;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/seller/items"
          aria-label="Back to items"
          className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--background)] transition-colors motion-reduce:transition-none"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </Link>
        <h1 className="text-xl font-bold text-[var(--text)]">New Item</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)] space-y-4">
          <div>
            <label
              htmlFor="new-name"
              className="block text-xs font-medium text-[var(--text-muted)] mb-1.5"
            >
              Name *
            </label>
            <input
              id="new-name"
              type="text"
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              onBlur={() => markTouched("name")}
              aria-invalid={Boolean(nameErrorId)}
              aria-describedby={nameErrorId}
              placeholder="e.g. Chicken Biryani"
              className={clsx(
                "w-full px-3 py-2.5 bg-[var(--background)] border rounded-xl text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 transition-colors motion-reduce:transition-none",
                nameErrorId
                  ? "border-[var(--danger)] focus:ring-[var(--danger)]/30 focus:border-[var(--danger)]"
                  : "border-[var(--border)] focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
              )}
            />
            {nameErrorId && (
              <p
                id="new-name-error"
                role="alert"
                className="text-xs text-[var(--danger)] mt-1.5 font-medium"
              >
                {errors.name}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="new-description"
                className="block text-xs font-medium text-[var(--text-muted)]"
              >
                Description
              </label>
              <span
                className={clsx(
                  "text-[10px] font-mono tabular-nums",
                  descriptionOverLimit
                    ? "text-[var(--danger)] font-semibold"
                    : "text-[var(--text-subtle)]"
                )}
                aria-live="polite"
              >
                {descriptionLength}/{DESCRIPTION_MAX}
              </span>
            </div>
            <textarea
              id="new-description"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              onBlur={() => markTouched("description")}
              aria-invalid={Boolean(descErrorId)}
              aria-describedby={descErrorId}
              placeholder="What makes your dish special?"
              rows={3}
              className={clsx(
                "w-full px-3 py-2.5 bg-[var(--background)] border rounded-xl text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 resize-none transition-colors motion-reduce:transition-none",
                descErrorId
                  ? "border-[var(--danger)] focus:ring-[var(--danger)]/30 focus:border-[var(--danger)]"
                  : "border-[var(--border)] focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
              )}
            />
            {descErrorId && (
              <p
                id="new-description-error"
                role="alert"
                className="text-xs text-[var(--danger)] mt-1.5 font-medium"
              >
                {errors.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="new-price"
                className="block text-xs font-medium text-[var(--text-muted)] mb-1.5"
              >
                Price (৳) *
              </label>
              <input
                id="new-price"
                type="number"
                min="1"
                value={form.price}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, price: e.target.value }))
                }
                onBlur={() => markTouched("price")}
                aria-invalid={Boolean(priceErrorId)}
                aria-describedby={priceErrorId}
                placeholder="0"
                className={clsx(
                  "w-full px-3 py-2.5 bg-[var(--background)] border rounded-xl text-sm text-[var(--text)] font-mono placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 transition-colors motion-reduce:transition-none",
                  priceErrorId
                    ? "border-[var(--danger)] focus:ring-[var(--danger)]/30 focus:border-[var(--danger)]"
                    : "border-[var(--border)] focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
                )}
              />
              {priceErrorId && (
                <p
                  id="new-price-error"
                  role="alert"
                  className="text-xs text-[var(--danger)] mt-1.5 font-medium"
                >
                  {errors.price}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="new-qty"
                className="block text-xs font-medium text-[var(--text-muted)] mb-1.5"
              >
                Quantity *
              </label>
              <input
                id="new-qty"
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, quantity: e.target.value }))
                }
                onBlur={() => markTouched("quantity")}
                aria-invalid={Boolean(qtyErrorId)}
                aria-describedby={qtyErrorId}
                placeholder="0"
                className={clsx(
                  "w-full px-3 py-2.5 bg-[var(--background)] border rounded-xl text-sm text-[var(--text)] font-mono placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 transition-colors motion-reduce:transition-none",
                  qtyErrorId
                    ? "border-[var(--danger)] focus:ring-[var(--danger)]/30 focus:border-[var(--danger)]"
                    : "border-[var(--border)] focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
                )}
              />
              {qtyErrorId && (
                <p
                  id="new-qty-error"
                  role="alert"
                  className="text-xs text-[var(--danger)] mt-1.5 font-medium"
                >
                  {errors.quantity}
                </p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="new-window"
              className="block text-xs font-medium text-[var(--text-muted)] mb-1.5"
            >
              Ordering Window
            </label>
            <input
              id="new-window"
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
            Photos ({files.length}/{MAX_PHOTOS_PER_ITEM}) *
          </span>

          {previews.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
              {previews.map((src, i) => (
                <div key={i} className="relative shrink-0">
                  <Image
                    src={src}
                    alt={`Preview ${i + 1}`}
                    width={80}
                    height={80}
                    className="w-20 h-20 object-cover rounded-xl border border-[var(--border)]"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    aria-label={`Remove photo ${i + 1}`}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[var(--primary)] text-white rounded-full flex items-center justify-center hover:bg-[var(--primary-hover)] transition-colors motion-reduce:transition-none"
                  >
                    <X size={10} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {files.length < MAX_PHOTOS_PER_ITEM && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={clsx(
                "w-full flex items-center justify-center gap-2 py-6 border-2 border-dashed rounded-xl transition-colors motion-reduce:transition-none",
                photosErrorId
                  ? "border-[var(--danger)] text-[var(--danger)] hover:border-[var(--danger)]/70"
                  : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)]/40 hover:text-[var(--primary)]"
              )}
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
            aria-describedby={photosErrorId}
            className="hidden"
          />

          {photosErrorId && (
            <p
              id="new-photos-error"
              role="alert"
              className="text-xs text-[var(--danger)] mt-1.5 font-medium"
            >
              {errors.photos}
            </p>
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="text-xs text-[var(--danger)] font-medium text-center"
          >
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
                className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin motion-reduce:animate-none"
              />
              Creating...
            </>
          ) : (
            <>
              <Plus size={16} aria-hidden="true" />
              Create Item
            </>
          )}
        </button>
      </form>

      <aside className="mt-6 lg:mt-0" aria-label="Item preview">
        <div className="lg:sticky lg:top-4 p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
          <span className="block text-xs font-medium text-[var(--text-muted)] mb-3">
            Live preview
          </span>
          {isPreviewEmpty ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-[var(--border)] rounded-xl">
              <p className="text-xs text-[var(--text-subtle)]">
                Start filling in the form to see how your item will look in the feed.
              </p>
            </div>
          ) : (
            <div className="pointer-events-none">
              <ItemCard item={previewItem} />
            </div>
          )}
          <p className="mt-3 text-[10px] text-[var(--text-subtle)] leading-relaxed">
            This is how buyers will see your item in the feed. Pricing, photos, and dietary tags update in real time.
          </p>
        </div>
      </aside>
      </div>

      {showFirstItemCelebration && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="first-item-celebrate-title"
        >
          <div
            className="absolute inset-0 bg-black/50 animate-fade-in"
            aria-hidden="true"
          />
          <div className="relative bg-[var(--surface)] rounded-2xl shadow-xl max-w-sm w-full p-8 animate-slide-up motion-reduce:animate-none border border-[var(--border)] text-center">
            <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-[var(--success)]/15 flex items-center justify-center">
              <PartyPopper size={28} className="text-[var(--success)]" aria-hidden="true" />
            </div>
            <h3
              id="first-item-celebrate-title"
              className="text-lg font-semibold text-[var(--text)] mb-2"
            >
              🎉 Your first item is live!
            </h3>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              Nicely done. Buyers can now find your store on the feed and place orders.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowFirstItemCelebration(false);
                router.push("/seller/items");
              }}
              className="px-5 py-2.5 rounded-full bg-[var(--primary)] text-white text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors motion-reduce:transition-none"
            >
              See my items
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

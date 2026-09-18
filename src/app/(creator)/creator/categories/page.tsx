"use client";

import { useEffect, useState } from "react";

import { useSupabase } from "@/lib/supabase/use-client";
import { Category } from "@/types";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Skeleton } from "@/components/ui/skeleton";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const supabase = useSupabase();

  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      setCategories(data || []);
      setLoading(false);
    }

    fetchCategories();
  }, [supabase]);

  function resetForm() {
    setName("");
    setIcon("");
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(category: Category) {
    setName(category.name);
    setIcon(category.icon);
    setEditingId(category.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !icon.trim()) return;

    if (editingId) {
      const { data } = await supabase
        .from("categories")
        .update({ name: name.trim(), icon: icon.trim() })
        .eq("id", editingId)
        .select()
        .single();

      if (data) {
        setCategories((prev) =>
          prev.map((c) => (c.id === editingId ? data : c))
        );
      }
    } else {
      const { data } = await supabase
        .from("categories")
        .insert({ name: name.trim(), icon: icon.trim() })
        .select()
        .single();

      if (data) {
        setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      }
    }

    resetForm();
  }

  async function handleDelete(id: string) {
    await supabase.from("categories").delete().eq("id", id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setDeleteTarget(null);
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-label="Loading categories" role="status">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-[var(--text)]">
          Categories
        </h1>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          aria-expanded={showForm}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-full text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors motion-reduce:transition-none"
        >
          {showForm ? <X size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
          {showForm ? "Cancel" : "Add Category"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-4"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cat-name" className="block text-sm font-medium text-[var(--text)] mb-1">
                Name
              </label>
              <input
                id="cat-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Category name"
                className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
                required
              />
            </div>
            <div>
              <label htmlFor="cat-icon" className="block text-sm font-medium text-[var(--text)] mb-1">
                Icon (text)
              </label>
              <input
                id="cat-icon"
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="e.g. Rice, Snacks, Desserts"
                className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-6 py-2 bg-[var(--primary)] text-white rounded-full text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors motion-reduce:transition-none"
          >
            {editingId ? "Update Category" : "Add Category"}
          </button>
        </form>
      )}

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-5 py-3 font-medium text-[var(--text-muted)]">
                  Icon
                </th>
                <th className="text-left px-5 py-3 font-medium text-[var(--text-muted)]">
                  Name
                </th>
                <th className="text-left px-5 py-3 font-medium text-[var(--text-muted)]">
                  Created
                </th>
                <th className="text-right px-5 py-3 font-medium text-[var(--text-muted)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-10 text-center text-[var(--text-muted)]"
                  >
                    No categories yet
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr
                    key={category.id}
                    className="border-b border-[var(--border)]/50 last:border-0 hover:bg-[var(--background)] transition-colors motion-reduce:transition-none"
                  >
                    <td className="px-5 py-3 text-2xl">{category.icon}</td>
                    <td className="px-5 py-3 font-medium text-[var(--text)]">
                      {category.name}
                    </td>
                    <td className="px-5 py-3 text-[var(--text-muted)]">
                      {new Date(category.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(category)}
                          aria-label={`Edit ${category.name}`}
                          className="p-1.5 rounded-lg bg-[var(--warning-soft)] text-[var(--warning)] hover:bg-[var(--warning)]/20 transition-colors motion-reduce:transition-none"
                          title="Edit"
                        >
                          <Pencil size={16} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(category.id)}
                          aria-label={`Delete ${category.name}`}
                          className="p-1.5 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20 transition-colors motion-reduce:transition-none"
                          title="Delete"
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete Category"
        message="Are you sure you want to delete this category? This action cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

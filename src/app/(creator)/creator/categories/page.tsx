"use client";

import { useEffect, useState } from "react";

import { useSupabase } from "@/lib/supabase/use-client";
import { Category } from "@/types";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { ConfirmModal } from "@/components/ui/confirm-modal";

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
  }, []);

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
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-[3px] border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Categories
        </h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-full text-sm font-medium hover:bg-red-700 transition-colors"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Cancel" : "Add Category"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Category name"
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600/30 focus:border-red-600 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                Icon (text)
              </label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="e.g. Rice, Snacks, Desserts"
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-6 py-2 bg-red-600 text-white rounded-full text-sm font-medium hover:bg-red-700 transition-colors"
          >
            {editingId ? "Update Category" : "Add Category"}
          </button>
        </form>
      )}

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Icon
                </th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Name
                </th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Created
                </th>
                <th className="text-right px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-10 text-center text-gray-500 dark:text-gray-400"
                  >
                    No categories yet
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr
                    key={category.id}
                    className="border-b border-gray-200/50 dark:border-gray-700/50 last:border-0 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-5 py-3 text-2xl">{category.icon}</td>
                    <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">
                      {category.name}
                    </td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400">
                      {new Date(category.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => startEdit(category)}
                          className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(category.id)}
                          className="p-1.5 rounded-lg bg-red-600/10 text-red-600 hover:bg-red-600/20 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
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

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Category } from "@/types";
import { Plus, Pencil, Trash2, X } from "lucide-react";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const supabase = createClient();

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("name");

    setCategories(data || []);
    setLoading(false);
  }

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
    if (!confirm("Delete this category?")) return;

    await supabase.from("categories").delete().eq("id", id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-3 border-tomato border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-espresso dark:text-cream">
          Categories
        </h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-tomato text-white rounded-full text-sm font-medium hover:bg-tomato-hover transition-colors"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Cancel" : "Add Category"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-surface dark:bg-surface-dark border border-sand dark:border-[#4A3D30] rounded-xl p-5 space-y-4"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-espresso dark:text-cream mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Category name"
                className="w-full px-4 py-2 bg-cream border border-sand rounded-lg text-sm text-espresso placeholder:text-bark/60 focus:outline-none focus:ring-2 focus:ring-tomato/30 focus:border-tomato dark:bg-cream-dark dark:border-[#4A3D30] dark:text-cream"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-espresso dark:text-cream mb-1">
                Icon (emoji)
              </label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="e.g. 🍚"
                className="w-full px-4 py-2 bg-cream border border-sand rounded-lg text-sm text-espresso placeholder:text-bark/60 focus:outline-none focus:ring-2 focus:ring-tomato/30 focus:border-tomato dark:bg-cream-dark dark:border-[#4A3D30] dark:text-cream"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-6 py-2 bg-tomato text-white rounded-full text-sm font-medium hover:bg-tomato-hover transition-colors"
          >
            {editingId ? "Update Category" : "Add Category"}
          </button>
        </form>
      )}

      <div className="bg-surface dark:bg-surface-dark border border-sand dark:border-[#4A3D30] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand dark:border-[#4A3D30]">
                <th className="text-left px-5 py-3 font-medium text-bark dark:text-cream/60">
                  Icon
                </th>
                <th className="text-left px-5 py-3 font-medium text-bark dark:text-cream/60">
                  Name
                </th>
                <th className="text-left px-5 py-3 font-medium text-bark dark:text-cream/60">
                  Created
                </th>
                <th className="text-right px-5 py-3 font-medium text-bark dark:text-cream/60">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-10 text-center text-bark dark:text-cream/50"
                  >
                    No categories yet
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr
                    key={category.id}
                    className="border-b border-sand/50 dark:border-[#4A3D30]/50 last:border-0 hover:bg-sand/20 dark:hover:bg-[#3A2E20]/50 transition-colors"
                  >
                    <td className="px-5 py-3 text-2xl">{category.icon}</td>
                    <td className="px-5 py-3 font-medium text-espresso dark:text-cream">
                      {category.name}
                    </td>
                    <td className="px-5 py-3 text-bark dark:text-cream/50">
                      {new Date(category.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => startEdit(category)}
                          className="p-1.5 rounded-lg bg-turmeric/10 text-amber-700 hover:bg-turmeric/20 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          className="p-1.5 rounded-lg bg-chili/10 text-chili hover:bg-chili/20 transition-colors"
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
    </div>
  );
}

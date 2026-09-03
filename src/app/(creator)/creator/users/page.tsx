"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/types";
import { Shield, ShieldOff, Ban } from "lucide-react";

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "banned">("all");
  const supabase = createClient();

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    setUsers(data || []);
    setLoading(false);
  }

  async function toggleBan(userId: string, currentBanned: boolean) {
    await supabase
      .from("profiles")
      .update({ is_banned: !currentBanned })
      .eq("id", userId);

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, is_banned: !currentBanned } : u
      )
    );
  }

  const filtered = users.filter((u) => {
    if (filter === "active") return !u.is_banned;
    if (filter === "banned") return u.is_banned;
    return true;
  });

  const roleColors: Record<string, string> = {
    customer: "bg-sand/50 text-bark dark:bg-[#3A2E20] dark:text-cream/70",
    seller: "bg-turmeric/20 text-amber-700",
    creator: "bg-tomato/20 text-tomato",
  };

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
          Users
        </h1>
        <div className="flex gap-2">
          {(["all", "active", "banned"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-tomato text-white"
                  : "bg-sand/50 text-bark hover:bg-sand dark:bg-[#3A2E20] dark:text-cream/70"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface dark:bg-surface-dark border border-sand dark:border-[#4A3D30] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand dark:border-[#4A3D30]">
                <th className="text-left px-5 py-3 font-medium text-bark dark:text-cream/60">
                  User
                </th>
                <th className="text-left px-5 py-3 font-medium text-bark dark:text-cream/60">
                  Role
                </th>
                <th className="text-left px-5 py-3 font-medium text-bark dark:text-cream/60">
                  Status
                </th>
                <th className="text-left px-5 py-3 font-medium text-bark dark:text-cream/60">
                  Joined
                </th>
                <th className="text-right px-5 py-3 font-medium text-bark dark:text-cream/60">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-bark dark:text-cream/50"
                  >
                    No users found
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-sand/50 dark:border-[#4A3D30]/50 last:border-0 hover:bg-sand/20 dark:hover:bg-[#3A2E20]/50 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-tomato/20 flex items-center justify-center text-tomato text-sm font-bold shrink-0">
                          {user.full_name?.[0] || user.email[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-espresso dark:text-cream truncate">
                            {user.full_name || "N/A"}
                          </p>
                          <p className="text-xs text-bark dark:text-cream/50 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          roleColors[user.role] || roleColors.customer
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.is_banned
                            ? "bg-chili/20 text-chili"
                            : "bg-herb/20 text-herb"
                        }`}
                      >
                        {user.is_banned ? (
                          <>
                            <Ban size={10} /> Banned
                          </>
                        ) : (
                          "Active"
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-bark dark:text-cream/50">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {user.role !== "creator" && (
                        <button
                          onClick={() => toggleBan(user.id, user.is_banned)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            user.is_banned
                              ? "bg-herb/10 text-herb hover:bg-herb/20"
                              : "bg-chili/10 text-chili hover:bg-chili/20"
                          }`}
                          title={user.is_banned ? "Unban" : "Ban"}
                        >
                          {user.is_banned ? (
                            <ShieldOff size={16} />
                          ) : (
                            <Shield size={16} />
                          )}
                        </button>
                      )}
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

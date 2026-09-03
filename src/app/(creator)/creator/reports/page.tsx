"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AlertTriangle, CheckCircle, XCircle, Eye } from "lucide-react";

interface ReportWithReporter {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  description: string | null;
  status: "pending" | "reviewed" | "resolved" | "dismissed";
  created_at: string;
  reporter: {
    full_name: string;
    email: string;
  } | null;
}

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "bg-turmeric/20 text-amber-700", icon: AlertTriangle },
  reviewed: { label: "Reviewed", color: "bg-herb/20 text-herb", icon: Eye },
  resolved: { label: "Resolved", color: "bg-herb/20 text-herb", icon: CheckCircle },
  dismissed: { label: "Dismissed", color: "bg-sand/50 text-bark dark:bg-[#3A2E20] dark:text-cream/70", icon: XCircle },
};

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportWithReporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "reviewed" | "resolved" | "dismissed">("all");
  const supabase = createClient();

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    const { data } = await supabase
      .from("reports")
      .select("*, reporter:profiles!reports_reporter_id_fkey(full_name, email)")
      .order("created_at", { ascending: false });

    setReports((data as ReportWithReporter[]) || []);
    setLoading(false);
  }

  async function updateStatus(reportId: string, status: "pending" | "reviewed" | "resolved" | "dismissed") {
    await supabase
      .from("reports")
      .update({ status })
      .eq("id", reportId);

    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status } : r))
    );
  }

  const filtered = reports.filter((r) => {
    if (filter !== "all") return r.status === filter;
    return true;
  });

  const pendingCount = reports.filter((r) => r.status === "pending").length;

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
          Reports
        </h1>
        <div className="flex gap-2">
          {(["all", "pending", "reviewed", "resolved", "dismissed"] as const).map((f) => (
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
              {f === "pending" && pendingCount > 0 && (
                <span className="ml-1.5 bg-tomato/20 text-tomato px-1.5 rounded-full text-xs">
                  {pendingCount}
                </span>
              )}
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
                  Reporter
                </th>
                <th className="text-left px-5 py-3 font-medium text-bark dark:text-cream/60">
                  Target
                </th>
                <th className="text-left px-5 py-3 font-medium text-bark dark:text-cream/60">
                  Reason
                </th>
                <th className="text-left px-5 py-3 font-medium text-bark dark:text-cream/60">
                  Status
                </th>
                <th className="text-left px-5 py-3 font-medium text-bark dark:text-cream/60">
                  Date
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
                    colSpan={6}
                    className="px-5 py-10 text-center text-bark dark:text-cream/50"
                  >
                    No reports found
                  </td>
                </tr>
              ) : (
                filtered.map((report) => {
                  const config = STATUS_CONFIG[report.status];
                  return (
                    <tr
                      key={report.id}
                      className="border-b border-sand/50 dark:border-[#4A3D30]/50 last:border-0 hover:bg-sand/20 dark:hover:bg-[#3A2E20]/50 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <p className="font-medium text-espresso dark:text-cream">
                          {report.reporter?.full_name || "N/A"}
                        </p>
                        <p className="text-xs text-bark dark:text-cream/50">
                          {report.reporter?.email}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-sand/50 text-bark dark:bg-[#3A2E20] dark:text-cream/70 capitalize">
                          {report.target_type}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-espresso dark:text-cream max-w-[200px] truncate">
                          {report.reason}
                        </p>
                        {report.description && (
                          <p className="text-xs text-bark dark:text-cream/50 max-w-[200px] truncate mt-0.5">
                            {report.description}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}
                        >
                          <config.icon size={10} />
                          {config.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-bark dark:text-cream/50">
                        {new Date(report.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {report.status === "pending" && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => updateStatus(report.id, "reviewed")}
                              className="px-3 py-1 rounded-lg text-xs font-medium bg-herb/10 text-herb hover:bg-herb/20 transition-colors"
                            >
                              Review
                            </button>
                            <button
                              onClick={() => updateStatus(report.id, "resolved")}
                              className="px-3 py-1 rounded-lg text-xs font-medium bg-herb/10 text-herb hover:bg-herb/20 transition-colors"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() => updateStatus(report.id, "dismissed")}
                              className="px-3 py-1 rounded-lg text-xs font-medium bg-sand/50 text-bark hover:bg-sand dark:bg-[#3A2E20] dark:text-cream/70 transition-colors"
                            >
                              Dismiss
                            </button>
                          </div>
                        )}
                        {report.status === "reviewed" && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => updateStatus(report.id, "resolved")}
                              className="px-3 py-1 rounded-lg text-xs font-medium bg-herb/10 text-herb hover:bg-herb/20 transition-colors"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() => updateStatus(report.id, "dismissed")}
                              className="px-3 py-1 rounded-lg text-xs font-medium bg-sand/50 text-bark hover:bg-sand dark:bg-[#3A2E20] dark:text-cream/70 transition-colors"
                            >
                              Dismiss
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

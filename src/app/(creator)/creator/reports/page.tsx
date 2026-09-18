"use client";

import { useEffect, useState } from "react";

import { useSupabase } from "@/lib/supabase/use-client";
import { AlertTriangle, CheckCircle, XCircle, Eye } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";

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
  pending: { label: "Pending", color: "bg-amber-500/20 text-amber-600", icon: AlertTriangle },
  reviewed: { label: "Reviewed", color: "bg-green-600/20 text-green-600", icon: Eye },
  resolved: { label: "Resolved", color: "bg-green-600/20 text-green-600", icon: CheckCircle },
  dismissed: { label: "Dismissed", color: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300", icon: XCircle },
};

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportWithReporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "reviewed" | "resolved" | "dismissed">("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [totalItems, setTotalItems] = useState(0);
  const supabase = useSupabase();

  useEffect(() => {
    async function fetchReports() {
      const { data, count } = await supabase
        .from("reports")
        .select("*, reporter:profiles!reports_reporter_id_fkey(full_name, email)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      setReports((data as ReportWithReporter[]) || []);
      setTotalItems(count || 0);
      setLoading(false);
    }

    fetchReports();
  }, [page]);

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
        <div className="h-8 w-8 border-[3px] border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Reports
        </h1>
        <div className="flex gap-2">
          {(["all", "pending", "reviewed", "resolved", "dismissed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === "pending" && pendingCount > 0 && (
                <span className="ml-1.5 bg-red-600/20 text-red-600 px-1.5 rounded-full text-xs">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Reporter
                </th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Target
                </th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Reason
                </th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Status
                </th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Date
                </th>
                <th className="text-right px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-gray-500 dark:text-gray-400"
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
                      className="border-b border-gray-200/50 dark:border-gray-700/50 last:border-0 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {report.reporter?.full_name || "N/A"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {report.reporter?.email}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300 capitalize">
                          {report.target_type}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-gray-900 dark:text-white max-w-[200px] truncate">
                          {report.reason}
                        </p>
                        {report.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[200px] truncate mt-0.5">
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
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400">
                        {new Date(report.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {report.status === "pending" && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => updateStatus(report.id, "reviewed")}
                              className="px-3 py-1 rounded-lg text-xs font-medium bg-green-600/10 text-green-600 hover:bg-green-600/20 transition-colors"
                            >
                              Review
                            </button>
                            <button
                              onClick={() => updateStatus(report.id, "resolved")}
                              className="px-3 py-1 rounded-lg text-xs font-medium bg-green-600/10 text-green-600 hover:bg-green-600/20 transition-colors"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() => updateStatus(report.id, "dismissed")}
                              className="px-3 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 transition-colors"
                            >
                              Dismiss
                            </button>
                          </div>
                        )}
                        {report.status === "reviewed" && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => updateStatus(report.id, "resolved")}
                              className="px-3 py-1 rounded-lg text-xs font-medium bg-green-600/10 text-green-600 hover:bg-green-600/20 transition-colors"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() => updateStatus(report.id, "dismissed")}
                              className="px-3 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 transition-colors"
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

      <Pagination page={page} totalPages={Math.ceil(totalItems / PAGE_SIZE)} onPageChange={setPage} />
    </div>
  );
}

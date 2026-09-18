"use client";

import { useEffect, useState } from "react";

import { useSupabase } from "@/lib/supabase/use-client";
import { AlertTriangle, CheckCircle, XCircle, Eye } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { clsx } from "clsx";

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
  pending: { label: "Pending", color: "bg-[var(--warning-soft)] text-[var(--warning)]", icon: AlertTriangle },
  reviewed: { label: "Reviewed", color: "bg-[var(--success)]/20 text-[var(--success)]", icon: Eye },
  resolved: { label: "Resolved", color: "bg-[var(--success)]/20 text-[var(--success)]", icon: CheckCircle },
  dismissed: { label: "Dismissed", color: "bg-[var(--background)] text-[var(--text-muted)] border border-[var(--border)]", icon: XCircle },
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
  }, [page, supabase]);

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
      <div className="space-y-4" aria-label="Loading reports" role="status">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-[var(--text)]">
          Reports
        </h1>
        <div role="tablist" aria-label="Filter reports" className="flex gap-2 flex-wrap">
          {(["all", "pending", "reviewed", "resolved", "dismissed"] as const).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={clsx(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-colors motion-reduce:transition-none",
                filter === f
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--background)] text-[var(--text-muted)] hover:bg-[var(--border)]"
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === "pending" && pendingCount > 0 && (
                <span className="ml-1.5 bg-[var(--primary)]/20 text-[var(--primary)] px-1.5 rounded-full text-xs">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-5 py-3 font-medium text-[var(--text-muted)]">
                  Reporter
                </th>
                <th className="text-left px-5 py-3 font-medium text-[var(--text-muted)]">
                  Target
                </th>
                <th className="text-left px-5 py-3 font-medium text-[var(--text-muted)]">
                  Reason
                </th>
                <th className="text-left px-5 py-3 font-medium text-[var(--text-muted)]">
                  Status
                </th>
                <th className="text-left px-5 py-3 font-medium text-[var(--text-muted)]">
                  Date
                </th>
                <th className="text-right px-5 py-3 font-medium text-[var(--text-muted)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-[var(--text-muted)]"
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
                      className="border-b border-[var(--border)]/50 last:border-0 hover:bg-[var(--background)] transition-colors motion-reduce:transition-none"
                    >
                      <td className="px-5 py-3">
                        <p className="font-medium text-[var(--text)]">
                          {report.reporter?.full_name || "N/A"}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {report.reporter?.email}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--background)] text-[var(--text-muted)] border border-[var(--border)] capitalize">
                          {report.target_type}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-[var(--text)] max-w-[200px] truncate">
                          {report.reason}
                        </p>
                        {report.description && (
                          <p className="text-xs text-[var(--text-muted)] max-w-[200px] truncate mt-0.5">
                            {report.description}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={clsx(
                            "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium",
                            config.color
                          )}
                        >
                          <config.icon size={10} aria-hidden="true" />
                          {config.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[var(--text-muted)]">
                        {new Date(report.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {report.status === "pending" && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => updateStatus(report.id, "reviewed")}
                              className="px-3 py-1 rounded-lg text-xs font-medium bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20 transition-colors motion-reduce:transition-none"
                            >
                              Review
                            </button>
                            <button
                              type="button"
                              onClick={() => updateStatus(report.id, "resolved")}
                              className="px-3 py-1 rounded-lg text-xs font-medium bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20 transition-colors motion-reduce:transition-none"
                            >
                              Resolve
                            </button>
                            <button
                              type="button"
                              onClick={() => updateStatus(report.id, "dismissed")}
                              className="px-3 py-1 rounded-lg text-xs font-medium bg-[var(--background)] text-[var(--text-muted)] hover:bg-[var(--border)] transition-colors motion-reduce:transition-none"
                            >
                              Dismiss
                            </button>
                          </div>
                        )}
                        {report.status === "reviewed" && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => updateStatus(report.id, "resolved")}
                              className="px-3 py-1 rounded-lg text-xs font-medium bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20 transition-colors motion-reduce:transition-none"
                            >
                              Resolve
                            </button>
                            <button
                              type="button"
                              onClick={() => updateStatus(report.id, "dismissed")}
                              className="px-3 py-1 rounded-lg text-xs font-medium bg-[var(--background)] text-[var(--text-muted)] hover:bg-[var(--border)] transition-colors motion-reduce:transition-none"
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

"use client";

import { AdminShell } from "@/components/AdminShell";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";
import {
  Eye,
  EyeOff,
  GitMerge,
  Lock,
  MessageSquare,
  Search,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { format } from "date-fns";

interface AdminReport {
  id: string;
  title: string;
  status: string;
  category: string;
  is_hidden: boolean;
  comments_locked: boolean;
  duplicate_of: string | null;
  created_at: string;
  creator: { display_name: string } | null;
}

export default function AdminReportsPage() {
  const { user, profile } = useAuth();
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user || !profile?.is_admin) return;

    const fetchReports = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("reports")
        .select(
          "id, title, status, category, is_hidden, comments_locked, duplicate_of, created_at, creator:profiles!reports_creator_id_fkey(display_name)"
        )
        .order("created_at", { ascending: false });

      if (data) {
        setReports(
          data.map((r) => ({
            ...r,
            creator: Array.isArray(r.creator) ? r.creator[0] : r.creator,
          })) as AdminReport[]
        );
      }
      setLoadingReports(false);
    };

    fetchReports();
  }, [user, profile]);

  const toggleHidden = async (reportId: string, currentHidden: boolean) => {
    const supabase = createClient();
    await supabase.from("reports").update({ is_hidden: !currentHidden }).eq("id", reportId);
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, is_hidden: !currentHidden } : r))
    );
  };

  const toggleLocked = async (reportId: string, currentLocked: boolean) => {
    const supabase = createClient();
    await supabase.from("reports").update({ comments_locked: !currentLocked }).eq("id", reportId);
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, comments_locked: !currentLocked } : r))
    );
  };

  const markAsDuplicate = async (reportId: string) => {
    const originalId = prompt("Enter the original report ID this is a duplicate of:");
    if (!originalId?.trim()) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("reports")
      .update({ duplicate_of: originalId.trim() })
      .eq("id", reportId);
    if (!error) {
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, duplicate_of: originalId.trim() } : r))
      );
    }
  };

  const clearDuplicate = async (reportId: string) => {
    const supabase = createClient();
    await supabase.from("reports").update({ duplicate_of: null }).eq("id", reportId);
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, duplicate_of: null } : r))
    );
  };

  const filtered = reports.filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.creator?.display_name?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400";
      case "acknowledged": return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400";
      case "in_progress": return "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400";
      case "closed": return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400";
      default: return "bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400";
    }
  };

  return (
    <AdminShell>
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Reports</h1>
            <p className="text-[13px] text-[#5D6B7A] dark:text-[#9CA8A7] mt-0.5">
              {filtered.length} report{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5D6B7A] dark:text-[#9CA8A7]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reports..."
              className="w-full pl-10 pr-4 py-2 text-[13px] rounded-lg border border-[#E8E2D8] dark:border-[#2D2833] bg-white dark:bg-[#1E1A22] text-foreground placeholder:text-[#5D6B7A] dark:placeholder:text-[#9CA8A7] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
            />
          </div>
        </div>

        {/* Loading */}
        {loadingReports ? (
          <div className="admin-card overflow-hidden">
            <div className="space-y-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 border-b border-[#F0EBE3] dark:border-[#2D2833] animate-pulse" />
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="admin-card p-12 text-center">
            <p className="text-[13px] text-[#5D6B7A] dark:text-[#9CA8A7]">No reports found.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block admin-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#F0EBE3] dark:bg-[#1A1620]">
                      <th className="text-left text-[11px] font-semibold text-[#5D6B7A] dark:text-[#9CA8A7] uppercase tracking-wider px-4 py-3">Title</th>
                      <th className="text-left text-[11px] font-semibold text-[#5D6B7A] dark:text-[#9CA8A7] uppercase tracking-wider px-4 py-3">Creator</th>
                      <th className="text-left text-[11px] font-semibold text-[#5D6B7A] dark:text-[#9CA8A7] uppercase tracking-wider px-4 py-3">Status</th>
                      <th className="text-left text-[11px] font-semibold text-[#5D6B7A] dark:text-[#9CA8A7] uppercase tracking-wider px-4 py-3">Category</th>
                      <th className="text-left text-[11px] font-semibold text-[#5D6B7A] dark:text-[#9CA8A7] uppercase tracking-wider px-4 py-3">Flags</th>
                      <th className="text-left text-[11px] font-semibold text-[#5D6B7A] dark:text-[#9CA8A7] uppercase tracking-wider px-4 py-3">Date</th>
                      <th className="text-right text-[11px] font-semibold text-[#5D6B7A] dark:text-[#9CA8A7] uppercase tracking-wider px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((report) => (
                      <tr
                        key={report.id}
                        className="border-b border-[#F0EBE3] dark:border-[#242028] hover:bg-[#FAF7F3] dark:hover:bg-[#242028] transition-colors"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/report/${report.id}`}
                            className="text-[13px] font-medium text-foreground hover:text-[var(--primary)] transition-colors line-clamp-1 max-w-[220px] block"
                          >
                            {report.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[13px] text-[#5D6B7A] dark:text-[#9CA8A7]">
                            {report.creator?.display_name ?? "Unknown"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("admin-badge", statusColor(report.status))}>
                            {report.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[13px] text-[#5D6B7A] dark:text-[#9CA8A7] capitalize">
                            {report.category}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {report.is_hidden && (
                              <span className="admin-badge bg-red-50 text-red-500 dark:bg-red-500/10">Hidden</span>
                            )}
                            {report.comments_locked && (
                              <span className="admin-badge bg-amber-50 text-amber-600 dark:bg-amber-500/10">Locked</span>
                            )}
                            {report.duplicate_of && (
                              <span className="admin-badge bg-purple-50 text-purple-600 dark:bg-purple-500/10">Duplicate</span>
                            )}
                            {!report.is_hidden && !report.comments_locked && !report.duplicate_of && (
                              <span className="text-[11px] text-[#5D6B7A] dark:text-[#9CA8A7]">&mdash;</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[13px] text-[#5D6B7A] dark:text-[#9CA8A7] whitespace-nowrap">
                            {format(new Date(report.created_at), "MMM d, yyyy")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => toggleHidden(report.id, report.is_hidden)}
                              title={report.is_hidden ? "Unhide" : "Hide"}
                              className={cn(
                                "admin-action-btn",
                                report.is_hidden && "!text-red-500 !bg-red-50 dark:!bg-red-500/10"
                              )}
                            >
                              {report.is_hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => toggleLocked(report.id, report.comments_locked)}
                              title={report.comments_locked ? "Unlock comments" : "Lock comments"}
                              className={cn(
                                "admin-action-btn",
                                report.comments_locked && "!text-amber-600 !bg-amber-50 dark:!bg-amber-500/10"
                              )}
                            >
                              {report.comments_locked ? <Lock className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                            </button>
                            {report.duplicate_of ? (
                              <button
                                onClick={() => clearDuplicate(report.id)}
                                title="Clear duplicate"
                                className="admin-action-btn !text-purple-600 !bg-purple-50 dark:!bg-purple-500/10"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => markAsDuplicate(report.id)}
                                title="Mark as duplicate"
                                className="admin-action-btn"
                              >
                                <GitMerge className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-2">
              {filtered.map((report) => (
                <div key={report.id} className="admin-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/report/${report.id}`}
                        className="text-[13px] font-semibold text-foreground hover:text-[var(--primary)] transition-colors line-clamp-1"
                      >
                        {report.title}
                      </Link>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={cn("admin-badge", statusColor(report.status))}>
                          {report.status.replace("_", " ")}
                        </span>
                        <span className="text-[11px] text-[#5D6B7A] dark:text-[#9CA8A7] capitalize">{report.category}</span>
                        {report.is_hidden && (
                          <span className="admin-badge bg-red-50 text-red-500 dark:bg-red-500/10">Hidden</span>
                        )}
                        {report.comments_locked && (
                          <span className="admin-badge bg-amber-50 text-amber-600 dark:bg-amber-500/10">Locked</span>
                        )}
                        {report.duplicate_of && (
                          <span className="admin-badge bg-purple-50 text-purple-600 dark:bg-purple-500/10">Duplicate</span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#5D6B7A] dark:text-[#9CA8A7] mt-1">
                        by {report.creator?.display_name ?? "Unknown"} &middot; {format(new Date(report.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => toggleHidden(report.id, report.is_hidden)}
                        title={report.is_hidden ? "Unhide" : "Hide"}
                        className={cn(
                          "admin-action-btn",
                          report.is_hidden && "!text-red-500 !bg-red-50 dark:!bg-red-500/10"
                        )}
                      >
                        {report.is_hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => toggleLocked(report.id, report.comments_locked)}
                        title={report.comments_locked ? "Unlock comments" : "Lock comments"}
                        className={cn(
                          "admin-action-btn",
                          report.comments_locked && "!text-amber-600 !bg-amber-50 dark:!bg-amber-500/10"
                        )}
                      >
                        {report.comments_locked ? <Lock className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                      </button>
                      {report.duplicate_of ? (
                        <button
                          onClick={() => clearDuplicate(report.id)}
                          title="Clear duplicate"
                          className="admin-action-btn !text-purple-600 !bg-purple-50 dark:!bg-purple-500/10"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => markAsDuplicate(report.id)}
                          title="Mark as duplicate"
                          className="admin-action-btn"
                        >
                          <GitMerge className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}

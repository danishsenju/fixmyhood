"use client";

import { AdminShell } from "@/components/AdminShell";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";
import {
  CheckCircle2,
  ExternalLink,
  EyeOff,
  Flag,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { format } from "date-fns";

interface FlagItem {
  id: string;
  content_type: "report" | "comment";
  content_id: string;
  reason: string;
  status: "pending" | "reviewed" | "dismissed";
  created_at: string;
  reporter: { display_name: string; avatar_url: string | null } | null;
  contentTitle?: string;
  contentPreview?: string;
  reportId?: string;
}

export default function AdminFlaggedPage() {
  const { user, profile } = useAuth();
  const [flags, setFlags] = useState<FlagItem[]>([]);
  const [loadingFlags, setLoadingFlags] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "reviewed" | "dismissed">("pending");

  useEffect(() => {
    if (!user || !profile?.is_admin) return;

    const fetchFlags = async () => {
      const supabase = createClient();
      const { data: flagsData } = await supabase
        .from("flags")
        .select(
          "id, content_type, content_id, reason, status, created_at, reporter:profiles!flags_reporter_id_fkey(display_name, avatar_url)"
        )
        .order("created_at", { ascending: false });

      if (!flagsData) {
        setLoadingFlags(false);
        return;
      }

      // Batch-fetch content by type instead of N+1 loop
      const reportIds = flagsData.filter((f) => f.content_type === "report").map((f) => f.content_id);
      const commentIds = flagsData.filter((f) => f.content_type === "comment").map((f) => f.content_id);

      const [reportsResult, commentsResult] = await Promise.all([
        reportIds.length > 0
          ? supabase.from("reports").select("id, title").in("id", reportIds)
          : Promise.resolve({ data: [] }),
        commentIds.length > 0
          ? supabase.from("comments").select("id, content, report_id").in("id", commentIds)
          : Promise.resolve({ data: [] }),
      ]);

      const reportMap = new Map((reportsResult.data ?? []).map((r) => [r.id, r]));
      const commentMap = new Map((commentsResult.data ?? []).map((c) => [c.id, c]));

      const resolved: FlagItem[] = flagsData.map((flag) => {
        const reporter = Array.isArray(flag.reporter) ? flag.reporter[0] : flag.reporter;
        const item: FlagItem = {
          ...flag,
          reporter: reporter as { display_name: string; avatar_url: string | null } | null,
        };

        if (flag.content_type === "report") {
          const report = reportMap.get(flag.content_id);
          if (report) {
            item.contentTitle = report.title;
            item.reportId = report.id;
          }
        } else if (flag.content_type === "comment") {
          const comment = commentMap.get(flag.content_id);
          if (comment) {
            item.contentPreview = comment.content.slice(0, 100);
            item.reportId = comment.report_id;
          }
        }

        return item;
      });

      setFlags(resolved);
      setLoadingFlags(false);
    };

    fetchFlags();
  }, [user, profile]);

  const dismissFlag = async (flagId: string) => {
    const supabase = createClient();
    await supabase.from("flags").update({ status: "dismissed" }).eq("id", flagId);
    setFlags((prev) =>
      prev.map((f) => (f.id === flagId ? { ...f, status: "dismissed" } : f))
    );
  };

  const hideContentAndReview = async (flag: FlagItem) => {
    const supabase = createClient();

    if (flag.content_type === "report") {
      await supabase.from("reports").update({ is_hidden: true }).eq("id", flag.content_id);
    } else {
      await supabase.from("comments").update({ is_hidden: true }).eq("id", flag.content_id);
    }

    await supabase.from("flags").update({ status: "reviewed" }).eq("id", flag.id);
    setFlags((prev) =>
      prev.map((f) => (f.id === flag.id ? { ...f, status: "reviewed" } : f))
    );
  };

  const filtered = flags.filter((f) => filter === "all" || f.status === filter);

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending": return "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400";
      case "reviewed": return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400";
      case "dismissed": return "bg-[#F0EBE3] text-[#5D6B7A] dark:bg-[#2D2833] dark:text-[#9CA8A7]";
      default: return "";
    }
  };

  const filterTabs = ["pending", "reviewed", "dismissed", "all"] as const;

  return (
    <AdminShell>
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Flagged Content</h1>
            <p className="text-[13px] text-[#5D6B7A] dark:text-[#9CA8A7] mt-0.5">
              {filtered.length} flag{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex border border-[#E8E2D8] dark:border-[#2D2833] rounded-lg overflow-hidden">
          {filterTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={cn(
                "flex-1 py-2 text-[12px] font-medium text-center capitalize transition-all duration-150",
                filter === tab
                  ? "bg-[var(--primary)] text-white"
                  : "bg-white dark:bg-[#1E1A22] text-[#5D6B7A] dark:text-[#9CA8A7] hover:bg-[#FAF7F3] dark:hover:bg-[#242028]"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Flags List */}
        {loadingFlags ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="admin-card h-32 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="admin-card p-12 text-center">
            <Flag className="h-8 w-8 text-[#5D6B7A]/30 dark:text-[#9CA8A7]/30 mx-auto mb-2" />
            <p className="text-[13px] text-[#5D6B7A] dark:text-[#9CA8A7]">
              No {filter === "all" ? "" : filter} flags.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((flag) => (
              <div key={flag.id} className="admin-card p-5 space-y-3">
                {/* Flag header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-[#E8E2D8] dark:bg-[#2D2833] flex-shrink-0">
                      {flag.reporter?.avatar_url ? (
                        <Image src={flag.reporter.avatar_url} alt="" width={28} height={28} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#5D6B7A] dark:text-[#9CA8A7] text-[10px] font-bold">
                          {flag.reporter?.display_name?.charAt(0)?.toUpperCase() ?? "?"}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-foreground">
                        {flag.reporter?.display_name ?? "Unknown"}{" "}
                        <span className="font-normal text-[#5D6B7A] dark:text-[#9CA8A7]">
                          flagged a {flag.content_type}
                        </span>
                      </p>
                      <p className="text-[11px] text-[#5D6B7A] dark:text-[#9CA8A7]">
                        {format(new Date(flag.created_at), "MMM d, yyyy h:mm a")}
                      </p>
                    </div>
                  </div>
                  <span className={cn("admin-badge capitalize", statusBadge(flag.status))}>
                    {flag.status}
                  </span>
                </div>

                {/* Reason */}
                <div className="bg-[#FAF7F3] dark:bg-[#1A1620] rounded-lg p-3">
                  <p className="text-[11px] text-[#5D6B7A] dark:text-[#9CA8A7] mb-1 font-medium uppercase tracking-wider">Reason</p>
                  <p className="text-[13px] text-foreground">{flag.reason}</p>
                </div>

                {/* Flagged content preview */}
                <div className="bg-[#FAF7F3] dark:bg-[#1A1620] rounded-lg p-3 border border-[#E8E2D8] dark:border-[#2D2833]">
                  <p className="text-[11px] text-[#5D6B7A] dark:text-[#9CA8A7] mb-1 font-medium uppercase tracking-wider">
                    Flagged {flag.content_type}
                  </p>
                  <p className="text-[13px] text-foreground/80 line-clamp-2">
                    {flag.contentTitle || flag.contentPreview || "Content not found"}
                  </p>
                  {flag.reportId && (
                    <Link
                      href={`/report/${flag.reportId}`}
                      className="inline-flex items-center gap-1 text-[12px] text-[var(--primary)] hover:underline mt-2"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Report
                    </Link>
                  )}
                </div>

                {/* Actions */}
                {flag.status === "pending" && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => hideContentAndReview(flag)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-[12px] font-medium py-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                      Hide & Review
                    </button>
                    <button
                      onClick={() => dismissFlag(flag.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-[12px] font-medium py-2 rounded-lg bg-[#F0EBE3] dark:bg-[#2D2833] text-[#5D6B7A] dark:text-[#9CA8A7] hover:bg-[#E8E2D8] dark:hover:bg-[#3C3541] transition-colors"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Dismiss
                    </button>
                  </div>
                )}

                {flag.status === "reviewed" && (
                  <div className="flex items-center gap-1.5 text-[12px] text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Content hidden
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}

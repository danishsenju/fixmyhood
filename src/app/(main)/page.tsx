"use client";

import { AppShell } from "@/components/AppShell";
import { ReportCard } from "@/components/ReportCard";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import { Search, Shield } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface FeedReport {
  id: string;
  title: string;
  category: string;
  status: "open" | "acknowledged" | "in_progress" | "closed";
  photo_url: string | null;
  location_text: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

const statusFilters = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "closed", label: "Resolved" },
] as const;

const categoryFilters = [
  { value: "all", label: "All" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "safety", label: "Safety" },
  { value: "cleanliness", label: "Cleanliness" },
  { value: "environment", label: "Environment" },
  { value: "other", label: "Other" },
] as const;

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth();
  const [reports, setReports] = useState<FeedReport[]>([]);
  const [followersCounts, setFollowersCounts] = useState<Record<string, number>>({});
  const [commentsCounts, setCommentsCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const { data } = await supabase
      .from("reports")
      .select(
        "id, title, category, status, photo_url, location_text, latitude, longitude, created_at"
      )
      .eq("is_hidden", false)
      .is("duplicate_of", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data && data.length > 0) {
      setReports(data as FeedReport[]);

      const ids = data.map((r) => r.id);

      // Fetch followers and comments counts in parallel
      const [followersResult, commentsResult] = await Promise.all([
        supabase
          .from("followers")
          .select("report_id")
          .in("report_id", ids),
        supabase
          .from("comments")
          .select("report_id")
          .in("report_id", ids)
          .eq("is_hidden", false),
      ]);

      // Count followers per report
      const fCounts: Record<string, number> = {};
      followersResult.data?.forEach((f) => {
        fCounts[f.report_id] = (fCounts[f.report_id] || 0) + 1;
      });
      setFollowersCounts(fCounts);

      // Count comments per report
      const cCounts: Record<string, number> = {};
      commentsResult.data?.forEach((c) => {
        cCounts[c.report_id] = (cCounts[c.report_id] || 0) + 1;
      });
      setCommentsCounts(cCounts);
    } else {
      setReports([]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading) fetchReports();
  }, [authLoading, fetchReports]);

  // Filter reports client-side
  const filtered = reports.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!r.title.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-background pb-20 lg:pb-6 page-enter">
        {/* Header */}
        <div className="sticky top-0 z-40 glass glass-highlight border-b border-white/20 dark:border-white/5 px-4 py-3 safe-top">
          <div className="max-w-lg lg:max-w-3xl xl:max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-[var(--primary)]" />
              <h1 className="text-lg font-bold text-foreground">FixMyHood</h1>
            </div>
          </div>
        </div>

        <div className="max-w-lg lg:max-w-3xl xl:max-w-4xl mx-auto px-4 py-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none transition-shadow"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex glass rounded-xl p-1">
            {statusFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  "flex-1 py-2 text-sm font-medium text-center rounded-lg transition-all duration-200",
                  statusFilter === f.value
                    ? "bg-[var(--primary)] text-white shadow-[0_2px_8px_rgba(184,131,95,0.25)]"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Category Filter Chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categoryFilters.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategoryFilter(c.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all duration-200",
                  categoryFilter === c.value
                    ? "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/30"
                    : "bg-card text-muted-foreground border-border hover:border-[var(--primary)]/30"
                )}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Reports Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-sm">
                {reports.length === 0
                  ? "No reports yet. Be the first to report an issue!"
                  : "No reports match your filters."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((report) => (
                <ReportCard
                  key={report.id}
                  id={report.id}
                  title={report.title}
                  status={report.status}
                  category={report.category}
                  photoUrl={report.photo_url}
                  locationText={report.location_text}
                  createdAt={report.created_at}
                  followersCount={followersCounts[report.id] || 0}
                  commentsCount={commentsCounts[report.id] || 0}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

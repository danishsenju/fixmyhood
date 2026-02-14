"use client";

import { AppShell } from "@/components/AppShell";
import { ReportCard } from "@/components/ReportCard";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { getDistanceKm } from "@/lib/utils/distance";
import { cn } from "@/lib/utils/cn";
import {
  Search,
  TrendingUp,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Navigation,
  SlidersHorizontal,
} from "lucide-react";
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
  const { user, profile, loading: authLoading } = useAuth();
  const [reports, setReports] = useState<FeedReport[]>([]);
  const [followersCounts, setFollowersCounts] = useState<Record<string, number>>({});
  const [commentsCounts, setCommentsCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyMode, setNearbyMode] = useState(false);

  // Get user location
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setNearbyMode(true);
      },
      () => {
        // Location denied or unavailable
      }
    );
  }, []);

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

      const fCounts: Record<string, number> = {};
      followersResult.data?.forEach((f) => {
        fCounts[f.report_id] = (fCounts[f.report_id] || 0) + 1;
      });
      setFollowersCounts(fCounts);

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

  // Compute stats
  const totalReports = reports.length;
  const openIssues = reports.filter((r) => r.status === "open" || r.status === "acknowledged").length;
  const inProgressCount = reports.filter((r) => r.status === "in_progress").length;
  const resolvedCount = reports.filter((r) => r.status === "closed").length;

  // Filter and optionally sort by distance
  const filtered = reports
    .map((r) => {
      let distanceKm: number | null = null;
      if (userLocation && r.latitude != null && r.longitude != null) {
        distanceKm = getDistanceKm(userLocation.lat, userLocation.lng, r.latitude, r.longitude);
      }
      return { ...r, distanceKm };
    })
    .filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!r.title.toLowerCase().includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (nearbyMode && a.distanceKm != null && b.distanceKm != null) {
        return a.distanceKm - b.distanceKm;
      }
      return 0;
    });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "there";

  return (
    <AppShell>
      <div className="min-h-screen bg-background pb-20 lg:pb-6 page-enter">
        <div className="max-w-lg lg:max-w-3xl xl:max-w-4xl mx-auto px-4 py-6 space-y-5">
          {/* Welcome Header */}
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Welcome back, {displayName}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Stay updated with your community reports
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="card-surface rounded-xl p-3">
              <TrendingUp className="h-5 w-5 text-[var(--primary)] mb-2" />
              <p className="text-lg font-bold text-foreground">{totalReports}</p>
              <p className="text-[11px] text-muted-foreground">Total Reports</p>
            </div>
            <div className="card-surface rounded-xl p-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mb-2" />
              <p className="text-lg font-bold text-foreground">{openIssues}</p>
              <p className="text-[11px] text-muted-foreground">Open Issues</p>
            </div>
            <div className="card-surface rounded-xl p-3">
              <Loader2 className="h-5 w-5 text-blue-500 mb-2" />
              <p className="text-lg font-bold text-foreground">{inProgressCount}</p>
              <p className="text-[11px] text-muted-foreground">In Progress</p>
            </div>
            <div className="card-surface rounded-xl p-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 mb-2" />
              <p className="text-lg font-bold text-foreground">{resolvedCount}</p>
              <p className="text-[11px] text-muted-foreground">Resolved</p>
            </div>
          </div>

          {/* Search with Nearby + Filter */}
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reports, locations..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none transition-shadow"
              />
            </div>
            <button
              onClick={() => {
                if (nearbyMode) {
                  setNearbyMode(false);
                } else {
                  requestLocation();
                }
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all whitespace-nowrap",
                nearbyMode
                  ? "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/30"
                  : "bg-card text-muted-foreground border-border hover:border-[var(--primary)]/30"
              )}
            >
              <Navigation className="h-3.5 w-3.5" />
              Nearby
            </button>
            <button className="p-2.5 rounded-xl bg-card border border-border text-muted-foreground hover:border-[var(--primary)]/30 transition-colors">
              <SlidersHorizontal className="h-4 w-4" />
            </button>
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
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
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

          {/* Recent Reports Heading */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Recent Reports</h2>
            <span className="text-xs text-muted-foreground">
              {filtered.length} of {reports.length}
            </span>
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
                  distanceKm={report.distanceKm}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

"use client";

import { AppShell } from "@/components/AppShell";
import { ProfileFrame, FrameType } from "@/components/ProfileFrame";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import {
  ArrowLeft,
  Award,
  BarChart3,
  Lock,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface PublicProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  points: number;
  active_frame: string;
  created_at: string;
}

interface UserBadge {
  badge_type: "first_report" | "helper" | "resolver";
  earned_at: string;
}

interface RecentActivity {
  id: string;
  title: string;
  status: "open" | "acknowledged" | "in_progress" | "closed";
  created_at: string;
}

const badgeConfig: Record<
  string,
  { label: string; icon: typeof Award; color: string; bgColor: string; darkBgColor: string }
> = {
  first_report: {
    label: "First Responder",
    icon: Award,
    color: "text-yellow-500",
    bgColor: "bg-yellow-50 border-yellow-200",
    darkBgColor: "dark:bg-yellow-500/10 dark:border-yellow-500/20",
  },
  helper: {
    label: "Community Helper",
    icon: Users,
    color: "text-cyan-500",
    bgColor: "bg-cyan-50 border-cyan-200",
    darkBgColor: "dark:bg-cyan-500/10 dark:border-cyan-500/20",
  },
  resolver: {
    label: "Problem Solver",
    icon: Lock,
    color: "text-purple-500",
    bgColor: "bg-purple-50 border-purple-200",
    darkBgColor: "dark:bg-purple-500/10 dark:border-purple-500/20",
  },
};

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [recentReports, setRecentReports] = useState<RecentActivity[]>([]);
  const [totalReports, setTotalReports] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If viewing own profile, redirect to /profile
    if (user && user.id === id) {
      router.replace("/profile");
      return;
    }

    const fetchPublicProfile = async () => {
      const supabase = createClient();

      const [profileResult, badgeResult, reportResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, display_name, avatar_url, points, active_frame, created_at")
          .eq("id", id)
          .single(),
        supabase
          .from("user_badges")
          .select("badge_type, earned_at")
          .eq("user_id", id),
        supabase
          .from("reports")
          .select("id, title, status, created_at", { count: "exact" })
          .eq("creator_id", id)
          .eq("is_hidden", false)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (profileResult.data) setProfile(profileResult.data);
      if (badgeResult.data) setBadges(badgeResult.data);
      if (reportResult.data) setRecentReports(reportResult.data);
      setTotalReports(reportResult.count ?? 0);

      setLoading(false);
    };

    if (id) fetchPublicProfile();
  }, [id, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">User not found</p>
      </div>
    );
  }

  const joinedDate = new Date(profile.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const activeFrame = (profile.active_frame as FrameType) || "default";

  return (
    <AppShell>
      <div className="min-h-screen bg-background pb-20 lg:pb-6 page-enter">
        {/* Header */}
        <div className="sticky top-0 z-40 glass glass-highlight border-b border-white/20 dark:border-white/5 px-4 py-3 safe-top lg:hidden">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button onClick={() => router.back()} className="text-foreground hover:text-[var(--primary)] transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold text-foreground">{profile.display_name}</h1>
          </div>
        </div>

        {/* Profile Header */}
        <div className="bg-gradient-to-b from-[var(--primary)] to-[var(--primary)]/80 pt-8 pb-10">
          <div className="max-w-lg mx-auto flex flex-col items-center">
            <ProfileFrame
              avatarUrl={profile.avatar_url}
              displayName={profile.display_name}
              frame={activeFrame}
              size="xl"
            />
            <h1 className="text-xl font-bold text-white mt-3">{profile.display_name}</h1>
            <p className="text-white/70 text-sm">Joined {joinedDate}</p>
          </div>
        </div>

        <div className="max-w-lg lg:max-w-3xl xl:max-w-4xl mx-auto px-4 -mt-4">
          {/* Stats */}
          <div className="card-surface rounded-2xl p-5 mb-5">
            <h2 className="text-base font-bold text-foreground mb-4">Stats</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center">
                <BarChart3 className="h-6 w-6 text-[var(--primary)] mb-1" />
                <p className="text-xl font-bold text-foreground">{totalReports}</p>
                <p className="text-xs text-muted-foreground">Total Reports</p>
              </div>
              <div className="flex flex-col items-center">
                <TrendingUp className="h-6 w-6 text-[var(--primary)] mb-1" />
                <p className="text-xl font-bold text-foreground">{profile.points}</p>
                <p className="text-xs text-muted-foreground">Points Earned</p>
              </div>
              <div className="flex flex-col items-center">
                <Users className="h-6 w-6 text-[var(--primary)] mb-1" />
                <p className="text-xl font-bold text-foreground">
                  {totalReports > 0 ? Math.min(10, profile.points / 100).toFixed(1) : "0.0"}
                </p>
                <p className="text-xs text-muted-foreground">Impact Score</p>
              </div>
            </div>
          </div>

          {/* Achievements */}
          <div className="card-surface rounded-2xl p-5 mb-5">
            <h2 className="text-base font-bold text-foreground mb-4">Achievements</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(badgeConfig).map(([type, config]) => {
                const earned = badges.find((b) => b.badge_type === type);
                const Icon = config.icon;
                return (
                  <div
                    key={type}
                    className={cn(
                      "rounded-xl border p-4 flex flex-col items-center gap-2 transition-opacity",
                      earned
                        ? `${config.bgColor} ${config.darkBgColor}`
                        : "bg-muted border-border opacity-50"
                    )}
                  >
                    <Icon className={cn("h-8 w-8", earned ? config.color : "text-muted-foreground")} />
                    <span className="text-xs font-medium text-foreground text-center">{config.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card-surface rounded-2xl p-5">
            <h2 className="text-base font-bold text-foreground mb-4">Recent Activity</h2>
            {recentReports.length === 0 ? (
              <p className="text-sm text-muted-foreground/70 text-center py-4">No activity yet.</p>
            ) : (
              <div className="space-y-4">
                {recentReports.map((report) => (
                  <Link
                    key={report.id}
                    href={`/report/${report.id}`}
                    className="flex items-start gap-3 group"
                  >
                    <div className="w-2 h-2 rounded-full bg-[var(--primary)] mt-1.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-foreground group-hover:text-[var(--primary)] transition-colors line-clamp-1">
                          {report.title}
                        </p>
                        <span className={cn(
                          "flex-shrink-0 text-[10px] font-semibold px-2 py-[3px] rounded-full",
                          `status-${report.status}`
                        )}>
                          {report.status === "open" ? "Open"
                            : report.status === "in_progress" ? "In Progress"
                            : report.status === "acknowledged" ? "Acknowledged"
                            : "Resolved"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground/70">
                        {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

"use client";

import { AppShell } from "@/components/AppShell";
import { ProfileFrame, FrameSelector, FrameType } from "@/components/ProfileFrame";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import {
  ArrowRight,
  Award,
  BarChart3,
  Lock,
  LogOut,
  Palette,
  Shield,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import fmhLogo from "@/images/fmhlogo.png";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

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

const badgeToFrame: Record<string, FrameType> = {
  first_report: "first_report",
  helper: "helper",
  resolver: "resolver",
};

export default function ProfilePage() {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const router = useRouter();

  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [recentReports, setRecentReports] = useState<RecentActivity[]>([]);
  const [totalReports, setTotalReports] = useState(0);
  const [showFrameSelector, setShowFrameSelector] = useState(false);
  const [frameOverride, setFrameOverride] = useState<FrameType | null>(null);

  const activeFrame: FrameType = frameOverride ?? ((profile?.active_frame as FrameType) || "default");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;

    const fetchProfileData = async () => {
      const supabase = createClient();

      const [badgeResult, reportResult] = await Promise.all([
        supabase
          .from("user_badges")
          .select("badge_type, earned_at")
          .eq("user_id", user.id),
        supabase
          .from("reports")
          .select("id, title, status, created_at", { count: "exact" })
          .eq("creator_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (badgeResult.data) setBadges(badgeResult.data);
      if (reportResult.data) setRecentReports(reportResult.data);
      setTotalReports(reportResult.count ?? 0);
    };

    fetchProfileData();
  }, [user]);

  const handleFrameSelect = async (frame: FrameType) => {
    if (!user) return;
    setFrameOverride(frame);
    const supabase = createClient();
    await supabase.from("profiles").update({ active_frame: frame }).eq("id", user.id);
    await refreshProfile();
  };

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const joinedDate = new Date(profile.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const unlockedFrames: FrameType[] = [
    "default",
    ...badges.map((b) => badgeToFrame[b.badge_type]).filter(Boolean) as FrameType[],
  ];

  return (
    <AppShell>
      <div className="min-h-screen bg-background pb-20 lg:pb-6 page-enter">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-40 glass glass-highlight border-b border-white/20 dark:border-white/5 px-4 py-3 safe-top">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg overflow-hidden shadow-[0_2px_8px_rgba(184,131,95,0.3)]">
                <Image src={fmhLogo} alt="FixMyHood" width={32} height={32} className="w-full h-full object-cover" />
              </div>
              <span className="text-base font-semibold text-foreground tracking-tight">Profile</span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={signOut}
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-destructive transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Profile Header */}
        <div className="bg-gradient-to-b from-[var(--primary)] to-[var(--primary)]/80 pt-8 pb-10">
          <div className="max-w-lg lg:max-w-3xl xl:max-w-4xl mx-auto flex flex-col items-center">
            <div className="relative">
              <ProfileFrame
                avatarUrl={profile.avatar_url}
                displayName={profile.display_name}
                frame={activeFrame}
                size="xl"
              />
              <button
                onClick={() => setShowFrameSelector(true)}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/30 hover:bg-white/30 transition-colors"
              >
                <Palette className="h-4 w-4 text-white" />
              </button>
            </div>
            <h1 className="text-xl font-bold text-white mt-3">
              {profile.display_name}
            </h1>
            <p className="text-white/70 text-sm">Joined {joinedDate}</p>
          </div>
        </div>

        <div className="max-w-lg lg:max-w-3xl xl:max-w-4xl mx-auto px-4 -mt-4">
          {/* Stats */}
          <div className="card-surface rounded-2xl p-5 mb-5">
            <h2 className="text-base font-bold text-foreground mb-4">Your Stats</h2>
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
                    {earned && (
                      <div className="w-full bg-[var(--primary)]/20 rounded-full h-1">
                        <div className="bg-[var(--primary)] h-1 rounded-full w-full" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card-surface rounded-2xl p-5">
            <h2 className="text-base font-bold text-foreground mb-4">Recent Activity</h2>
            {recentReports.length === 0 ? (
              <p className="text-sm text-muted-foreground/70 text-center py-4">
                No activity yet. Start by reporting an issue!
              </p>
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

        {/* Admin Dashboard Link */}
        {profile.is_admin && (
          <Link href="/admin" className="card-surface rounded-2xl p-5 flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground group-hover:text-[var(--primary)] transition-colors">
                Admin Dashboard
              </p>
              <p className="text-xs text-muted-foreground">Manage reports, users, and flags</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-[var(--primary)] transition-colors" />
          </Link>
        )}

        {/* Frame Selector Modal */}
        {showFrameSelector && (
          <div className="modal-overlay" onClick={() => setShowFrameSelector(false)}>
            <div className="modal-content card-surface p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground">Profile Frames</h3>
                <button onClick={() => setShowFrameSelector(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <FrameSelector
                currentFrame={activeFrame}
                unlockedFrames={unlockedFrames}
                onSelect={(frame) => {
                  handleFrameSelect(frame);
                  setShowFrameSelector(false);
                }}
                avatarUrl={profile.avatar_url}
                displayName={profile.display_name}
              />
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

"use client";

import { AppShell } from "@/components/AppShell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import {
  Bell,
  Eye,
  MessageCircle,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Wrench,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow, isToday, isYesterday, format } from "date-fns";

interface ActivityItem {
  id: string;
  type: "comment" | "following";
  report_id: string;
  report_title: string;
  report_status: string;
  author_name: string;
  author_avatar: string | null;
  content: string | null;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  open: { label: "Open", color: "text-red-500 bg-red-50 dark:bg-red-500/10", icon: AlertTriangle },
  acknowledged: { label: "Acknowledged", color: "text-amber-600 bg-amber-50 dark:bg-amber-500/10", icon: Bell },
  in_progress: { label: "In Progress", color: "text-blue-500 bg-blue-50 dark:bg-blue-500/10", icon: Wrench },
  closed: { label: "Resolved", color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10", icon: CheckCircle2 },
};

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
}

export default function ActivityPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "comments" | "following">("all");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;

    const fetchActivity = async () => {
      try {
        const supabase = createClient();

        // Fetch user's reports and followed reports in parallel
        const [userReportsResult, followedReportsResult] = await Promise.all([
          supabase.from("reports").select("id, title").eq("creator_id", user.id),
          supabase.from("followers").select("report_id").eq("user_id", user.id),
        ]);
        const userReports = userReportsResult.data;
        const followedReports = followedReportsResult.data;

        const reportIds = new Set<string>();
        userReports?.forEach((r) => reportIds.add(r.id));
        followedReports?.forEach((f) => reportIds.add(f.report_id));

        const items: ActivityItem[] = [];

        // Fetch comments and followed details in parallel
        const followedIds = followedReports?.map((f) => f.report_id) ?? [];
        const [commentsResult, followedDetailsResult] = await Promise.all([
          reportIds.size > 0
            ? supabase
                .from("comments")
                .select(
                  "id, report_id, content, created_at, user:profiles!comments_user_id_fkey(display_name, avatar_url), report:reports!comments_report_id_fkey(title, status)"
                )
                .in("report_id", Array.from(reportIds))
                .order("created_at", { ascending: false })
                .limit(30)
            : Promise.resolve({ data: null }),
          followedIds.length > 0
            ? supabase
                .from("reports")
                .select(
                  "id, title, status, updated_at, creator:profiles!reports_creator_id_fkey(display_name, avatar_url)"
                )
                .in("id", followedIds)
                .order("updated_at", { ascending: false })
                .limit(20)
            : Promise.resolve({ data: null }),
        ]);

        if (commentsResult.data) {
          commentsResult.data.forEach((c) => {
            const commentUser = Array.isArray(c.user) ? c.user[0] : c.user;
            const commentReport = Array.isArray(c.report) ? c.report[0] : c.report;
            items.push({
              id: `comment-${c.id}`,
              type: "comment",
              report_id: c.report_id,
              report_title: (commentReport as { title: string })?.title ?? "Report",
              report_status: (commentReport as { status: string })?.status ?? "open",
              author_name: (commentUser as { display_name: string })?.display_name ?? "Someone",
              author_avatar: (commentUser as { avatar_url: string | null })?.avatar_url ?? null,
              content: c.content,
              created_at: c.created_at,
            });
          });
        }

        if (followedDetailsResult.data) {
          followedDetailsResult.data.forEach((r) => {
            const creator = Array.isArray(r.creator) ? r.creator[0] : r.creator;
            items.push({
              id: `following-${r.id}`,
              type: "following",
              report_id: r.id,
              report_title: r.title,
              report_status: r.status,
              author_name: (creator as { display_name: string })?.display_name ?? "Someone",
              author_avatar: (creator as { avatar_url: string | null })?.avatar_url ?? null,
              content: null,
              created_at: r.updated_at,
            });
          });
        }

        items.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setActivities(items);
      } catch (error) {
        console.error("Failed to fetch activity:", error);
      } finally {
        setLoadingActivity(false);
      }
    };

    fetchActivity();
  }, [user]);

  const filteredActivities =
    activeTab === "all"
      ? activities
      : activities.filter((a) => a.type === activeTab);

  // Group by date
  const groupedActivities = useMemo(() => {
    const groups: { label: string; items: ActivityItem[] }[] = [];
    let currentLabel = "";
    for (const item of filteredActivities) {
      const label = getDateGroup(item.created_at);
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, items: [item] });
      } else {
        groups[groups.length - 1].items.push(item);
      }
    }
    return groups;
  }, [filteredActivities]);

  // Tab counts
  const commentCount = activities.filter((a) => a.type === "comment").length;
  const followingCount = activities.filter((a) => a.type === "following").length;

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-background pb-20 lg:pb-6 page-enter">
        {/* ── Mobile Header ──────────────────────── */}
        <div className="lg:hidden sticky top-0 z-40 glass glass-highlight border-b border-white/20 dark:border-white/5 px-4 py-3 safe-top">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <h1 className="text-lg font-bold text-foreground">Activity</h1>
            <ThemeToggle />
          </div>
        </div>

        <div className="max-w-lg lg:max-w-3xl mx-auto px-4 pt-5 lg:pt-8">
          {/* ── Page Title (desktop) ─────────────── */}
          <div className="hidden lg:block mb-6">
            <h1 className="text-xl font-bold text-foreground tracking-tight">Activity</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Updates from your reports and followed issues
            </p>
          </div>

          {/* ── Quick Stats ──────────────────────── */}
          {!loadingActivity && activities.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="glass rounded-xl px-3 py-2.5 text-center">
                <p className="text-lg font-bold text-foreground">{activities.length}</p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Total</p>
              </div>
              <div className="glass rounded-xl px-3 py-2.5 text-center">
                <p className="text-lg font-bold text-foreground">{commentCount}</p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Comments</p>
              </div>
              <div className="glass rounded-xl px-3 py-2.5 text-center">
                <p className="text-lg font-bold text-foreground">{followingCount}</p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Following</p>
              </div>
            </div>
          )}

          {/* ── Tabs ─────────────────────────────── */}
          <div className="flex glass rounded-2xl p-1.5 mb-6">
            {([
              { key: "all" as const, label: "All", icon: Bell, count: activities.length },
              { key: "comments" as const, label: "Comments", icon: MessageCircle, count: commentCount },
              { key: "following" as const, label: "Following", icon: Eye, count: followingCount },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex-1 py-2.5 text-[13px] font-medium text-center rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5",
                  activeTab === tab.key
                    ? "bg-[var(--primary)] text-white shadow-[0_4px_12px_rgba(184,131,95,0.3)]"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
                {tab.count > 0 && (
                  <span className={cn(
                    "text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center",
                    activeTab === tab.key
                      ? "bg-white/25 text-white"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Activity Feed ────────────────────── */}
          {loadingActivity ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="glass-card animate-pulse" style={{ "--glass-r": 184, "--glass-g": 131, "--glass-b": 95 } as React.CSSProperties}>
                  <div className="p-4">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted/40" />
                      <div className="flex-1 space-y-2.5">
                        <div className="h-4 bg-muted/40 rounded-full w-4/5" />
                        <div className="h-3 bg-muted/40 rounded-full w-3/5" />
                        <div className="h-8 bg-muted/30 rounded-lg w-full mt-1" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-5">
                <Bell className="h-9 w-9 text-muted-foreground/40" />
              </div>
              <p className="text-foreground font-semibold text-base">No activity yet</p>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-xs mx-auto">
                {activeTab === "following"
                  ? "Follow reports to stay updated on their progress"
                  : activeTab === "comments"
                    ? "Comments on your reports will appear here"
                    : "Updates from your reports and followed issues will appear here"}
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-medium shadow-[0_4px_16px_rgba(184,131,95,0.3)] hover:shadow-[0_6px_24px_rgba(184,131,95,0.4)] transition-all duration-200 hover:-translate-y-0.5"
              >
                Browse Reports
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedActivities.map((group) => (
                <div key={group.label}>
                  {/* Date separator */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {group.label}
                    </span>
                    <div className="flex-1 h-px bg-border/60" />
                  </div>

                  {/* Timeline items */}
                  <div className="space-y-3">
                    {group.items.map((activity) => {
                      const sCfg = statusConfig[activity.report_status] ?? statusConfig.open;
                      const StatusIcon = sCfg.icon;

                      return (
                        <Link
                          key={activity.id}
                          href={`/report/${activity.report_id}`}
                          className="block group"
                        >
                          <div
                            className="glass-card"
                            style={{
                              "--glass-r": activity.type === "comment" ? 90 : 184,
                              "--glass-g": activity.type === "comment" ? 140 : 131,
                              "--glass-b": activity.type === "comment" ? 200 : 95,
                            } as React.CSSProperties}
                          >
                            <div className="relative z-[3] p-4">
                              <div className="flex gap-3.5">
                                {/* Avatar with type indicator ring */}
                                <div className="relative flex-shrink-0">
                                  <div className={cn(
                                    "w-11 h-11 rounded-full overflow-hidden ring-2 shadow-sm",
                                    activity.type === "comment"
                                      ? "ring-blue-300/50 dark:ring-blue-500/30"
                                      : "ring-[var(--primary)]/30"
                                  )}>
                                    {activity.author_avatar ? (
                                      <Image
                                        src={activity.author_avatar}
                                        alt={activity.author_name}
                                        width={44}
                                        height={44}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-sm font-bold">
                                        {activity.author_name.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                  {/* Activity type badge */}
                                  <div className={cn(
                                    "absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center shadow-sm border-2 border-white dark:border-[#2D2833]",
                                    activity.type === "comment"
                                      ? "bg-blue-500"
                                      : "bg-[var(--primary)]"
                                  )}>
                                    {activity.type === "comment" ? (
                                      <MessageCircle className="h-2.5 w-2.5 text-white" />
                                    ) : (
                                      <Eye className="h-2.5 w-2.5 text-white" />
                                    )}
                                  </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  {/* Action text */}
                                  <p className="text-[13px] text-foreground leading-relaxed">
                                    {activity.type === "comment" ? (
                                      <>
                                        <span className="font-semibold">{activity.author_name}</span>
                                        {" commented on "}
                                        <span className="font-semibold text-[var(--primary)] group-hover:underline">
                                          {activity.report_title}
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="font-semibold text-[var(--primary)] group-hover:underline">
                                          {activity.report_title}
                                        </span>
                                        {" by "}
                                        <span className="font-semibold">{activity.author_name}</span>
                                      </>
                                    )}
                                  </p>

                                  {/* Comment preview */}
                                  {activity.content && (
                                    <div className="mt-2 px-3 py-2 rounded-lg bg-white/40 dark:bg-white/5 border-l-2 border-blue-300 dark:border-blue-500/40">
                                      <p className="text-[12px] text-foreground/70 line-clamp-2 italic">
                                        &ldquo;{activity.content}&rdquo;
                                      </p>
                                    </div>
                                  )}

                                  {/* Footer: status + time */}
                                  <div className="flex items-center justify-between mt-2.5">
                                    <div className={cn(
                                      "inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full",
                                      sCfg.color
                                    )}>
                                      <StatusIcon className="h-3 w-3" />
                                      {sCfg.label}
                                    </div>
                                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
                                      <Clock className="h-3 w-3" />
                                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                                    </span>
                                  </div>
                                </div>

                                {/* Arrow on hover */}
                                <div className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

"use client";

import { AdminShell } from "@/components/AdminShell";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart3,
  FileText,
  Flag,
  Users,
  AlertTriangle,
  EyeOff,
  Ban,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface AdminStats {
  totalReports: number;
  openReports: number;
  inProgressReports: number;
  closedReports: number;
  totalUsers: number;
  bannedUsers: number;
  pendingFlags: number;
  hiddenReports: number;
}

export default function AdminDashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!user || !profile?.is_admin) return;

    const fetchStats = async () => {
      const supabase = createClient();

      const [reports, openR, inProgR, closedR, users, banned, flags, hidden] =
        await Promise.all([
          supabase.from("reports").select("id", { count: "exact", head: true }),
          supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
          supabase.from("reports").select("id", { count: "exact", head: true }).in("status", ["acknowledged", "in_progress"]),
          supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "closed"),
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_banned", true),
          supabase.from("flags").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("reports").select("id", { count: "exact", head: true }).eq("is_hidden", true),
        ]);

      setStats({
        totalReports: reports.count ?? 0,
        openReports: openR.count ?? 0,
        inProgressReports: inProgR.count ?? 0,
        closedReports: closedR.count ?? 0,
        totalUsers: users.count ?? 0,
        bannedUsers: banned.count ?? 0,
        pendingFlags: flags.count ?? 0,
        hiddenReports: hidden.count ?? 0,
      });
      setLoadingStats(false);
    };

    fetchStats();
  }, [user, profile]);

  const statCards = stats
    ? [
        { label: "Total Reports", value: stats.totalReports, icon: FileText, accent: "border-l-[var(--primary)]", iconColor: "text-[var(--primary)]" },
        { label: "Open Issues", value: stats.openReports, icon: AlertTriangle, accent: "border-l-red-500", iconColor: "text-red-500" },
        { label: "In Progress", value: stats.inProgressReports, icon: BarChart3, accent: "border-l-amber-500", iconColor: "text-amber-500" },
        { label: "Resolved", value: stats.closedReports, icon: BarChart3, accent: "border-l-emerald-500", iconColor: "text-emerald-500" },
      ]
    : [];

  const summaryItems = stats
    ? [
        { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-500" },
        { label: "Banned Users", value: stats.bannedUsers, icon: Ban, color: "text-red-500" },
        { label: "Hidden Reports", value: stats.hiddenReports, icon: EyeOff, color: "text-[#5D6B7A] dark:text-[#9CA8A7]" },
        { label: "Pending Flags", value: stats.pendingFlags, icon: Flag, color: "text-orange-500" },
      ]
    : [];

  const quickLinks = [
    { href: "/admin/reports", label: "Manage Reports", desc: "Hide/unhide reports, lock comments, change status", icon: FileText },
    { href: "/admin/users", label: "Manage Users", desc: "Ban/unban users, manage admin access", icon: Users },
    { href: "/admin/flagged", label: "Review Flags", desc: "View and act on flagged content", icon: Flag },
  ];

  return (
    <AdminShell>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Page title */}
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-[13px] text-[#5D6B7A] dark:text-[#9CA8A7] mt-0.5">
            Overview of your community platform
          </p>
        </div>

        {/* Stats Grid */}
        {loadingStats ? (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="admin-stat h-[88px] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {statCards.map((card) => (
              <div
                key={card.label}
                className={`admin-stat border-l-4 ${card.accent}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                  <span className="text-[11px] font-semibold text-[#5D6B7A] dark:text-[#9CA8A7] uppercase tracking-wide">
                    {card.label}
                  </span>
                </div>
                <p className="text-[28px] font-bold text-foreground leading-none">
                  {card.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Two-column layout */}
        <div className="grid xl:grid-cols-5 gap-4">
          {/* Quick Actions */}
          <div className="xl:col-span-3 admin-card p-5">
            <h2 className="text-[11px] font-semibold text-[#5D6B7A] dark:text-[#9CA8A7] uppercase tracking-wider mb-4">
              Quick Actions
            </h2>
            <div className="space-y-2">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-[#FAF7F3] dark:hover:bg-[#242028] transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-[var(--primary)]/8 flex items-center justify-center flex-shrink-0">
                    <link.icon className="h-4 w-4 text-[var(--primary)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground group-hover:text-[var(--primary)] transition-colors">
                      {link.label}
                    </p>
                    <p className="text-[11px] text-[#5D6B7A] dark:text-[#9CA8A7]">
                      {link.desc}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#5D6B7A] dark:text-[#9CA8A7] opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="xl:col-span-2 admin-card p-5">
            <h2 className="text-[11px] font-semibold text-[#5D6B7A] dark:text-[#9CA8A7] uppercase tracking-wider mb-4">
              Platform Summary
            </h2>
            {loadingStats ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-5 bg-[#F0EBE3] dark:bg-[#2D2833] rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {summaryItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between py-2 border-b border-[#F0EBE3] dark:border-[#2D2833] last:border-0"
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon className={`h-4 w-4 ${item.color}`} />
                      <span className="text-[13px] text-[#5D6B7A] dark:text-[#9CA8A7]">
                        {item.label}
                      </span>
                    </div>
                    <span className="text-[15px] font-bold text-foreground">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

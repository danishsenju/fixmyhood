"use client";

import { AdminShell } from "@/components/AdminShell";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";
import {
  Ban,
  Search,
  Shield,
  ShieldOff,
  UserCheck,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { format } from "date-fns";

interface AdminUser {
  id: string;
  display_name: string;
  avatar_url: string | null;
  points: number;
  is_admin: boolean;
  is_banned: boolean;
  created_at: string;
}

export default function AdminUsersPage() {
  const { user, profile } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user || !profile?.is_admin) return;

    const fetchUsers = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, points, is_admin, is_banned, created_at")
        .order("created_at", { ascending: false });

      if (data) setUsers(data);
      setLoadingUsers(false);
    };

    fetchUsers();
  }, [user, profile]);

  const toggleBan = async (userId: string, currentBanned: boolean) => {
    if (userId === user?.id) return;
    const supabase = createClient();
    await supabase.from("profiles").update({ is_banned: !currentBanned }).eq("id", userId);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, is_banned: !currentBanned } : u))
    );
  };

  const toggleAdmin = async (userId: string, currentAdmin: boolean) => {
    if (userId === user?.id) return;
    const action = currentAdmin ? "remove admin from" : "make admin";
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    const supabase = createClient();
    await supabase.from("profiles").update({ is_admin: !currentAdmin }).eq("id", userId);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, is_admin: !currentAdmin } : u))
    );
  };

  const filtered = users.filter((u) =>
    u.display_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminShell>
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Users</h1>
            <p className="text-[13px] text-[#5D6B7A] dark:text-[#9CA8A7] mt-0.5">
              {filtered.length} user{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5D6B7A] dark:text-[#9CA8A7]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-10 pr-4 py-2 text-[13px] rounded-lg border border-[#E8E2D8] dark:border-[#2D2833] bg-white dark:bg-[#1E1A22] text-foreground placeholder:text-[#5D6B7A] dark:placeholder:text-[#9CA8A7] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
            />
          </div>
        </div>

        {/* Loading */}
        {loadingUsers ? (
          <div className="admin-card overflow-hidden">
            <div className="space-y-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 border-b border-[#F0EBE3] dark:border-[#2D2833] animate-pulse" />
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="admin-card p-12 text-center">
            <p className="text-[13px] text-[#5D6B7A] dark:text-[#9CA8A7]">No users found.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block admin-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#F0EBE3] dark:bg-[#1A1620]">
                      <th className="text-left text-[11px] font-semibold text-[#5D6B7A] dark:text-[#9CA8A7] uppercase tracking-wider px-4 py-3">User</th>
                      <th className="text-right text-[11px] font-semibold text-[#5D6B7A] dark:text-[#9CA8A7] uppercase tracking-wider px-4 py-3">Points</th>
                      <th className="text-left text-[11px] font-semibold text-[#5D6B7A] dark:text-[#9CA8A7] uppercase tracking-wider px-4 py-3">Role</th>
                      <th className="text-left text-[11px] font-semibold text-[#5D6B7A] dark:text-[#9CA8A7] uppercase tracking-wider px-4 py-3">Status</th>
                      <th className="text-left text-[11px] font-semibold text-[#5D6B7A] dark:text-[#9CA8A7] uppercase tracking-wider px-4 py-3">Joined</th>
                      <th className="text-right text-[11px] font-semibold text-[#5D6B7A] dark:text-[#9CA8A7] uppercase tracking-wider px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u) => {
                      const isSelf = u.id === user?.id;
                      return (
                        <tr
                          key={u.id}
                          className="border-b border-[#F0EBE3] dark:border-[#242028] hover:bg-[#FAF7F3] dark:hover:bg-[#242028] transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-[#E8E2D8] dark:bg-[#2D2833] flex-shrink-0">
                                {u.avatar_url ? (
                                  <Image src={u.avatar_url} alt={u.display_name} width={32} height={32} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[#5D6B7A] dark:text-[#9CA8A7] text-xs font-bold">
                                    {u.display_name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div>
                                <span className="text-[13px] font-medium text-foreground">
                                  {u.display_name}
                                </span>
                                {isSelf && (
                                  <span className="text-[10px] font-medium text-[#5D6B7A] dark:text-[#9CA8A7] ml-1.5">(you)</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-[13px] font-semibold text-foreground">{u.points}</span>
                          </td>
                          <td className="px-4 py-3">
                            {u.is_admin ? (
                              <span className="admin-badge bg-[var(--primary)]/10 text-[var(--primary)]">Admin</span>
                            ) : (
                              <span className="text-[13px] text-[#5D6B7A] dark:text-[#9CA8A7]">User</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {u.is_banned ? (
                              <span className="admin-badge bg-red-50 text-red-500 dark:bg-red-500/10">Banned</span>
                            ) : (
                              <span className="admin-badge bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10">Active</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[13px] text-[#5D6B7A] dark:text-[#9CA8A7] whitespace-nowrap">
                              {format(new Date(u.created_at), "MMM d, yyyy")}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {!isSelf ? (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => toggleBan(u.id, u.is_banned)}
                                  title={u.is_banned ? "Unban" : "Ban"}
                                  className={cn(
                                    "admin-action-btn",
                                    u.is_banned && "!text-red-500 !bg-red-50 dark:!bg-red-500/10"
                                  )}
                                >
                                  {u.is_banned ? <Ban className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                                </button>
                                <button
                                  onClick={() => toggleAdmin(u.id, u.is_admin)}
                                  title={u.is_admin ? "Remove admin" : "Make admin"}
                                  className={cn(
                                    "admin-action-btn",
                                    u.is_admin && "!text-[var(--primary)] !bg-[var(--primary)]/10"
                                  )}
                                >
                                  {u.is_admin ? <Shield className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-[#5D6B7A] dark:text-[#9CA8A7]">&mdash;</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-2">
              {filtered.map((u) => {
                const isSelf = u.id === user?.id;
                return (
                  <div key={u.id} className="admin-card p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-[#E8E2D8] dark:bg-[#2D2833] flex-shrink-0">
                        {u.avatar_url ? (
                          <Image src={u.avatar_url} alt={u.display_name} width={40} height={40} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#5D6B7A] dark:text-[#9CA8A7] text-sm font-bold">
                            {u.display_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[13px] font-semibold text-foreground truncate">{u.display_name}</p>
                          {u.is_admin && (
                            <span className="admin-badge bg-[var(--primary)]/10 text-[var(--primary)]">Admin</span>
                          )}
                          {u.is_banned && (
                            <span className="admin-badge bg-red-50 text-red-500 dark:bg-red-500/10">Banned</span>
                          )}
                          {isSelf && (
                            <span className="admin-badge bg-[#F0EBE3] dark:bg-[#2D2833] text-[#5D6B7A] dark:text-[#9CA8A7]">You</span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#5D6B7A] dark:text-[#9CA8A7]">
                          {u.points} pts &middot; Joined {format(new Date(u.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      {!isSelf && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => toggleBan(u.id, u.is_banned)}
                            title={u.is_banned ? "Unban" : "Ban"}
                            className={cn(
                              "admin-action-btn",
                              u.is_banned && "!text-red-500 !bg-red-50 dark:!bg-red-500/10"
                            )}
                          >
                            {u.is_banned ? <Ban className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => toggleAdmin(u.id, u.is_admin)}
                            title={u.is_admin ? "Remove admin" : "Make admin"}
                            className={cn(
                              "admin-action-btn",
                              u.is_admin && "!text-[var(--primary)] !bg-[var(--primary)]/10"
                            )}
                          >
                            {u.is_admin ? <Shield className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}

"use client";

import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import fmhLogo from "@/images/fmhlogo.png";
import {
  LayoutDashboard,
  FileText,
  Users,
  Flag,
  ArrowLeft,
  Menu,
  X,
  Moon,
  Sun,
  LogOut,
  ChevronRight,
} from "lucide-react";
import React, { useEffect, useState } from "react";

const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/reports", label: "Reports", icon: FileText, exact: false },
  { href: "/admin/users", label: "Users", icon: Users, exact: false },
  { href: "/admin/flagged", label: "Flagged", icon: Flag, exact: false },
];

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [
    { label: "Admin", href: "/admin" },
  ];
  if (segments.length > 1) {
    const label = segments[1].charAt(0).toUpperCase() + segments[1].slice(1);
    crumbs.push({ label, href: pathname });
  }
  return crumbs;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { user, profile, loading, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const breadcrumbs = getBreadcrumbs(pathname);

  // Auth guard
  useEffect(() => {
    if (!loading && (!user || !profile?.is_admin)) {
      router.push("/");
    }
  }, [loading, user, profile, router]);

  // Close sidebar on route change — use ref to avoid React 19 lint error
  const prevPathname = React.useRef(pathname);
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      const id = requestAnimationFrame(() => setSidebarOpen(false));
      return () => cancelAnimationFrame(id);
    }
  }, [pathname]);

  if (loading || !profile?.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-[#E8E2D8] dark:border-[#2D2833]">
        <div className="flex-shrink-0 w-8 h-8">
          <Image
            src={fmhLogo}
            alt="FixMyHood"
            width={32}
            height={32}
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground leading-tight">
            FixMyHood
          </p>
          <p className="text-[10px] text-[#5D6B7A] dark:text-[#9CA8A7] font-medium uppercase tracking-wider">
            Admin Console
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pt-4 pb-4 space-y-0.5">
        <p className="text-[10px] text-[#5D6B7A] dark:text-[#9CA8A7] font-semibold uppercase tracking-wider px-3 mb-2">
          Management
        </p>
        {adminNavItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150",
                isActive
                  ? "admin-nav-active"
                  : "text-[#5D6B7A] dark:text-[#9CA8A7] hover:bg-[#F0EBE3] dark:hover:bg-[#2D2833] hover:text-[#3C3541] dark:hover:text-[#E8E2D8]"
              )}
            >
              <item.icon
                className={cn(
                  "h-[18px] w-[18px] flex-shrink-0",
                  isActive && "stroke-[2.2]"
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="h-px bg-[#E8E2D8] dark:bg-[#2D2833] my-3 mx-3" />

        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-[#5D6B7A] dark:text-[#9CA8A7] hover:bg-[#F0EBE3] dark:hover:bg-[#2D2833] hover:text-[#3C3541] dark:hover:text-[#E8E2D8] transition-all duration-150"
        >
          <ArrowLeft className="h-[18px] w-[18px] flex-shrink-0" />
          <span>Back to App</span>
        </Link>
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-4 border-t border-[#E8E2D8] dark:border-[#2D2833] space-y-1">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-[#5D6B7A] dark:text-[#9CA8A7] hover:bg-[#F0EBE3] dark:hover:bg-[#2D2833] hover:text-[#3C3541] dark:hover:text-[#E8E2D8] transition-all duration-150 w-full"
        >
          {theme === "dark" ? (
            <Sun className="h-[18px] w-[18px] flex-shrink-0" />
          ) : (
            <Moon className="h-[18px] w-[18px] flex-shrink-0" />
          )}
          <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
        </button>

        {profile && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#F0EBE3] dark:bg-[#242028]">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-[#E8E2D8] dark:bg-[#2D2833] flex-shrink-0">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#5D6B7A] dark:text-[#9CA8A7] text-xs font-semibold">
                  {profile.display_name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground truncate">
                {profile.display_name}
              </p>
              <p className="text-[10px] text-[#5D6B7A] dark:text-[#9CA8A7]">
                Administrator
              </p>
            </div>
            <button
              onClick={signOut}
              className="text-[#5D6B7A] dark:text-[#9CA8A7] hover:text-destructive transition-colors p-1"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen admin-panel">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-[240px] flex-col admin-sidebar">
        {sidebarContent}
      </aside>

      {/* ── Mobile Sidebar Overlay ── */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar panel */}
          <aside className="absolute inset-y-0 left-0 w-[280px] flex flex-col admin-sidebar shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-1 text-[#5D6B7A] dark:text-[#9CA8A7] hover:text-foreground transition-colors z-10"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* ── Main Content Area ── */}
      <div className="lg:ml-[240px] min-h-screen flex flex-col">
        {/* ── Top Bar ── */}
        <header className="sticky top-0 z-40 admin-topbar">
          <div className="flex items-center h-14 px-4 lg:px-6">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 mr-2 text-[#5D6B7A] dark:text-[#9CA8A7] hover:text-foreground transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1 text-[13px]">
              {breadcrumbs.map((crumb, i) => (
                <span key={crumb.href} className="flex items-center gap-1">
                  {i > 0 && (
                    <ChevronRight className="h-3.5 w-3.5 text-[#5D6B7A] dark:text-[#9CA8A7]" />
                  )}
                  {i === breadcrumbs.length - 1 ? (
                    <span className="font-semibold text-foreground">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="text-[#5D6B7A] dark:text-[#9CA8A7] hover:text-foreground transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </span>
              ))}
            </nav>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Theme toggle (desktop only) */}
            <button
              onClick={toggleTheme}
              className="hidden lg:flex p-2 text-[#5D6B7A] dark:text-[#9CA8A7] hover:text-foreground transition-colors"
              title={theme === "dark" ? "Light Mode" : "Dark Mode"}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>

            {/* User avatar */}
            {profile && (
              <div className="flex items-center gap-2 ml-2">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-[#E8E2D8] dark:bg-[#2D2833]">
                  {profile.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={profile.display_name}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#5D6B7A] dark:text-[#9CA8A7] text-xs font-semibold">
                      {profile.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* ── Page Content ── */}
        <main className="flex-1 px-4 py-6 lg:px-6">{children}</main>
      </div>
    </div>
  );
}

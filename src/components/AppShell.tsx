"use client";

import { cn } from "@/lib/utils/cn";
import {
  Home,
  Map,
  PlusCircle,
  Activity,
  User,
  Moon,
  Sun,
  LogOut,
  Shield,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import fmhLogo from "@/images/fmhlogo.png";
import { usePathname } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/map", label: "Map", icon: Map },
  { href: "/create", label: "Report", icon: PlusCircle },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/profile", label: "Profile", icon: User },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen">
      {/* ── Desktop Sidebar (icon-only → expand on hover) ── */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-[68px] hover:w-[260px] flex-col glass-panel transition-[width] duration-300 ease-out overflow-hidden group/sidebar shadow-[4px_0_24px_rgba(0,0,0,0.06)]">
        {/* Logo */}
        <div className="flex items-center gap-3 px-[18px] h-[72px]">
          <div className="flex-shrink-0 w-8 h-8">
            <Image src={fmhLogo} alt="FixMyHood" width={37} height={37} className="w-full h-full object-cover" />
          </div>
          <span className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 delay-100">
            Community
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2.5 pt-2 pb-4 space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200",
                  isActive
                    ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn("h-[18px] w-[18px] flex-shrink-0", isActive && "stroke-[2.2]")}
                />
                <span className="whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 delay-100">
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Admin link */}
          {profile?.is_admin && (
            <>
              <div className="h-px bg-border/30 my-2 mx-3" />
              <Link
                href="/admin"
                title="Admin"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200",
                  pathname.startsWith("/admin")
                    ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <Shield className={cn("h-[18px] w-[18px] flex-shrink-0", pathname.startsWith("/admin") && "stroke-[2.2]")} />
                <span className="whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 delay-100">
                  Admin
                </span>
              </Link>
            </>
          )}
        </nav>

        {/* Bottom section */}
        <div className="px-2.5 py-4 border-t border-border/40 space-y-0.5">
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Light Mode" : "Dark Mode"}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all duration-200 w-full"
          >
            {theme === "dark" ? (
              <Sun className="h-[18px] w-[18px] flex-shrink-0" />
            ) : (
              <Moon className="h-[18px] w-[18px] flex-shrink-0" />
            )}
            <span className="whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 delay-100">
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </span>
          </button>

          {profile && (
            <div className="flex items-center gap-3 px-3 py-3 mt-1 rounded-xl glass-button">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex-shrink-0 ring-1 ring-border/60">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.display_name}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-semibold">
                    {profile.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 delay-100">
                <p className="text-[13px] font-medium text-foreground truncate">
                  {profile.display_name}
                </p>
              </div>
              <button
                onClick={signOut}
                className="text-muted-foreground hover:text-destructive transition-colors p-1 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 delay-100"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────── */}
      <div className="pb-[80px] lg:pb-0 lg:pl-[68px]">{children}</div>

      {/* ── Mobile Bottom Nav ────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass glass-highlight border-t border-white/20 dark:border-white/5 safe-bottom">
        <div className="max-w-lg mx-auto flex items-center justify-around h-[64px] px-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const isCreate = item.href === "/create";
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-[3px] py-1.5 rounded-2xl transition-all duration-200",
                  isCreate ? "w-16" : "w-14",
                  isActive
                    ? "text-[var(--primary)]"
                    : "text-[var(--muted-foreground)] active:scale-95"
                )}
              >
                {isCreate ? (
                  <div className={cn(
                    "w-11 h-11 rounded-2xl flex items-center justify-center -mt-3 shadow-[0_2px_12px_rgba(184,131,95,0.25)]",
                    isActive
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--primary)]/80 text-white"
                  )}>
                    <item.icon className="h-5 w-5 stroke-[2.2]" />
                  </div>
                ) : (
                  <>
                    {isActive && (
                      <span className="absolute -top-0.5 w-5 h-[3px] rounded-full bg-[var(--primary)]" />
                    )}
                    <item.icon
                      className={cn(
                        "h-[21px] w-[21px] transition-all duration-200",
                        isActive ? "stroke-[2.4]" : "stroke-[1.7]"
                      )}
                    />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

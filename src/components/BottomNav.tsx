"use client";

import { cn } from "@/lib/utils/cn";
import { Home, Map, PlusCircle, Activity, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/map", label: "Map", icon: Map },
  { href: "/create", label: "Create", icon: PlusCircle },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/40 safe-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 w-14 py-1.5 rounded-xl text-[11px] font-medium transition-all duration-200",
                isActive
                  ? "text-[var(--primary)]"
                  : "text-[var(--muted-foreground)] active:scale-95"
              )}
            >
              {isActive && (
                <span className="absolute -top-1 w-5 h-0.5 rounded-full bg-[var(--primary)]" />
              )}
              <item.icon
                className={cn(
                  "h-[22px] w-[22px] transition-all duration-200",
                  isActive ? "stroke-[2.4]" : "stroke-[1.8]"
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

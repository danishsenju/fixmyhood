"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  // Same-size placeholder until hydration completes — prevents mismatch
  if (!mounted) {
    return <div className="w-9 h-9 rounded-full bg-secondary" />;
  }

  return (
    <button
      onClick={toggleTheme}
      className="w-9 h-9 rounded-full flex items-center justify-center bg-secondary text-foreground hover:bg-muted transition-all duration-200"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}

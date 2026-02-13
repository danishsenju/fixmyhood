"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";

type Theme = "light" | "dark";

// ── Module-scoped external store (no useState needed) ──
let _theme: Theme = "light";
let _initialized = false;
const _listeners = new Set<() => void>();

function emit() {
  for (const fn of _listeners) fn();
}

function subscribe(cb: () => void) {
  _listeners.add(cb);
  return () => {
    _listeners.delete(cb);
  };
}

function getThemeSnapshot() {
  return _theme;
}
function getThemeServerSnapshot(): Theme {
  return "light";
}

function getMountedSnapshot() {
  return _initialized;
}
function getMountedServerSnapshot() {
  return false;
}

// ── Context ───────────────────────────────────────
interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getThemeSnapshot, getThemeServerSnapshot);
  const mounted = useSyncExternalStore(subscribe, getMountedSnapshot, getMountedServerSnapshot);

  // Read real theme from localStorage on mount — mutate the store, not setState
  useEffect(() => {
    if (_initialized) return;
    const stored = localStorage.getItem("fmh-theme") as Theme | null;
    const resolved =
      stored ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    _theme = resolved;
    _initialized = true;
    document.documentElement.classList.toggle("dark", resolved === "dark");
    emit();
  }, []);

  // Keep DOM class in sync when theme changes
  useEffect(() => {
    if (_initialized) {
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const next = _theme === "light" ? "dark" : "light";
    _theme = next;
    localStorage.setItem("fmh-theme", next);
    emit();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

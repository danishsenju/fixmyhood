"use client";

import { ThemeProvider } from "@/contexts/ThemeContext";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

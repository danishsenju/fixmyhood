"use client";

import { useAuth } from "@/hooks/useAuth";
import { Shield, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminSetupPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || submitting) return;

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin-promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to verify code");
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      await refreshProfile();
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Already admin
  if (profile?.is_admin && !success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="card-surface rounded-2xl p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            You are already an admin
          </h1>
          <p className="text-sm text-muted-foreground">
            You have full access to the admin dashboard.
          </p>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--primary)] text-white rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Go to Dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="card-surface rounded-2xl p-8 max-w-sm w-full text-center space-y-4 page-enter">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            Admin Access Granted
          </h1>
          <p className="text-sm text-muted-foreground">
            You now have full access to the admin dashboard.
          </p>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--primary)] text-white rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Go to Dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="card-surface rounded-2xl p-8 max-w-sm w-full space-y-6 page-enter">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-[var(--primary)]/10 flex items-center justify-center mx-auto">
            <Shield className="h-7 w-7 text-[var(--primary)]" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Admin Access</h1>
          <p className="text-sm text-muted-foreground">
            Enter the admin code to gain access to the dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(null);
              }}
              placeholder="Enter admin code"
              className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-card text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none transition-shadow"
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <XCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !code.trim()}
            className="w-full py-3 bg-[var(--primary)] text-white rounded-full text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Verifying..." : "Verify Code"}
          </button>
        </form>

        <div className="text-center">
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

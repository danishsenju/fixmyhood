"use client";

import { ThemeToggle } from "@/components/ThemeToggle";
import { authService } from "@/lib/services/authService";
import Image from "next/image";
import fmhLogo from "@/images/fmhlogo.png";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Shield, MapPin, Users, ArrowRight } from "lucide-react";

const features = [
  {
    icon: MapPin,
    title: "Report Issues",
    desc: "Pin problems on the map for your community",
  },
  {
    icon: Users,
    title: "Community Driven",
    desc: "Follow, comment, and verify neighborhood fixes",
  },
  {
    icon: Shield,
    title: "Track Progress",
    desc: "Watch issues move from open to resolved",
  },
];

function LoginContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const errorParam = searchParams.get("error");
  const [error, setError] = useState<string | null>(
    errorParam === "auth_failed"
      ? "Authentication failed. Please try again."
      : errorParam === "banned"
        ? "Your account has been suspended. Contact support if you believe this is a mistake."
        : null
  );

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await authService.signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      {/* Theme Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* ── Animated Mesh Background ─────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Dot grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.035] dark:opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(circle, var(--foreground) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Animated gradient blobs */}
        <div
          className="absolute top-[-15%] left-[-5%] w-[550px] h-[550px] rounded-full blur-[100px]"
          style={{
            background: "radial-gradient(circle, rgba(184,131,95,0.18) 0%, rgba(184,131,95,0.04) 60%, transparent 80%)",
            animation: "loginBlob1 18s ease-in-out infinite",
          }}
        />
        <div
          className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full blur-[90px]"
          style={{
            background: "radial-gradient(circle, rgba(156,168,167,0.16) 0%, rgba(156,168,167,0.03) 60%, transparent 80%)",
            animation: "loginBlob2 22s ease-in-out infinite",
          }}
        />
        <div
          className="absolute top-[30%] left-[45%] w-[400px] h-[400px] rounded-full blur-[80px]"
          style={{
            background: "radial-gradient(circle, rgba(184,131,95,0.12) 0%, rgba(212,204,186,0.06) 50%, transparent 80%)",
            animation: "loginBlob3 25s ease-in-out infinite",
          }}
        />
        <div
          className="absolute top-[10%] right-[20%] w-[350px] h-[350px] rounded-full blur-[70px]"
          style={{
            background: "radial-gradient(circle, rgba(93,107,122,0.10) 0%, rgba(93,107,122,0.02) 60%, transparent 80%)",
            animation: "loginBlob4 20s ease-in-out infinite",
          }}
        />

        {/* Diagonal shimmer streak */}
        <div
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.03]"
          style={{
            background: "linear-gradient(25deg, transparent 40%, rgba(255,255,255,0.8) 50%, transparent 60%)",
            backgroundSize: "200% 200%",
            animation: "loginShimmer 8s ease-in-out infinite",
          }}
        />

        {/* Subtle pulse rings */}
        <div
          className="absolute top-[20%] left-[15%] w-[200px] h-[200px] rounded-full border border-[var(--primary)]/8"
          style={{ animation: "loginPulseRing 6s ease-in-out infinite" }}
        />
        <div
          className="absolute bottom-[25%] right-[10%] w-[160px] h-[160px] rounded-full border border-[#9CA8A7]/8"
          style={{ animation: "loginPulseRing 8s ease-in-out 2s infinite" }}
        />
      </div>

      {/* ── Left: Branding Hero (desktop) ─────── */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 items-center justify-center p-12">
        <div className="max-w-md">
          {/* Logo + Name */}
          <div className="flex items-center gap-4 mb-8">
            <div>
              <Image src={fmhLogo} alt="FixMyHood" width={64} height={64} className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">FixMyHood</h1>
              <p className="text-sm text-muted-foreground">Community Issue Tracker</p>
            </div>
          </div>

          {/* Headline */}
          <h2 className="text-4xl font-bold text-foreground leading-tight mb-4">
            Make your neighborhood{" "}
            <span className="text-[var(--primary)]">better</span>, together.
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed mb-10">
            Report infrastructure issues, track progress with your neighbors, and see real change happen in your community.
          </p>

          {/* Feature list */}
          <div className="space-y-5">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                  <f.icon className="h-5 w-5 text-[var(--primary)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{f.title}</p>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: Login Form ─────────────────── */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10">
        <div className="w-full max-w-sm">
          {/* Mobile branding */}
          <div className="lg:hidden flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-xl overflow-hidden shadow-[0_6px_24px_rgba(184,131,95,0.25)] mb-3">
              <Image src={fmhLogo} alt="FixMyHood" width={56} height={56} className="w-full h-full object-cover" />
            </div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">FixMyHood</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Report and fix community issues together</p>
          </div>

          {/* Login card — liquid glass */}
          <div className="login-glass">
            <div className="relative z-[3] p-5 sm:p-8">
              {/* Desktop heading inside card */}
              <div className="hidden lg:block mb-6">
                <h3 className="text-xl font-bold text-foreground">Get started</h3>
                <p className="text-sm text-muted-foreground mt-1">Sign in to your community</p>
              </div>

              {/* Mobile heading inside card */}
              <div className="lg:hidden mb-4 text-center">
                <h3 className="text-base font-bold text-foreground">Welcome back</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Sign in to continue</p>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-5 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* Google Sign In */}
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full h-13 px-5 flex items-center justify-center gap-3 bg-white dark:bg-white/10 hover:bg-gray-50 dark:hover:bg-white/15 text-foreground border border-border/60 rounded-2xl font-medium text-sm transition-all duration-200 shadow-[0_2px_8px_rgba(60,53,65,0.06)] hover:shadow-[0_4px_16px_rgba(60,53,65,0.10)] hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-border border-t-foreground rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                    <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-4 sm:my-6">
                <div className="flex-1 h-px bg-border/40" />
                <span className="text-[10px] sm:text-[11px] text-muted-foreground/60 uppercase tracking-wider font-medium">Secure login</span>
                <div className="flex-1 h-px bg-border/40" />
              </div>

              {/* Trust indicators */}
              <div className="flex items-center justify-center gap-3 sm:gap-4 text-[10px] sm:text-[11px] text-muted-foreground/50">
                <span className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Encrypted
                </span>
                <span className="w-1 h-1 rounded-full bg-border" />
                <span>No password</span>
                <span className="w-1 h-1 rounded-full bg-border" />
                <span>Free forever</span>
              </div>

              {/* Terms */}
              <p className="text-center text-[10px] sm:text-[11px] text-muted-foreground/40 mt-3 sm:mt-5 leading-relaxed">
                By continuing, you agree to our Terms of Service and Privacy Policy
              </p>

              {/* Admin note */}
              <p className="text-center text-[10px] sm:text-[11px] text-muted-foreground/50 mt-2">
                For admin login credentials, see the{" "}
                <span className="text-[var(--primary)] font-medium">README.md</span>
              </p>
            </div>
          </div>

          {/* Mobile feature highlights */}
          <div className="lg:hidden mt-5 flex items-center justify-center gap-6">
            {features.map((f) => (
              <div key={f.title} className="flex flex-col items-center gap-1.5 text-center">
                <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                  <f.icon className="h-4 w-4 text-[var(--primary)]" />
                </div>
                <p className="text-[10px] font-medium text-muted-foreground">{f.title}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

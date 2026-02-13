"use client";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";
import { awardPoints, checkAndAwardBadges } from "@/lib/services/gamification";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { getDistanceKm } from "@/lib/utils/distance";
import { AlertTriangle, Camera, ExternalLink, MapPin, Navigation, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

interface PotentialDuplicate {
  id: string;
  title: string;
  status: string;
  category: string;
}

function compressImage(file: File, maxWidth = 800, quality = 0.7): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => resolve(blob ?? file),
        "image/jpeg",
        quality
      );
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for compression"));
    };
    img.src = url;
  });
}

const categories = [
  { value: "infrastructure", label: "Infrastructure" },
  { value: "safety", label: "Safety" },
  { value: "cleanliness", label: "Cleanliness" },
  { value: "environment", label: "Environment" },
  { value: "other", label: "Other" },
] as const;

const severities = ["Low", "Medium", "High"] as const;

export default function CreateReportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" /></div>}>
      <CreateReportContent />
    </Suspense>
  );
}

function CreateReportContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("");
  const [severity, setSeverity] = useState<string>("Medium");
  const [description, setDescription] = useState("");
  const [locationText, setLocationText] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [potentialDuplicates, setPotentialDuplicates] = useState<PotentialDuplicate[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  // Restore form state after returning from map picker
  useEffect(() => {
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const loc = searchParams.get("location");
    if (lat && lng) {
      setLatitude(parseFloat(lat));
      setLongitude(parseFloat(lng));
      if (loc) setLocationText(loc);

      // Restore saved form state
      const saved = sessionStorage.getItem("createReportDraft");
      if (saved) {
        sessionStorage.removeItem("createReportDraft");
        try {
          const draft = JSON.parse(saved);
          if (draft.title) setTitle(draft.title);
          if (draft.category) setCategory(draft.category);
          if (draft.severity) setSeverity(draft.severity);
          if (draft.description) setDescription(draft.description);
          if (draft.locationText) setLocationText(draft.locationText);
          if (draft.photoPreview) {
            setPhotoPreview(draft.photoPreview);
            // Convert data URL back to File for upload
            fetch(draft.photoPreview)
              .then((r) => r.blob())
              .then((blob) => setPhotoFile(new File([blob], "photo.jpg", { type: "image/jpeg" })));
          }
        } catch { /* ignore parse errors */ }
      }
    }
  }, [searchParams]);

  // Debounced duplicate detection
  const checkDuplicates = useCallback(async () => {
    if (!user || title.trim().length < 5 || !category) {
      setPotentialDuplicates([]);
      return;
    }

    const supabase = createClient();
    const { data } = await supabase
      .from("reports")
      .select("id, title, status, category, latitude, longitude")
      .eq("category", category as "infrastructure" | "safety" | "cleanliness" | "environment" | "other")
      .eq("is_hidden", false)
      .is("duplicate_of", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!data) return;

    const titleWords = title.trim().toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const matches = data.filter((r) => {
      const rWords = r.title.toLowerCase().split(/\s+/);
      const overlap = titleWords.filter((w) => rWords.some((rw) => rw.includes(w) || w.includes(rw)));
      if (overlap.length < 2) return false;

      // If both have coordinates, also check proximity
      if (latitude && longitude && r.latitude && r.longitude) {
        const dist = getDistanceKm(latitude, longitude, r.latitude, r.longitude);
        return dist < 2; // Within 2km
      }
      return true;
    });

    setPotentialDuplicates(matches.slice(0, 3));
  }, [user, title, category, latitude, longitude]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(checkDuplicates, 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [checkDuplicates]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setLocationText(
          `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`
        );
      },
      () => setError("Unable to get your location")
    );
  };

  const submitReport = async () => {
    if (!user) return;

    const rateCheck = checkRateLimit("report", 60000);
    if (!rateCheck.allowed) {
      setError(`Please wait ${rateCheck.retryAfterSec} seconds before creating another report.`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      let photoUrl: string | null = null;

      if (photoFile) {
        const compressed = await compressImage(photoFile);
        const fileName = `${user.id}/${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("report-photos")
          .upload(fileName, compressed, { contentType: "image/jpeg" });

        if (uploadError) {
          console.error("Photo upload error:", uploadError.message);
        } else {
          const { data: urlData } = supabase.storage
            .from("report-photos")
            .getPublicUrl(fileName);
          photoUrl = urlData.publicUrl;
        }
      }

      const { data: newReport, error: insertError } = await supabase
        .from("reports")
        .insert({
          creator_id: user.id,
          title: title.trim(),
          description: description.trim(),
          category: category as "infrastructure" | "safety" | "cleanliness" | "environment" | "other",
          photo_url: photoUrl,
          location_text: locationText || null,
          latitude,
          longitude,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      // Auto-follow creator on their own report
      if (newReport) {
        await supabase.from("followers").insert({
          report_id: newReport.id,
          user_id: user.id,
        });
      }

      // Gamification: award points + check badges
      await awardPoints(user.id, "report_created");
      await checkAndAwardBadges(user.id);

      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      console.error("Create report error:", err);
      const message =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "Failed to create report";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!title.trim() || !category || !description.trim()) {
      setError("Please fill in the title, category, and description.");
      return;
    }

    // Show duplicate warning if we found matches and user hasn't dismissed it yet
    if (potentialDuplicates.length > 0 && !showDuplicateWarning) {
      setShowDuplicateWarning(true);
      return;
    }

    await submitReport();
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-background pb-20 lg:pb-6 page-enter">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-40 glass glass-highlight border-b border-white/20 dark:border-white/5 px-4 py-3 safe-top">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="text-muted-foreground hover:text-foreground font-medium text-sm transition-colors"
            >
              Cancel
            </button>
            <h1 className="text-lg font-bold text-foreground">Create Report</h1>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="text-[var(--primary)] font-semibold text-sm disabled:opacity-50"
            >
              {submitting ? "..." : "Submit"}
            </button>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block px-4 pt-6 pb-2">
          <div className="max-w-lg lg:max-w-3xl xl:max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-foreground">Create Report</h1>
          </div>
        </div>

        <div className="max-w-lg lg:max-w-3xl xl:max-w-4xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Photos */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-2">
            Photos (Optional)
          </h2>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />
          {photoPreview ? (
            <div className="relative w-full h-48 rounded-xl overflow-hidden border-2 border-dashed border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => {
                  setPhotoFile(null);
                  setPhotoPreview(null);
                }}
                className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
            >
              <Camera className="h-8 w-8" />
              <span className="text-sm">Tap to add photos</span>
            </button>
          )}
        </div>

        {/* Title */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-semibold text-foreground">
              Report Title
            </label>
            <span className="text-xs text-muted-foreground/70">{title.length}/50</span>
          </div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 50))}
            placeholder="Brief title of the issue"
            className="rounded-xl bg-card border-border"
          />
        </div>

        {/* Category */}
        <div>
          <label className="text-sm font-semibold text-foreground mb-2 block">
            Select a category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-card text-foreground focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none transition-shadow"
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Severity */}
        <div>
          <label className="text-sm font-semibold text-foreground mb-2 block">
            Severity
          </label>
          <div className="flex gap-2">
            {severities.map((s) => (
              <button
                key={s}
                onClick={() => setSeverity(s)}
                className={cn(
                  "flex-1 py-2 px-4 rounded-full text-sm font-medium border transition-all duration-200",
                  severity === s
                    ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-[0_2px_8px_rgba(184,131,95,0.25)]"
                    : "bg-card text-foreground border-border hover:border-[var(--primary)]/50"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-semibold text-foreground">
              Description
            </label>
            <span className="text-xs text-muted-foreground/70">
              {description.length}/300
            </span>
          </div>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 300))}
            placeholder="Describe the issue in detail..."
            rows={4}
            className="rounded-xl resize-none bg-card border-border"
          />
        </div>

        {/* Location */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-2">Location</h2>
          <Input
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            placeholder="Enter address or location"
            className="rounded-xl mb-3 bg-card border-border"
          />
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={handleUseCurrentLocation}
              className="w-full rounded-full border-border"
            >
              <Navigation className="h-4 w-4 mr-2" />
              Use Current Location
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                // Save form state before navigating away
                sessionStorage.setItem(
                  "createReportDraft",
                  JSON.stringify({ title, category, severity, description, locationText, photoPreview })
                );
                router.push("/map?pick=true");
              }}
              className="w-full rounded-full border-border"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Pick on Map
            </Button>
          </div>
        </div>

        {/* Potential Duplicates Hint */}
        {potentialDuplicates.length > 0 && !showDuplicateWarning && (
          <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  Similar reports found
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400/70 mt-0.5">
                  {potentialDuplicates.length} existing report{potentialDuplicates.length > 1 ? "s" : ""} match your title and category.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white font-semibold py-3 rounded-full text-base h-12 shadow-[0_2px_12px_rgba(184,131,95,0.25)] transition-all duration-200"
        >
          {submitting ? "Submitting..." : "Continue"}
        </Button>
        </div>

        {/* Duplicate Warning Modal */}
        {showDuplicateWarning && (
          <div className="modal-overlay" onClick={() => setShowDuplicateWarning(false)}>
            <div className="modal-content card-surface p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Similar Reports Found</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    These existing reports look similar. Check if your issue has already been reported.
                  </p>
                </div>
              </div>

              <div className="space-y-2 mb-5">
                {potentialDuplicates.map((dup) => (
                  <Link
                    key={dup.id}
                    href={`/report/${dup.id}`}
                    className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-[var(--primary)]/50 hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground group-hover:text-[var(--primary)] truncate transition-colors">
                        {dup.title}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {dup.category} &middot; {dup.status.replace("_", " ")}
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-[var(--primary)] flex-shrink-0 ml-2 transition-colors" />
                  </Link>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDuplicateWarning(false)}
                  className="flex-1 rounded-full"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setShowDuplicateWarning(false);
                    submitReport();
                  }}
                  disabled={submitting}
                  className="flex-1 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white rounded-full"
                >
                  {submitting ? "Submitting..." : "Submit Anyway"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

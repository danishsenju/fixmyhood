"use client";

import { AppShell } from "@/components/AppShell";
import { StatusStepper } from "@/components/StatusStepper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";
import { awardPoints, checkAndAwardBadges } from "@/lib/services/gamification";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Eye,
  Flag,
  Lock,
  Map,
  MapPin,
  Pencil,
  Share2,
  ShieldCheck,
  Trash2,
  Users,
  Wrench,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import dynamic from "next/dynamic";


const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);

// Fix Leaflet default marker icon (broken in webpack/Next.js)
if (typeof window !== "undefined") {
  import("leaflet").then((L) => {
    delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });
  });
}

interface ReportDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  status: "open" | "acknowledged" | "in_progress" | "closed";
  is_hidden: boolean;
  comments_locked: boolean;
  photo_url: string | null;
  location_text: string | null;
  latitude: number | null;
  longitude: number | null;
  duplicate_of: string | null;
  created_at: string;
  creator: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
}

interface CommentData {
  id: string;
  content: string;
  comment_type: "comment" | "progress" | "confirm_fix";
  image_url: string | null;
  created_at: string;
  verification_count: number;
  user_verified: boolean;
  user: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
}

interface ViewerData {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  viewed_at: string;
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
      canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", quality);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

const commentTypeConfig = {
  comment: { label: "Comment", icon: null, color: "" },
  progress: {
    label: "Progress Update",
    icon: Wrench,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20",
  },
  confirm_fix: {
    label: "Confirm Fix",
    icon: CheckCircle2,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20",
  },
};

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<"updates" | "details">("updates");
  const [loadingReport, setLoadingReport] = useState(true);
  const [viewers, setViewers] = useState<ViewerData[]>([]);
  const [viewerCount, setViewerCount] = useState(0);

  // Place name from reverse geocoding
  const [placeName, setPlaceName] = useState<string | null>(null);

  // Map popup
  const [showMapPopup, setShowMapPopup] = useState(false);

  // Image lightbox
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Comment modal
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentType, setCommentType] = useState<"comment" | "progress" | "confirm_fix">("comment");
  const [newComment, setNewComment] = useState("");
  const [commentImage, setCommentImage] = useState<File | null>(null);
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Flag modal
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [flagContentType, setFlagContentType] = useState<"report" | "comment">("report");
  const [flagContentId, setFlagContentId] = useState("");
  const [submittingFlag, setSubmittingFlag] = useState(false);
  const [flagSuccess, setFlagSuccess] = useState(false);

  const fetchComments = useCallback(async () => {
    const supabase = createClient();
    const { data: commentsData } = await supabase
      .from("comments")
      .select(
        "id, content, comment_type, image_url, created_at, user:profiles!comments_user_id_fkey(id, display_name, avatar_url)"
      )
      .eq("report_id", id)
      .eq("is_hidden", false)
      .order("created_at", { ascending: true });

    if (commentsData && user) {
      // Fetch verification counts for confirm_fix comments
      const confirmFixIds = commentsData
        .filter((c) => (c as Record<string, unknown>).comment_type === "confirm_fix")
        .map((c) => c.id);

      const verificationMap: Record<string, { count: number; userVerified: boolean }> = {};
      if (confirmFixIds.length > 0) {
        const { data: verifications } = await supabase
          .from("comment_verifications")
          .select("comment_id, user_id")
          .in("comment_id", confirmFixIds);

        if (verifications) {
          for (const v of verifications) {
            if (!verificationMap[v.comment_id]) {
              verificationMap[v.comment_id] = { count: 0, userVerified: false };
            }
            verificationMap[v.comment_id].count++;
            if (v.user_id === user.id) {
              verificationMap[v.comment_id].userVerified = true;
            }
          }
        }
      }

      setComments(
        commentsData.map((c) => {
          const commentUser = Array.isArray(c.user) ? c.user[0] : c.user;
          const vm = verificationMap[c.id];
          return {
            ...c,
            comment_type: ((c as Record<string, unknown>).comment_type as string) || "comment",
            image_url: (c as Record<string, unknown>).image_url as string | null,
            user: commentUser,
            verification_count: vm?.count ?? 0,
            user_verified: vm?.userVerified ?? false,
          } as unknown as CommentData;
        })
      );
    }
  }, [id, user]);

  useEffect(() => {
    const fetchReport = async () => {
      const supabase = createClient();

      const { data: reportData } = await supabase
        .from("reports")
        .select(
          "id, title, description, category, status, is_hidden, comments_locked, photo_url, location_text, latitude, longitude, duplicate_of, created_at, creator:profiles!reports_creator_id_fkey(id, display_name, avatar_url)"
        )
        .eq("id", id)
        .single();

      if (reportData) {
        // Block non-admins from viewing hidden reports
        if ((reportData as unknown as { is_hidden: boolean }).is_hidden && !profile?.is_admin) {
          setReport(null);
          setLoadingReport(false);
          return;
        }
        const creator = Array.isArray(reportData.creator)
          ? reportData.creator[0]
          : reportData.creator;
        setReport({ ...reportData, creator } as unknown as ReportDetail);
      }

      // Fetch comments, followers, and viewers in parallel (was sequential)
      const [, followersResult, followDataResult, viewerResult] =
        await Promise.all([
          fetchComments(),
          supabase
            .from("followers")
            .select("id", { count: "exact", head: true })
            .eq("report_id", id),
          user
            ? supabase
                .from("followers")
                .select("user_id")
                .eq("report_id", id)
                .eq("user_id", user.id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          supabase
            .from("report_views")
            .select(
              "user_id, viewed_at, viewer:profiles!report_views_user_id_fkey(display_name, avatar_url)",
              { count: "exact" }
            )
            .eq("report_id", id)
            .order("viewed_at", { ascending: false })
            .limit(10),
        ]);

      setFollowersCount(followersResult.count ?? 0);
      setIsFollowing(!!followDataResult.data);

      if (viewerResult.data) {
        setViewers(
          viewerResult.data.map((v) => {
            const viewer = Array.isArray(v.viewer) ? v.viewer[0] : v.viewer;
            return {
              user_id: v.user_id,
              display_name: (viewer as { display_name: string })?.display_name ?? "User",
              avatar_url: (viewer as { avatar_url: string | null })?.avatar_url ?? null,
              viewed_at: v.viewed_at,
            };
          })
        );
      }
      setViewerCount(viewerResult.count ?? 0);

      setLoadingReport(false);
    };

    if (id) fetchReport();
  }, [id, user, fetchComments]);

  // Reverse geocode to get place name
  useEffect(() => {
    if (!report?.latitude || !report?.longitude) return;
    const controller = new AbortController();
    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${report.latitude}&lon=${report.longitude}&format=json&zoom=16`,
      { signal: controller.signal, headers: { "Accept-Language": "en" } }
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.display_name) {
          // Use a short form: road, suburb/city, country
          const addr = data.address;
          const parts = [
            addr?.road || addr?.pedestrian || addr?.neighbourhood,
            addr?.suburb || addr?.city_district || addr?.village,
            addr?.city || addr?.town || addr?.county,
            addr?.state,
          ].filter(Boolean);
          setPlaceName(parts.length > 0 ? parts.join(", ") : data.display_name);
        }
      })
      .catch(() => {/* ignore abort / network errors */});
    return () => controller.abort();
  }, [report?.latitude, report?.longitude]);

  // Record this user's view
  useEffect(() => {
    if (!user || !id) return;
    const recordView = async () => {
      const supabase = createClient();
      await supabase
        .from("report_views")
        .upsert(
          { report_id: id, user_id: user.id },
          { onConflict: "report_id,user_id" }
        );
    };
    recordView();
  }, [user, id]);

  const handleFollow = async () => {
    if (!user) return;
    const supabase = createClient();

    if (isFollowing) {
      await supabase.from("followers").delete().eq("report_id", id).eq("user_id", user.id);
      setIsFollowing(false);
      setFollowersCount((c) => c - 1);
    } else {
      await supabase.from("followers").insert({ report_id: id, user_id: user.id });
      setIsFollowing(true);
      setFollowersCount((c) => c + 1);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCommentImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setCommentImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const openCommentModal = (type: "comment" | "progress" | "confirm_fix") => {
    setCommentType(type);
    setNewComment("");
    setCommentImage(null);
    setCommentImagePreview(null);
    setShowCommentModal(true);
  };

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;
    if ((commentType === "progress" || commentType === "confirm_fix") && !commentImage) return;

    const rateCheck = checkRateLimit("comment", 10000);
    if (!rateCheck.allowed) {
      alert(`Please wait ${rateCheck.retryAfterSec} seconds before posting another comment.`);
      return;
    }

    setSubmittingComment(true);
    const supabase = createClient();

    let imageUrl: string | null = null;
    if (commentImage) {
      const compressed = await compressImage(commentImage);
      const fileName = `comments/${user.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("report-photos")
        .upload(fileName, compressed, { contentType: "image/jpeg" });

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("report-photos").getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from("comments").insert({
      report_id: id,
      user_id: user.id,
      content: newComment.trim(),
      comment_type: commentType,
      image_url: imageUrl,
    });

    if (!error) {
      // Award points based on comment type
      if (commentType === "comment") {
        await awardPoints(user.id, "comment");
      } else if (commentType === "progress") {
        await awardPoints(user.id, "progress_update");
      } else if (commentType === "confirm_fix") {
        await awardPoints(user.id, "confirm_fix");
      }
      await checkAndAwardBadges(user.id);

      // Auto-status transitions based on comment type
      if (commentType === "progress" && (report?.status === "open" || report?.status === "acknowledged")) {
        await supabase.from("reports").update({ status: "in_progress" }).eq("id", id);
        setReport((prev) => (prev ? { ...prev, status: "in_progress" } : prev));
      } else if (report?.status === "open") {
        await supabase.from("reports").update({ status: "acknowledged" }).eq("id", id);
        setReport((prev) => (prev ? { ...prev, status: "acknowledged" } : prev));
      }

      await fetchComments();
      setShowCommentModal(false);
      setNewComment("");
      setCommentImage(null);
      setCommentImagePreview(null);
    }
    setSubmittingComment(false);
  };

  const handleVerify = async (commentId: string) => {
    if (!user) return;
    const supabase = createClient();

    const { error } = await supabase.from("comment_verifications").insert({
      comment_id: commentId,
      user_id: user.id,
    });

    if (!error) {
      // Award verifier points
      await awardPoints(user.id, "confirm_fix");
      await checkAndAwardBadges(user.id);

      // Check if this made the verification count reach 3 — award the fix author
      const { count } = await supabase
        .from("comment_verifications")
        .select("*", { count: "exact", head: true })
        .eq("comment_id", commentId);

      if (count === 3) {
        const comment = comments.find((c) => c.id === commentId);
        if (comment) {
          await awardPoints(comment.user.id, "verified_fix");
          await checkAndAwardBadges(comment.user.id);
        }
      }

      await fetchComments();
    }
  };

  const hasVerifiedFix = useMemo(() => {
    return comments.some(
      (c) => c.comment_type === "confirm_fix" && c.verification_count >= 3
    );
  }, [comments]);

  const isReporter = user?.id === report?.creator?.id;

  const handleCloseReport = async () => {
    if (!user || !report) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("reports")
      .update({ status: "closed" })
      .eq("id", id);
    if (!error) {
      setReport((prev) => (prev ? { ...prev, status: "closed" } : prev));
    }
  };

  const openFlagModal = (contentType: "report" | "comment", contentId: string) => {
    setFlagContentType(contentType);
    setFlagContentId(contentId);
    setFlagReason("");
    setFlagSuccess(false);
    setShowFlagModal(true);
  };

  const handleFlag = async () => {
    if (!user || !flagReason.trim()) return;

    const rateCheck = checkRateLimit("flag", 30000);
    if (!rateCheck.allowed) {
      alert(`Please wait ${rateCheck.retryAfterSec} seconds before flagging again.`);
      return;
    }

    setSubmittingFlag(true);
    const supabase = createClient();

    const { error } = await supabase.from("flags").insert({
      content_type: flagContentType,
      content_id: flagContentId,
      reporter_id: user.id,
      reason: flagReason.trim(),
    });

    if (!error) {
      setFlagSuccess(true);
      setTimeout(() => {
        setShowFlagModal(false);
        setFlagReason("");
        setFlagSuccess(false);
      }, 1500);
    }
    setSubmittingFlag(false);
  };

  const categories = [
    { value: "infrastructure", label: "Infrastructure" },
    { value: "safety", label: "Safety" },
    { value: "cleanliness", label: "Cleanliness" },
    { value: "environment", label: "Environment" },
    { value: "other", label: "Other" },
  ];

  const openEditModal = () => {
    if (!report) return;
    setEditTitle(report.title);
    setEditDescription(report.description);
    setEditCategory(report.category);
    setEditPhotoFile(null);
    setEditPhotoPreview(report.photo_url);
    setShowEditModal(true);
  };

  const handleEditPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setEditPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEdit = async () => {
    if (!user || !report) return;
    if (!editTitle.trim() || !editCategory || !editDescription.trim()) return;

    setSaving(true);
    const supabase = createClient();

    let photoUrl = report.photo_url;

    // Upload new photo if changed
    if (editPhotoFile) {
      const compressed = await compressImage(editPhotoFile);
      const fileName = `${user.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("report-photos")
        .upload(fileName, compressed, { contentType: "image/jpeg" });

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("report-photos").getPublicUrl(fileName);
        photoUrl = urlData.publicUrl;
      }
    } else if (!editPhotoPreview && report.photo_url) {
      // Photo was removed
      photoUrl = null;
    }

    const { error } = await supabase
      .from("reports")
      .update({
        title: editTitle.trim(),
        description: editDescription.trim(),
        category: editCategory as "infrastructure" | "safety" | "cleanliness" | "environment" | "other",
        photo_url: photoUrl,
      })
      .eq("id", id);

    if (!error) {
      setReport((prev) =>
        prev
          ? {
              ...prev,
              title: editTitle.trim(),
              description: editDescription.trim(),
              category: editCategory,
              photo_url: photoUrl,
            }
          : prev
      );
      setShowEditModal(false);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!user || !report) return;
    setDeleting(true);
    const supabase = createClient();

    // Delete photo from storage if it exists
    if (report.photo_url) {
      const path = report.photo_url.split("/report-photos/")[1];
      if (path) {
        await supabase.storage.from("report-photos").remove([path]);
      }
    }

    const { error } = await supabase.from("reports").delete().eq("id", id);
    if (!error) {
      router.push("/");
    }
    setDeleting(false);
  };

  const categoryLabel: Record<string, string> = {
    infrastructure: "Infrastructure",
    safety: "Safety",
    cleanliness: "Cleanliness",
    environment: "Environment",
    other: "Other",
  };

  if (loadingReport) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Report not found</p>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-background pb-20 lg:pb-6 page-enter">
        {/* Header */}
        <div className="sticky top-0 z-40 glass glass-highlight border-b border-white/20 dark:border-white/5 px-4 py-3 safe-top lg:hidden">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button onClick={() => router.back()} className="text-foreground hover:text-[var(--primary)] transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold text-foreground">Report Details</h1>
          </div>
        </div>

        <div className="max-w-lg lg:max-w-3xl xl:max-w-4xl mx-auto px-4 py-4 space-y-6">
          {/* Status Stepper */}
          <div className="card-surface rounded-2xl p-5">
            <StatusStepper status={report.status} />
          </div>

          {/* Duplicate Banner */}
          {report.duplicate_of && (
            <Link
              href={`/report/${report.duplicate_of}`}
              className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 group"
            >
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  This report has been marked as a duplicate
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400/70 mt-0.5 group-hover:underline">
                  View the original report &rarr;
                </p>
              </div>
            </Link>
          )}

          {/* Photo */}
          {report.photo_url && (
            <div
              className="w-full h-48 rounded-2xl overflow-hidden bg-muted shadow-[0_4px_20px_rgba(60,53,65,0.08)] cursor-pointer"
              onClick={() => setLightboxImage(report.photo_url)}
            >
              <Image
                src={report.photo_url}
                alt={report.title}
                width={600}
                height={300}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Title & Tags */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2">{report.title}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="glass-button rounded-full">
                {categoryLabel[report.category] ?? report.category}
              </Badge>
              <span className={cn("text-[10px] font-semibold px-2.5 py-1 rounded-full", `status-${report.status}`)}>
                {report.status === "open"
                  ? "Open"
                  : report.status === "in_progress"
                    ? "In Progress"
                    : report.status.charAt(0).toUpperCase() + report.status.slice(1)}
              </span>
            </div>
          </div>

          {/* Location with Map button */}
          {(report.location_text || placeName) && (
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-[var(--primary)] flex-shrink-0" />
                  {placeName ? (
                    <div>
                      <p className="text-sm font-medium text-foreground">{placeName}</p>
                      {report.location_text && (
                        <p className="text-xs text-muted-foreground mt-0.5">{report.location_text}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{report.location_text}</p>
                  )}
                </div>
              </div>
              {report.latitude != null && report.longitude != null && (
                <button
                  onClick={() => setShowMapPopup(true)}
                  className="flex items-center gap-1.5 text-xs font-medium text-[var(--primary)] bg-[var(--primary)]/10 px-3 py-1.5 rounded-full hover:bg-[var(--primary)]/20 transition-colors flex-shrink-0 mt-0.5"
                >
                  <Map className="h-3.5 w-3.5" />
                  View Map
                </button>
              )}
            </div>
          )}

          {/* Description */}
          <div className="card-surface rounded-2xl p-5">
            <p className="text-foreground/80 text-sm leading-relaxed">{report.description}</p>
          </div>

          {/* Creator Info - clickable to profile */}
          <Link href={`/profile/${report.creator.id}`} className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-muted ring-2 ring-white/30 dark:ring-white/10">
              {report.creator.avatar_url ? (
                <Image
                  src={report.creator.avatar_url}
                  alt={report.creator.display_name}
                  width={36}
                  height={36}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-bold">
                  {report.creator.display_name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground group-hover:text-[var(--primary)] transition-colors">
                {report.creator.display_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(report.created_at), "MMM d, yyyy, h:mm a")}
              </p>
            </div>
          </Link>

          {/* Viewers Section */}
          <div className="card-surface rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {viewerCount} {viewerCount === 1 ? "viewer" : "viewers"}
                </span>
              </div>
              {viewers.length > 0 && (
                <div className="flex -space-x-2">
                  {viewers.slice(0, 5).map((v) => (
                    <div
                      key={v.user_id}
                      className="w-7 h-7 rounded-full overflow-hidden bg-muted ring-2 ring-[var(--card)] flex-shrink-0"
                      title={v.display_name}
                    >
                      {v.avatar_url ? (
                        <Image src={v.avatar_url} alt={v.display_name} width={28} height={28} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px] font-bold">
                          {v.display_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  ))}
                  {viewerCount > 5 && (
                    <div className="w-7 h-7 rounded-full bg-muted ring-2 ring-[var(--card)] flex items-center justify-center flex-shrink-0">
                      <span className="text-[9px] font-bold text-muted-foreground">+{viewerCount - 5}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="card-surface rounded-2xl p-3 flex items-center justify-around">
            <button
              onClick={handleFollow}
              className={cn(
                "flex items-center gap-1.5 text-sm font-medium transition-colors px-3 py-2 rounded-xl",
                isFollowing ? "text-[var(--primary)] bg-[var(--primary)]/10" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="h-4 w-4" />
              {followersCount} {isFollowing ? "Follow Issue" : "Follow Issue"}
            </button>
            {isReporter && (
              <button
                onClick={openEditModal}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-xl"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            )}
            {isReporter && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 transition-colors px-3 py-2 rounded-xl"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
            {!isReporter && (
              <button
                onClick={() => user && openFlagModal("report", id)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-xl"
              >
                <Flag className="h-4 w-4" />
                Flag
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex glass rounded-xl p-1">
            <button
              onClick={() => setActiveTab("updates")}
              className={cn(
                "flex-1 py-2 text-sm font-medium text-center rounded-lg transition-all duration-200",
                activeTab === "updates"
                  ? "bg-[var(--primary)] text-white shadow-[0_2px_8px_rgba(184,131,95,0.25)]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Updates
            </button>
            <button
              onClick={() => setActiveTab("details")}
              className={cn(
                "flex-1 py-2 text-sm font-medium text-center rounded-lg transition-all duration-200",
                activeTab === "details"
                  ? "bg-[var(--primary)] text-white shadow-[0_2px_8px_rgba(184,131,95,0.25)]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Details
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === "updates" ? (
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground/70 text-center py-4">No updates yet.</p>
              ) : (
                comments.map((comment) => {
                  const typeConfig = commentTypeConfig[comment.comment_type];
                  const TypeIcon = comment.comment_type !== "comment" ? typeConfig.icon : null;

                  return (
                    <div key={comment.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex-shrink-0 ring-2 ring-white/20 dark:ring-white/5">
                          {comment.user.avatar_url ? (
                            <Image src={comment.user.avatar_url} alt={comment.user.display_name} width={32} height={32} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-bold">
                              {comment.user.display_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="w-px flex-1 bg-border/50 mt-1" />
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">{comment.user.display_name}</p>
                          {comment.comment_type !== "comment" && TypeIcon && (
                            <span className={cn("flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border", (typeConfig as { bgColor: string }).bgColor)}>
                              <TypeIcon className={cn("h-3 w-3", (typeConfig as { color: string }).color)} />
                              <span className={(typeConfig as { color: string }).color}>{typeConfig.label}</span>
                            </span>
                          )}
                          <p className="text-xs text-muted-foreground/70">
                            {format(new Date(comment.created_at), "MMM d, h:mm a")}
                          </p>
                        </div>

                        <div className={cn(
                          "rounded-xl p-3 mt-1.5",
                          comment.comment_type !== "comment" ? `border ${(typeConfig as { bgColor: string }).bgColor}` : "card-surface"
                        )}>
                          {comment.image_url && (
                            <div
                              className="w-full h-40 rounded-lg overflow-hidden mb-2 bg-muted cursor-pointer"
                              onClick={() => setLightboxImage(comment.image_url)}
                            >
                              <Image src={comment.image_url} alt="Evidence" width={400} height={200} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <p className="text-sm text-foreground/80">{comment.content}</p>
                        </div>

                        {/* Verify button for confirm_fix comments */}
                        {comment.comment_type === "confirm_fix" && user && comment.user.id !== user.id && (
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => !comment.user_verified && handleVerify(comment.id)}
                              disabled={comment.user_verified}
                              className={cn(
                                "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all",
                                comment.user_verified
                                  ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : "bg-muted hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400"
                              )}
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              {comment.user_verified ? "Verified" : "Verify Fix"}
                            </button>
                            <span className="text-xs text-muted-foreground">
                              {comment.verification_count}/3 verifications
                            </span>
                          </div>
                        )}

                        {/* Flag comment button */}
                        {user && comment.user.id !== user.id && (
                          <button
                            onClick={() => openFlagModal("comment", comment.id)}
                            className="flex items-center gap-1 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors mt-1"
                          >
                            <Flag className="h-3 w-3" />
                            Flag
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Comments locked message */}
              {report.comments_locked && (
                <div className="text-center py-4">
                  <Lock className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                  <p className="text-sm text-muted-foreground">Comments are locked on this report.</p>
                </div>
              )}

              {/* Comment action buttons */}
              {user && report.status !== "closed" && !report.comments_locked && (
                <div className="pt-2 space-y-2">
                  <div className="flex gap-2">
                    <Button
                      onClick={() => openCommentModal("comment")}
                      variant="outline"
                      className="flex-1 rounded-full border-border text-sm"
                    >
                      + Comment
                    </Button>
                    <Button
                      onClick={() => openCommentModal("progress")}
                      variant="outline"
                      className="flex-1 rounded-full border-amber-300 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 text-sm"
                    >
                      <Wrench className="h-3.5 w-3.5 mr-1" />
                      Progress
                    </Button>
                    <Button
                      onClick={() => {
                        const hasProgress = comments.some((c) => c.comment_type === "progress");
                        if (!hasProgress) {
                          alert("A progress update must be posted before confirming a fix.");
                          return;
                        }
                        openCommentModal("confirm_fix");
                      }}
                      variant="outline"
                      className="flex-1 rounded-full border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-sm"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Confirm Fix
                    </Button>
                  </div>
                </div>
              )}

              {/* Close Report button for reporter when fix is verified */}
              {user && isReporter && hasVerifiedFix && report.status !== "closed" && (
                <div className="pt-2">
                  <Button
                    onClick={handleCloseReport}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-full h-11"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Close Report
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="card-surface rounded-2xl p-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium text-foreground">{categoryLabel[report.category] ?? report.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium text-foreground capitalize">{report.status.replace("_", " ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reported</span>
                <span className="font-medium text-foreground">{format(new Date(report.created_at), "MMM d, yyyy")}</span>
              </div>
              {(report.location_text || placeName) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-medium text-foreground text-right">
                    {placeName || report.location_text}
                  </span>
                </div>
              )}
              {placeName && report.location_text && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Coordinates</span>
                  <span className="font-medium text-foreground">{report.location_text}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Viewers</span>
                <span className="font-medium text-foreground">{viewerCount}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Map Popup */}
      {showMapPopup && report.latitude != null && report.longitude != null && (
        <div className="map-popup-overlay" onClick={() => setShowMapPopup(false)}>
          <div className="map-popup-content" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowMapPopup(false)}
              className="absolute top-3 right-3 z-[10001] w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <MapContainer
              center={[report.latitude, report.longitude]}
              zoom={15}
              className="w-full h-full z-0"
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[report.latitude, report.longitude]} />
            </MapContainer>
          </div>
        </div>
      )}

      {/* Comment Modal */}
      {showCommentModal && (
        <div className="modal-overlay" onClick={() => setShowCommentModal(false)}>
          <div className="modal-content card-surface p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">
                {commentTypeConfig[commentType].label}
              </h3>
              <button onClick={() => setShowCommentModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Comment type badge */}
            {commentType !== "comment" && (
              <div className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border mb-4", (commentTypeConfig[commentType] as { bgColor: string }).bgColor)}>
                {commentType === "progress" && <Wrench className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />}
                {commentType === "confirm_fix" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
                <span className={(commentTypeConfig[commentType] as { color: string }).color}>
                  {commentType === "progress" ? "Image evidence required" : "Photo proof required"}
                </span>
              </div>
            )}

            {/* Image upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            {commentImagePreview ? (
              <div className="relative w-full h-40 rounded-xl overflow-hidden mb-4 bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={commentImagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => { setCommentImage(null); setCommentImagePreview(null); }}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "w-full h-28 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 mb-4 transition-colors",
                  (commentType === "progress" || commentType === "confirm_fix")
                    ? "border-[var(--primary)] text-[var(--primary)]"
                    : "border-border text-muted-foreground hover:border-[var(--primary)] hover:text-[var(--primary)]"
                )}
              >
                <Camera className="h-6 w-6" />
                <span className="text-xs font-medium">
                  {commentType === "comment" ? "Add photo (optional)" : "Upload evidence photo"}
                </span>
              </button>
            )}

            {/* Comment text */}
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={
                commentType === "progress"
                  ? "Describe the progress..."
                  : commentType === "confirm_fix"
                    ? "Describe how the issue was fixed..."
                    : "Add your comment..."
              }
              rows={3}
              className="rounded-xl resize-none mb-4 bg-card border-border"
            />

            <Button
              onClick={handleSubmitComment}
              disabled={
                submittingComment ||
                !newComment.trim() ||
                ((commentType === "progress" || commentType === "confirm_fix") && !commentImage)
              }
              className="w-full bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white rounded-full h-11"
            >
              {submittingComment ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </div>
      )}

      {/* Flag Modal */}
      {showFlagModal && (
        <div className="modal-overlay" onClick={() => setShowFlagModal(false)}>
          <div className="modal-content card-surface p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">
                Flag {flagContentType === "report" ? "Report" : "Comment"}
              </h3>
              <button onClick={() => setShowFlagModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            {flagSuccess ? (
              <div className="text-center py-6">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">Flag submitted. Thank you!</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Please describe why you are flagging this content.
                </p>
                <Textarea
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  placeholder="Reason for flagging..."
                  rows={3}
                  className="rounded-xl resize-none mb-4 bg-card border-border"
                />
                <Button
                  onClick={handleFlag}
                  disabled={submittingFlag || !flagReason.trim()}
                  className="w-full bg-red-600 hover:bg-red-700 text-white rounded-full h-11"
                >
                  {submittingFlag ? "Submitting..." : "Submit Flag"}
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content card-surface p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Delete Report</h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to delete this report? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 rounded-full"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-full"
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Report Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content card-surface p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Edit Report</h3>
              <button onClick={() => setShowEditModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Photo */}
            <div className="mb-4">
              <label className="text-sm font-semibold text-foreground mb-2 block">Photo</label>
              <input
                ref={editFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleEditPhotoSelect}
                className="hidden"
              />
              {editPhotoPreview ? (
                <div className="relative w-full h-40 rounded-xl overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={editPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => { setEditPhotoFile(null); setEditPhotoPreview(null); }}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => editFileInputRef.current?.click()}
                  className="w-full h-28 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                >
                  <Camera className="h-6 w-6" />
                  <span className="text-xs font-medium">Add photo</span>
                </button>
              )}
            </div>

            {/* Title */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-semibold text-foreground">Title</label>
                <span className="text-xs text-muted-foreground/70">{editTitle.length}/50</span>
              </div>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value.slice(0, 50))}
                className="rounded-xl bg-card border-border"
              />
            </div>

            {/* Category */}
            <div className="mb-4">
              <label className="text-sm font-semibold text-foreground mb-1 block">Category</label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-card text-foreground focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none transition-shadow"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-semibold text-foreground">Description</label>
                <span className="text-xs text-muted-foreground/70">{editDescription.length}/300</span>
              </div>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value.slice(0, 300))}
                rows={4}
                className="rounded-xl resize-none bg-card border-border"
              />
            </div>

            <Button
              onClick={handleSaveEdit}
              disabled={saving || !editTitle.trim() || !editCategory || !editDescription.trim()}
              className="w-full bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white rounded-full h-11"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {lightboxImage && (
        <div className="lightbox-overlay" onClick={() => setLightboxImage(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxImage}
            alt="Full size"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </AppShell>
  );
}

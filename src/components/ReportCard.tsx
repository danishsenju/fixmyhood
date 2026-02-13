"use client";

import { cn } from "@/lib/utils/cn";
import { formatDistance, getDistanceColor } from "@/lib/utils/distance";
import {
  MapPin,
  Users,
  MessageCircle,
  Navigation,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface ReportCardProps {
  id: string;
  title: string;
  status: "open" | "acknowledged" | "in_progress" | "closed";
  category: string;
  photoUrl: string | null;
  locationText: string | null;
  createdAt: string;
  followersCount: number;
  commentsCount: number;
  distanceKm?: number | null;
}

const statusConfig: Record<string, { label: string; dot: string }> = {
  open: { label: "Open", dot: "bg-red-400" },
  acknowledged: { label: "Acknowledged", dot: "bg-amber-400" },
  in_progress: { label: "In Progress", dot: "bg-blue-400" },
  closed: { label: "Resolved", dot: "bg-emerald-400" },
};

const categoryLabels: Record<string, string> = {
  infrastructure: "Infrastructure",
  safety: "Safety",
  cleanliness: "Cleanliness",
  environment: "Environment",
  other: "Other",
};

// RGB tint color per category — drives the liquid glass color
const categoryGlassColor: Record<string, { r: number; g: number; b: number }> = {
  infrastructure: { r: 184, g: 131, b: 95 },  // copper
  safety: { r: 199, g: 90, b: 90 },            // warm red
  cleanliness: { r: 90, g: 160, b: 180 },      // teal
  environment: { r: 100, g: 165, b: 110 },     // green
  other: { r: 150, g: 130, b: 175 },           // lavender
};

export function ReportCard({
  id,
  title,
  status,
  category,
  photoUrl,
  locationText,
  createdAt,
  followersCount,
  commentsCount,
  distanceKm,
}: ReportCardProps) {
  const cfg = statusConfig[status] ?? { label: status, dot: "bg-gray-400" };
  const glassColor = categoryGlassColor[category] ?? categoryGlassColor.infrastructure;

  return (
    <Link href={`/report/${id}`} className="block group">
      <div
        className="glass-card"
        style={{
          "--glass-r": glassColor.r,
          "--glass-g": glassColor.g,
          "--glass-b": glassColor.b,
        } as React.CSSProperties}
      >
        {/* Padded inner – image sits inside the glass body */}
        <div className="relative z-[3] p-3 pb-4">
          {/* Image */}
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-secondary/40 shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt={title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/60 to-muted/20">
                <MapPin className="h-8 w-8 text-muted-foreground/30" />
              </div>
            )}

            {/* Status badge overlay */}
            <div className="absolute top-2.5 left-2.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-xl shadow-sm",
                  `status-${status}`
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                {cfg.label}
              </span>
            </div>

            {/* Category tag */}
            <div className="absolute top-2.5 right-2.5">
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/30 text-white/90 backdrop-blur-xl shadow-sm">
                {categoryLabels[category] ?? category}
              </span>
            </div>

            {/* Distance badge */}
            {distanceKm != null && (
              <div className="absolute bottom-2.5 left-2.5">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-black/25 text-white/90 backdrop-blur-xl",
                    getDistanceColor(distanceKm)
                  )}
                >
                  <Navigation className="h-3 w-3" />
                  {formatDistance(distanceKm)}
                </span>
              </div>
            )}

            {/* Hover arrow */}
            <div className="absolute bottom-2.5 right-2.5 w-7 h-7 rounded-full bg-white/25 backdrop-blur-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-sm">
              <ArrowUpRight className="h-3.5 w-3.5 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="pt-4 px-1.5">
            <h3 className="font-semibold text-foreground text-[14px] leading-snug line-clamp-2 group-hover:text-[var(--primary)] transition-colors duration-200">
              {title}
            </h3>

            {locationText && (
              <p className="text-[12px] text-muted-foreground flex items-center gap-1.5 mt-2 truncate">
                <MapPin className="h-3 w-3 flex-shrink-0 text-muted-foreground/50" />
                {locationText}
              </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-white/40 dark:border-white/8">
              <div className="flex items-center gap-3.5 text-[12px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {followersCount}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {commentsCount}
                </span>
              </div>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

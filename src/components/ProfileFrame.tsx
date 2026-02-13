"use client";

import { cn } from "@/lib/utils/cn";
import Image from "next/image";

export type FrameType = "default" | "first_report" | "helper" | "resolver";

interface ProfileFrameProps {
  avatarUrl: string | null;
  displayName: string;
  frame: FrameType;
  size?: "sm" | "md" | "lg" | "xl";
  locked?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { container: "w-9 h-9", image: 36, ring: "ring-2", text: "text-xs" },
  md: { container: "w-12 h-12", image: 48, ring: "ring-[3px]", text: "text-sm" },
  lg: { container: "w-20 h-20", image: 80, ring: "ring-[3px]", text: "text-lg" },
  xl: { container: "w-24 h-24", image: 96, ring: "ring-4", text: "text-2xl" },
};

const frameStyles: Record<FrameType, {
  ring: string;
  glow: string;
  animation: string;
  label: string;
}> = {
  default: {
    ring: "ring-border/60",
    glow: "",
    animation: "",
    label: "Default",
  },
  first_report: {
    ring: "ring-yellow-400 dark:ring-yellow-500",
    glow: "shadow-[0_0_12px_rgba(250,204,21,0.35),0_0_24px_rgba(250,204,21,0.15)]",
    animation: "animate-frame-gold",
    label: "First Responder",
  },
  helper: {
    ring: "ring-cyan-400 dark:ring-cyan-500",
    glow: "shadow-[0_0_12px_rgba(34,211,238,0.35),0_0_24px_rgba(34,211,238,0.15)]",
    animation: "animate-frame-cyan",
    label: "Community Helper",
  },
  resolver: {
    ring: "ring-purple-400 dark:ring-purple-500",
    glow: "shadow-[0_0_12px_rgba(192,132,252,0.35),0_0_24px_rgba(192,132,252,0.15)]",
    animation: "animate-frame-purple",
    label: "Problem Solver",
  },
};

export function ProfileFrame({
  avatarUrl,
  displayName,
  frame,
  size = "md",
  locked = false,
  className,
}: ProfileFrameProps) {
  const s = sizeMap[size];
  const f = locked
    ? { ring: "ring-muted-foreground/30", glow: "", animation: "", label: frameStyles[frame].label }
    : frameStyles[frame];

  return (
    <div
      className={cn(
        "relative rounded-full overflow-visible",
        s.container,
        className
      )}
    >
      {/* Animated glow ring */}
      {!locked && frame !== "default" && (
        <div
          className={cn(
            "absolute -inset-[3px] rounded-full",
            f.glow,
            f.animation
          )}
        />
      )}
      {/* Avatar */}
      <div
        className={cn(
          "relative rounded-full overflow-hidden bg-muted",
          s.container,
          s.ring,
          f.ring,
          locked && "opacity-50 grayscale"
        )}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={displayName}
            width={s.image}
            height={s.image}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className={cn(
              "w-full h-full flex items-center justify-center font-bold",
              locked ? "text-muted-foreground/50" : "text-muted-foreground",
              s.text
            )}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      {/* Lock overlay */}
      {locked && (
        <div className="absolute inset-0 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-muted-foreground/60" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" />
          </svg>
        </div>
      )}
    </div>
  );
}

export function FrameSelector({
  currentFrame,
  unlockedFrames,
  onSelect,
  avatarUrl,
  displayName,
}: {
  currentFrame: FrameType;
  unlockedFrames: FrameType[];
  onSelect: (frame: FrameType) => void;
  avatarUrl: string | null;
  displayName: string;
}) {
  const allFrames: FrameType[] = ["default", "first_report", "helper", "resolver"];

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-foreground">Profile Frame</p>
      <div className="grid grid-cols-2 gap-4">
        {allFrames.map((frame) => {
          const isUnlocked = unlockedFrames.includes(frame);
          const isActive = currentFrame === frame;
          const f = frameStyles[frame];
          return (
            <button
              key={frame}
              onClick={() => isUnlocked && onSelect(frame)}
              disabled={!isUnlocked}
              className={cn(
                "card-surface rounded-2xl p-4 flex flex-col items-center gap-3 transition-all duration-200",
                isActive && "ring-2 ring-[var(--primary)]",
                !isUnlocked && "opacity-60 cursor-not-allowed"
              )}
            >
              <ProfileFrame
                avatarUrl={avatarUrl}
                displayName={displayName}
                frame={frame}
                size="lg"
                locked={!isUnlocked}
              />
              <span className="text-xs font-medium text-foreground">
                {f.label}
              </span>
              {isActive && (
                <span className="text-[10px] font-semibold text-[var(--primary)]">
                  Active
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

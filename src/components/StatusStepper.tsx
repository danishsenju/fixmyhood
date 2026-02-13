"use client";

import { cn } from "@/lib/utils/cn";
import { Check } from "lucide-react";

const steps = [
  { key: "open", label: "Open" },
  { key: "acknowledged", label: "Acknowledged" },
  { key: "in_progress", label: "In Progress" },
  { key: "closed", label: "Closed" },
] as const;

interface StatusStepperProps {
  status: "open" | "acknowledged" | "in_progress" | "closed";
}

export function StatusStepper({ status }: StatusStepperProps) {
  const currentIndex = steps.findIndex((s) => s.key === status);

  return (
    <div className="flex items-center justify-between w-full">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                  isCompleted &&
                    "bg-[var(--primary)] text-white shadow-[0_0_12px_rgba(184,131,95,0.3)]",
                  isCurrent &&
                    "bg-[var(--primary)] text-white ring-4 ring-[var(--primary)]/20 shadow-[0_0_16px_rgba(184,131,95,0.35)]",
                  !isCompleted && !isCurrent && "bg-secondary text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span
                className={cn(
                  "text-[10px] mt-1.5 text-center w-16 font-medium",
                  isCurrent
                    ? "text-[var(--primary)]"
                    : isCompleted
                      ? "text-foreground"
                      : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-[2px] mx-1.5 mb-5 rounded-full transition-colors duration-300",
                  index < currentIndex ? "bg-[var(--primary)]" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

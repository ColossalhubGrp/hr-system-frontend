"use client";

import { AlertTriangle, Check, HelpCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ReviewVerdict } from "./types";

/**
 * Small pill that renders the Adversarial Reviewer's verdict for a
 * saved dashboard tile. Colour + icon + label vary per verdict; the
 * variant sits alongside the tile title so an executive sees the
 * status at a glance before reading the number.
 *
 * `unreviewed` is amber-neutral rather than red — it means "the
 * LLM couldn't render an opinion", not "the answer failed". Callers
 * that need to gate on approve-only (share links, scheduled report
 * publish) should check verdict === "approve" explicitly.
 */
export function ReviewBadge({
  verdict,
  size = "sm",
  className,
}: {
  verdict: ReviewVerdict;
  size?: "sm" | "md";
  className?: string;
}) {
  const cfg = _VERDICT_CONFIG[verdict] ?? _VERDICT_CONFIG.unreviewed;
  const Icon = cfg.icon;
  const sizing =
    size === "md"
      ? "px-2.5 py-1 text-[11px]"
      : "px-1.5 py-0.5 text-[10px]";
  const iconSize = size === "md" ? "h-3.5 w-3.5" : "h-3 w-3";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-semibold uppercase tracking-wide",
        cfg.classes,
        sizing,
        className,
      )}
      title={cfg.title}
    >
      <Icon className={cn(iconSize, "shrink-0")} />
      {cfg.label}
    </span>
  );
}

const _VERDICT_CONFIG = {
  approve: {
    icon: Check,
    label: "Approved",
    title: "Adversarial Reviewer found no factual issues.",
    classes:
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  },
  warn: {
    icon: AlertTriangle,
    label: "Warn",
    title:
      "Adversarial Reviewer flagged minor issues — see the tile's issue list.",
    classes:
      "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  },
  reject: {
    icon: XCircle,
    label: "Revised",
    title:
      "Adversarial Reviewer rejected the original narrative — the shown text is the reviewer's revised version.",
    classes:
      "border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-300",
  },
  unreviewed: {
    icon: HelpCircle,
    label: "Unreviewed",
    title:
      "Reviewer path unavailable at save time. Consider refreshing to try again.",
    classes:
      "border-muted bg-muted/40 text-muted-foreground",
  },
} as const;

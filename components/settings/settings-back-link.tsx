"use client";

import Link from "next/link";
import type { Route } from "next";
import { useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Labels for the known module setup landing pages a settings page can
 *  land on when the user follows a "Setup" card. Fallback for any other
 *  origin is "Back". */
const LABELS: Record<string, string> = {
  "/hr/leaves/setup": "Back to leaves setup",
  "/hr/attendance/setup": "Back to attendance setup",
  "/hr/performance/setup": "Back to performance setup",
  "/employee/setup": "Back to employee setup",
  "/payroll/setup": "Back to payroll setup",
};

/** Back link on a settings page. Reads `?from=<url>` on the current URL —
 *  set by the module Setup card the user came from — and jumps back to
 *  that surface. Falls back to /settings (Configuration). Keeps the
 *  ghost-button styling every settings page already uses. */
export function SettingsBackLink() {
  const params = useSearchParams();
  const from = params.get("from") || "/settings";
  const label = LABELS[from] ?? (from === "/settings" ? "Back to configuration" : "Back");
  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className="w-fit gap-1 text-xs text-muted-foreground"
    >
      <Link href={from as Route}>
        <ChevronLeft className="h-3.5 w-3.5" />
        {label}
      </Link>
    </Button>
  );
}

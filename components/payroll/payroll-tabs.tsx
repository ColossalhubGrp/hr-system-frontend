"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { PAYROLL_TABS, PAYROLL_TAB_HREFS } from "@/lib/payroll-engine/tabs";

/**
 * Underline-style horizontal tab strip. Mirrors Rippling's product nav.
 *
 * Hidden on routes that aren't part of the main tabbed surface (per-run
 * detail, run wizard, off-cycle wizard, new-pay-run form) because those
 * are full-screen flows where the tab bar would be visual noise.
 */
export function PayrollTabs() {
  const pathname = usePathname();
  // Only render on a top-level tab href. Setup lives on the sidebar
  // (not as a tab) because its 6 sub-tabs would crowd this strip, so
  // we deliberately don't show this top-strip on /payroll/setup/*.
  if (!PAYROLL_TAB_HREFS.includes(pathname)) return null;

  return (
    <div className="-mt-4 mb-5 border-b">
      <div className="flex gap-5 overflow-x-auto text-sm">
        {PAYROLL_TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href as Route}
              className={cn(
                "-mb-px whitespace-nowrap border-b-2 pb-2 pt-1 font-semibold transition",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

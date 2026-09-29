"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { PERIOD_OPTIONS, type PeriodKey } from "@/lib/payroll-engine/dashboard";
import { cn } from "@/lib/cn";

/**
 * Native <select> that rewrites `?period=` on the URL, triggering a
 * fresh Server Component render of the dashboard. Kept native so the
 * form value is a plain string with no client-side state to sync.
 */
export function PeriodFilter({ current }: { current: PeriodKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  function onChange(next: string) {
    const q = new URLSearchParams(params);
    q.set("period", next);
    start(() => router.push(`${pathname}?${q.toString()}`));
  }

  return (
    <label className="relative inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
      <span>Period</span>
      <div className="relative">
        <select
          value={current}
          onChange={(e) => onChange(e.target.value)}
          disabled={pending}
          className={cn(
            "h-10 appearance-none rounded-lg border border-input bg-transparent pl-3 pr-9 text-sm font-semibold text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60",
          )}
        >
          {PERIOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </div>
    </label>
  );
}

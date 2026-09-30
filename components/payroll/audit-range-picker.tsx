"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";

/**
 * From/To date pair that pushes the new query string on every change,
 * no submit button. Rewrites ?from=/?to= on the current pathname so
 * the Server Component re-renders with the new range.
 */
export function AuditRangePicker({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  function push(next: { from?: string; to?: string }) {
    const q = new URLSearchParams(params);
    if (next.from !== undefined) q.set("from", next.from);
    if (next.to   !== undefined) q.set("to",   next.to);
    start(() => router.push(`${pathname}?${q.toString()}`));
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor="from" className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          From
        </label>
        <input
          type="date"
          id="from"
          value={from}
          onChange={(e) => push({ from: e.currentTarget.value })}
          disabled={pending}
          className="h-10 rounded-md border border-input bg-transparent px-3 text-sm disabled:opacity-60"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="to" className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          To
        </label>
        <input
          type="date"
          id="to"
          value={to}
          onChange={(e) => push({ to: e.currentTarget.value })}
          disabled={pending}
          className="h-10 rounded-md border border-input bg-transparent px-3 text-sm disabled:opacity-60"
        />
      </div>
      {pending ? (
        <div className="flex h-10 items-center text-xs text-muted-foreground">
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Updating…
        </div>
      ) : null}
    </div>
  );
}

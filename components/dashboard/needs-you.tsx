import Link from "next/link";
import type { Route } from "next";
import { ChevronRight } from "lucide-react";
import type { NeedsYouItem } from "@/lib/frappe/exec-snapshot";

/**
 * The to-do strip: everything waiting on a person, each one a direct
 * way in. Items with a zero count never reach this component; when
 * nothing is pending the strip stays off the page entirely.
 */
export function NeedsYou({ items }: { items: NeedsYouItem[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-label="Needs you today" className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold text-ash-900">Needs you:</span>
      {items.map((i) => (
        <Link
          key={i.href + i.label}
          href={i.href as Route}
          className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-3 py-1.5 text-sm text-ash-700 transition hover:border-ink-300 hover:text-ash-900"
        >
          <span className="font-bold tabular-nums text-ink-800">{i.count}</span>
          {i.label}
          <ChevronRight className="h-3.5 w-3.5 text-ash-400" />
        </Link>
      ))}
    </section>
  );
}

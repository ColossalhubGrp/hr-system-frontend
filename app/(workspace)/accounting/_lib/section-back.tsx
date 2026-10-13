import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft } from "lucide-react";
import { sectionForHref } from "./sections";

/**
 * Contextual "back" link for Accounting detail / list pages.
 * Looks up which section (Masters / Transactions / Banking /
 * Tax / Subscriptions / Shares / ...) owns the current path from
 * the SECTIONS registry and sends the user back to THAT section's
 * tab, not the Accounting root.
 *
 * Previously every list page hard-coded "Back to Accounting" →
 * `/accounting`, which lost the user's place: landing on Banks
 * from Banking and clicking Back dumped you on the Overview tab
 * instead of Banking.
 */
export function SectionBack({ path }: { path: string }) {
  const section = sectionForHref(path);
  const href = section ? `/accounting?s=${section.id}` : "/accounting";
  const label = section?.label ?? "Accounting";
  return (
    <div className="flex items-center gap-2 text-sm">
      <Link
        href={href as Route}
        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to {label}
      </Link>
    </div>
  );
}

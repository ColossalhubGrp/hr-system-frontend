"use client";

import { ChevronDown } from "lucide-react";

/**
 * The "Last Quarter / Weekly" filter pair that sits in the top-right of every
 * chart card on the dashboard. Click handlers are stubs for now — the dashboard
 * snapshot is computed server-side at the moment a page is rendered.
 */
export function RangePills({
  range = "Last Quarter",
  cadence = "Weekly",
}: {
  range?: string;
  cadence?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" className="chip focus-ring">
        {range}
        <ChevronDown className="h-3 w-3" />
      </button>
      <button type="button" className="chip focus-ring">
        {cadence}
        <ChevronDown className="h-3 w-3" />
      </button>
    </div>
  );
}

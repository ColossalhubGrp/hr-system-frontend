import { cn } from "@/lib/cn";

/**
 * Themed skeleton pieces for use inside App Router loading.tsx
 * boundaries. Each primitive is a Tailwind-pulsing block that
 * reads from the semantic surface tokens so it flips cleanly in
 * dark mode (ash-100 → whatever the dark theme redefines it to).
 */

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-ash-100", className)}
      aria-hidden="true"
    />
  );
}

/** A full workspace-page shell: breadcrumb + title + content area.
 *  The outer container matches a real page's spacing so swapping
 *  between skeleton and content doesn't shift the layout. */
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading">
      <div className="flex flex-col gap-3">
        <SkeletonBlock className="h-4 w-40" />
        <SkeletonBlock className="h-8 w-72" />
      </div>
      <SkeletonBlock className="h-4 w-full max-w-xl" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-5">
      <SkeletonBlock className="h-4 w-24" />
      <SkeletonBlock className="h-7 w-32" />
      <SkeletonBlock className="h-3 w-20" />
    </div>
  );
}

/** Dashboard-shaped skeleton: 4 KPI tiles + 3 rows of 2 chart
 *  cards. Matches the Overall / HR dashboard layout. */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading dashboard">
      <SkeletonBlock className="h-8 w-56" />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiSkeleton key={i} />
        ))}
      </section>

      {[0, 1, 2].map((row) => (
        <section
          key={row}
          className="grid grid-cols-1 gap-4 lg:grid-cols-2"
        >
          {[0, 1].map((col) => (
            <ChartCardSkeleton key={col} />
          ))}
        </section>
      ))}
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-5">
      <SkeletonBlock className="h-3 w-24" />
      <SkeletonBlock className="h-9 w-28" />
      <div className="flex items-center justify-between gap-3">
        <SkeletonBlock className="h-3 w-24" />
        <SkeletonBlock className="h-10 w-20" />
      </div>
    </div>
  );
}

function ChartCardSkeleton() {
  return (
    <div className="flex h-[290px] flex-col gap-4 rounded-card border border-hairline bg-surface px-5 py-4">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-4 w-40" />
        <SkeletonBlock className="h-6 w-24" />
      </div>
      <SkeletonBlock className="flex-1" />
    </div>
  );
}

/** Table-shaped skeleton: back link + title + a 6-row rail. */
export function TableSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Loading">
      <SkeletonBlock className="h-4 w-32" />
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <SkeletonBlock className="h-7 w-56" />
          <SkeletonBlock className="h-4 w-72" />
        </div>
        <SkeletonBlock className="h-10 w-32" />
      </div>
      <div className="overflow-hidden rounded-card border border-hairline bg-surface">
        <div className="border-b border-hairline p-4">
          <SkeletonBlock className="h-3 w-full max-w-xl" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-hairline p-4 last:border-b-0">
            <SkeletonBlock className="h-4 w-1/4" />
            <SkeletonBlock className="h-4 w-1/5" />
            <SkeletonBlock className="h-4 w-1/5" />
            <SkeletonBlock className="ml-auto h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

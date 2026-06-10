import { cn } from "@/lib/cn";

/**
 * The "C" wordmark used in the sidebar and on auth pages. SVG so it stays
 * crisp on retina and small enough to inline without an asset round-trip.
 * Stroke + cap chosen to match the friendly, slightly rounded mockup glyph.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "grid place-items-center rounded-full bg-white text-ink-800",
        className,
      )}
      aria-label="Colossal"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-1/2 w-1/2"
        aria-hidden
      >
        <path d="M19 6.5A8.5 8.5 0 1 0 19 17.5" />
      </svg>
    </div>
  );
}

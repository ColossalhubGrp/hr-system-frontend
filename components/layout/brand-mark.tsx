import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * Official Colossal Hub brand mark — JUST the circled C (navy ring
 * around the mint green C). The wordmark is intentionally omitted:
 * the sidebar renders this at ~40x40, and the "Colossal Hub" lockup
 * would be unreadable at that size.
 *
 * Asset: `/public/colossal-hub-c-mark.png` — transparent background,
 * so the same file drops cleanly onto the white sidebar rail OR any
 * coloured surface (modal headers, dark pills) without a halo.
 *
 * `variant` is kept as a prop for backwards compatibility with the
 * two existing call sites that pass "inverse" (Hub.tsx, Phone.tsx
 * on the public site) — on those surfaces we still want the
 * white-C-on-navy chip, so they fall through to the pre-cropped
 * `-mark-inverse` asset.
 */
export function BrandMark({
  className,
  variant = "light",
}: {
  className?: string;
  /** `light` → circled C only, navy ring + mint C, transparent bg.
   *  `inverse` → full mark (white C on navy ground, with lockup). */
  variant?: "light" | "inverse";
}) {
  const src =
    variant === "inverse"
      ? "/colossal-hub-mark-inverse.png"
      : "/colossal-hub-c-mark.png";
  return (
    <div
      // `rounded-full` keeps the container shape circular so that
      // callers which add a `ring-1 ring-hairline` (auth shells)
      // render a clean circular hairline around the mark.
      className={cn("relative overflow-hidden rounded-full", className)}
      aria-label="Colossal Hub"
    >
      <Image
        src={src}
        alt=""
        fill
        sizes="40px"
        priority
        className="object-contain"
      />
    </div>
  );
}

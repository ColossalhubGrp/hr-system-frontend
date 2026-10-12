import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * Official Colossal Hub brand mark — navy ring + mint green C.
 *
 * The asset lives at `/public/colossal-hub-mark.png` (sampled from
 * the brand pack delivered 2026-10-12). Rendered via next/image so
 * it scales cleanly on retina and ships in the browser's own cache.
 *
 * For dark surfaces (sidebar, modals in dark mode) pass
 * `variant="inverse"` to get the white-on-navy variant.
 */
export function BrandMark({
  className,
  variant = "light",
}: {
  className?: string;
  /** `light` → color mark on transparent (works on white / light bg).
   *  `inverse` → white mark on navy ground (works on dark bg). */
  variant?: "light" | "inverse";
}) {
  const src =
    variant === "inverse"
      ? "/colossal-hub-mark-inverse.png"
      : "/colossal-hub-mark.png";
  return (
    <div
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

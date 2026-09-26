import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/cn";
import { Card, CardContent } from "@/components/ui/card";

const TONES = {
  ink: "bg-primary/10 text-primary",
  rise: "bg-rise/10 text-rise",
  fall: "bg-destructive/10 text-destructive",
  amber: "bg-amber-100/60 text-amber-800",
  ash: "bg-muted text-muted-foreground",
} as const;

type Tone = keyof typeof TONES;

export function SummaryTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "ink",
  href,
  compact = false,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon?: LucideIcon;
  tone?: Tone;
  href?: string;
  /** Smaller padding + smaller value font. For rows where the tile
   *  sits alongside a bigger primary card. */
  compact?: boolean;
}) {
  // Sizes deliberately kept tight -- earlier defaults produced too-tall
  // tiles across every summary row in the system. Compact stays a step
  // smaller for dense inline rows.
  const inner = (
    <Card className="h-full transition group-hover:border-primary/40">
      <CardContent
        className={cn(
          "flex h-full flex-col",
          compact ? "gap-0.5 p-2.5" : "gap-1 p-3",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "font-medium uppercase tracking-wide text-muted-foreground leading-none",
              compact ? "text-[10px]" : "text-[11px]",
            )}
          >
            {label}
          </p>
          {Icon && (
            <span
              className={cn(
                "grid place-items-center rounded-full shrink-0",
                compact ? "h-5 w-5" : "h-6 w-6",
                TONES[tone],
              )}
            >
              <Icon className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
            </span>
          )}
        </div>
        <p
          className={cn(
            "font-semibold text-foreground leading-tight",
            compact ? "text-base" : "text-xl",
          )}
        >
          {value}
        </p>
        {hint && (
          <p
            className={cn(
              "text-muted-foreground leading-tight",
              compact ? "text-[10px]" : "text-[11px]",
            )}
          >
            {hint}
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href as Route} className="group focus-ring rounded-xl">
        {inner}
      </Link>
    );
  }
  return inner;
}

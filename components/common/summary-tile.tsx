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
  // Sized to match a Desk-style summary strip -- three tight rows in the
  // same vertical rhythm (label / value / optional hint), no wasted
  // padding, small icon chip. Compact drops one more step for the very
  // densest inline rows.
  const inner = (
    <Card className="h-full transition group-hover:border-primary/40">
      <CardContent
        className={cn(
          "flex h-full flex-col",
          compact ? "gap-0 p-2" : "gap-0.5 p-2.5",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "font-medium uppercase tracking-wide text-muted-foreground leading-none",
              compact ? "text-[9px]" : "text-[10px]",
            )}
          >
            {label}
          </p>
          {Icon && (
            <span
              className={cn(
                "grid place-items-center rounded-full shrink-0",
                compact ? "h-4 w-4" : "h-5 w-5",
                TONES[tone],
              )}
            >
              <Icon className={compact ? "h-2 w-2" : "h-2.5 w-2.5"} />
            </span>
          )}
        </div>
        <p
          className={cn(
            "font-semibold text-foreground leading-tight",
            compact ? "text-sm" : "text-lg",
          )}
        >
          {value}
        </p>
        {hint && (
          <p
            className={cn(
              "text-muted-foreground leading-tight",
              compact ? "text-[9px]" : "text-[10px]",
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

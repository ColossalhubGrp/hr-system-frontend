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
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon?: LucideIcon;
  tone?: Tone;
  href?: string;
}) {
  const inner = (
    <Card className="h-full transition group-hover:border-primary/40">
      <CardContent className="flex h-full flex-col gap-2 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          {Icon && (
            <span
              className={cn("grid h-7 w-7 place-items-center rounded-full", TONES[tone])}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
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

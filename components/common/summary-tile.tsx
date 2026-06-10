import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/cn";

const TONES = {
  ink: "bg-ink-50/60 text-ink-800",
  rise: "bg-rise/10 text-rise",
  fall: "bg-fall/10 text-fall",
  amber: "bg-amber-100/60 text-amber-800",
  ash: "bg-ash-100/60 text-ash-700",
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
    <div className="flex h-full flex-col gap-2 rounded-card border border-hairline bg-surface p-4 shadow-card transition group-hover:border-ink-100">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-ash-500">
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
      <p className="text-2xl font-semibold text-ink-900">{value}</p>
      {hint && <p className="text-xs text-ash-500">{hint}</p>}
    </div>
  );

  if (href) {
    return (
      <Link href={href as Route} className="group focus-ring rounded-card">
        {inner}
      </Link>
    );
  }
  return inner;
}

import Link from "next/link";
import type { Route } from "next";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Sparkles } from "lucide-react";

/**
 * Branded "coming soon" page for modules that are on the roadmap but
 * not built yet — shown instead of a 404 so the area feels planned,
 * not broken.
 */
export function ComingSoon({
  icon: Icon,
  title,
  blurb,
}: {
  icon: LucideIcon;
  title: string;
  blurb: string;
}) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="mx-auto flex max-w-md flex-col items-center gap-5 text-center">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-ink-800/10">
            <Icon className="h-9 w-9 text-ink-800" />
          </div>
          <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-white shadow">
            <Sparkles className="h-4 w-4" />
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <span className="mx-auto w-max rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-700">
            Coming soon
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{blurb}</p>
        </div>

        <p className="text-xs text-muted-foreground">
          We&apos;re building this part of Colossal Hub right now — it will light up here the
          moment it&apos;s ready. No setup needed on your side.
        </p>

        <Link
          href={"/" as Route}
          className="inline-flex h-10 items-center gap-2 rounded-chip bg-ink-800 px-5 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}

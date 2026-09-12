import Link from "next/link";
import type { Route } from "next";
import { ChevronRight } from "lucide-react";

export type SetupCard = {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
};

/** Grid of setting cards scoped to one module — used by every /<module>/setup
 *  landing page so the visual footprint is identical across modules.
 *  Card `href` points at the actual setting page (which today still lives
 *  under /settings/...; we can move URLs incrementally without changing
 *  this component). */
export function ModuleSetupGrid({ cards }: { cards: SetupCard[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((c) => (
        <Link
          key={c.href}
          href={c.href as Route}
          className="group flex items-start gap-3 rounded-card border border-hairline bg-surface p-4 shadow-card transition hover:border-ink-400 focus-ring"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-ink-50 text-ink-800">
            {c.icon}
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink-900">{c.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-ash-600">{c.desc}</p>
          </div>
          <ChevronRight className="mt-1 h-4 w-4 text-ash-500 transition group-hover:text-ink-800" />
        </Link>
      ))}
    </div>
  );
}

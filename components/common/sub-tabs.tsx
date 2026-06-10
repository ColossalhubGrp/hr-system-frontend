import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/cn";

export type SubTab = { id: string; label: string };

export function SubTabs({
  tabs,
  active,
  hrefFor,
}: {
  tabs: SubTab[];
  active: string;
  hrefFor: (id: string) => string;
}) {
  return (
    <nav className="card -mb-2 overflow-x-auto p-1.5" aria-label="Section">
      <ul className="flex min-w-max items-center gap-1">
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <li key={t.id}>
              <Link
                href={hrefFor(t.id) as Route}
                className={cn(
                  "inline-flex items-center rounded-chip px-3.5 py-1.5 text-sm font-medium transition focus-ring",
                  isActive
                    ? "bg-ink-800 text-white shadow-sm"
                    : "text-ash-600 hover:bg-canvas",
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

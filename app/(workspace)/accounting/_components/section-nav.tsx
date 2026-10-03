import Link from "next/link";
import type { Route } from "next";
import { SECTIONS, OVERVIEW_ID } from "../_lib/sections";
import { cn } from "@/lib/cn";

/**
 * Sticky left sub-sidebar for the Accounting module home. Each item
 * is an in-page section switcher (?s=masters), not a sub-route, so
 * clicks are a Server-Component re-render with no bundle hop.
 *
 * Uses brand primary (deep ink-purple) for selected state so it
 * echoes the main workspace rail without copying its chrome.
 */
export function SectionNav({ active }: { active: string }) {
  return (
    <nav aria-label="Accounting sections" className="shrink-0">
      <ul className="sticky top-4 flex flex-col gap-0.5">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const isActive = active === s.id;
          const href =
            s.id === OVERVIEW_ID
              ? "/accounting"
              : `/accounting?s=${encodeURIComponent(s.id)}`;
          return (
            <li key={s.id}>
              <Link
                href={href as Route}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-chip px-3 py-2 text-sm transition",
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-foreground/80 hover:bg-muted/50 hover:text-foreground",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isActive ? "text-primary-foreground" : "text-muted-foreground",
                  )}
                />
                <span className="truncate">{s.label}</span>
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-foreground/90" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

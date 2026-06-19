import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/cn";

export type SubTab = { id: string; label: string };

/**
 * Anchor-based tab bar — preserved as <Link>s (not shadcn's <Tabs>) because
 * each tab is its own URL and we want SSR + browser back/forward to "just
 * work". Styled to match shadcn's TabsList pill / TabsTrigger active state.
 */
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
    <nav
      className="inline-flex items-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground"
      aria-label="Section"
    >
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <Link
            key={t.id}
            href={hrefFor(t.id) as Route}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive
                ? "bg-background text-foreground shadow"
                : "hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

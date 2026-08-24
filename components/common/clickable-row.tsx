"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/cn";

/**
 * Table row that navigates to `href` when clicked anywhere on the row
 * body (background cells) OR pressed with Enter/Space while focused.
 *
 * Inner interactive elements (links, buttons, checkboxes, labels,
 * inputs) are respected: clicks that originate on them run their own
 * behavior and the row-nav is skipped. This lets us keep existing
 * per-cell links (EmployeeCell, name-links wrapping non-employee
 * labels) without a double-navigate.
 *
 * Rendered from the server DataTable — cells arrive as already-rendered
 * JSX children so the server/client boundary stays clean.
 */
export function ClickableRow({
  href,
  ariaLabel,
  className,
  children,
}: {
  /** When set, the row becomes clickable. Undefined = static row. */
  href?: string;
  /** Accessible label for the "link" role. Falls back to href. */
  ariaLabel?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  if (!href) {
    return <TableRow className={className}>{children}</TableRow>;
  }

  return (
    <TableRow
      onClick={(e) => {
        const el = e.target as HTMLElement;
        // Don't hijack clicks that landed on an interactive control —
        // let anchors/buttons/inputs do their own thing. `closest`
        // walks up from the click origin, catching the inner link
        // even when the user clicked the text inside it.
        if (
          el.closest(
            "a, button, input, select, textarea, label, [role=button], [role=link]",
          )
        ) {
          return;
        }
        router.push(href as Route);
      }}
      onKeyDown={(e) => {
        // Enter follows the link (Space would too on a real anchor,
        // but on an ARIA link the pattern is Enter-only — Space is
        // reserved for button-like activation, which we don't have).
        if (e.key === "Enter") {
          e.preventDefault();
          router.push(href as Route);
        }
      }}
      tabIndex={0}
      role="link"
      aria-label={ariaLabel ?? `Open ${href}`}
      className={cn(
        "cursor-pointer transition hover:bg-accent/40 focus-ring",
        className,
      )}
    >
      {children}
    </TableRow>
  );
}

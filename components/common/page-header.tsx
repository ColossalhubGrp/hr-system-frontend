import type { LucideIcon } from "lucide-react";
import { PagePrintAction } from "@/components/common/page-print-action";

/**
 * PageHeader — shared chrome on every workspace page.
 *
 * After the shadcn migration this still uses brand tokens for the icon /
 * crumb / title (those don't have semantic equivalents in shadcn), but the
 * subtitle now reads from `text-muted-foreground` so it tracks the theme.
 *
 * Printing lives on documents and reports (their own Print buttons),
 * NOT on every page — so the compact print control is opt-in:
 * `printable` defaults to false and only a page that explicitly asks
 * for it renders the icon.
 */
export function PageHeader({
  icon: Icon,
  crumb,
  title,
  subtitle,
  actions,
  printable = false,
}: {
  icon: LucideIcon;
  crumb: string;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  printable?: boolean;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {crumb}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {(actions || printable) && (
        <div className="flex items-center gap-2 print:hidden">
          {actions}
          {printable && <PagePrintAction />}
        </div>
      )}
    </header>
  );
}

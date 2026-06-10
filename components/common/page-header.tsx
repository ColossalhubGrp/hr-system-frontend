import type { LucideIcon } from "lucide-react";

export function PageHeader({
  icon: Icon,
  crumb,
  title,
  subtitle,
  actions,
}: {
  icon: LucideIcon;
  crumb: string;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <Icon className="h-3.5 w-3.5" />
          {crumb}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          {title}
        </h1>
        {subtitle && <p className="text-sm text-ash-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

import Link from "next/link";
import type { Route } from "next";
import { Check, AlertCircle, Settings2, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getHrReadiness } from "@/lib/frappe/setup/hr-readiness";
import { cn } from "@/lib/cn";

export const metadata = { title: "HR setup · Colossal Suite" };
export const dynamic = "force-dynamic";

export default async function HrSetupPage() {
  const report = await getHrReadiness();
  const done = report.items.filter((i) => i.done).length;
  const total = report.items.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={Settings2}
        crumb="HR · Setup"
        title="HR setup"
        subtitle={
          report.ready
            ? "You're set. Hiring, leave, attendance and performance workflows will save cleanly."
            : "Finish these one-time pieces so HR workflows don't reject on save."
        }
      />

      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold">{done} of {total} done</div>
          <div className="text-xs font-semibold tabular-nums text-muted-foreground">{pct}%</div>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", report.ready ? "bg-emerald-500" : "bg-ink-800")}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {report.items.map((item) => (
          <Link
            key={item.key}
            href={item.href as Route}
            className={cn(
              "group flex items-start gap-4 rounded-2xl border p-4 transition hover:bg-muted/30",
              item.done ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/60 bg-card",
            )}
          >
            <div
              className={cn(
                "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2",
                item.done
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-amber-500/60 text-amber-500",
              )}
              aria-hidden
            >
              {item.done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <AlertCircle className="h-3.5 w-3.5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-sm font-semibold text-foreground">{item.label}</div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.hint}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

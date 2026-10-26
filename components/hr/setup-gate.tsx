import Link from "next/link";
import type { Route } from "next";
import { AlertTriangle, ArrowRight, Check } from "lucide-react";
import { getHrReadiness } from "@/lib/frappe/setup/hr-readiness";
import { cn } from "@/lib/cn";

/**
 * Server component. Mirror of AccountingSetupGate for HR workflows.
 * Wraps a page that creates or edits an HR record (Employee, Leave
 * Request, Attendance, …). If any mandatory HR masters are missing,
 * replaces the children with a soft blocker listing what to fix.
 */
export async function HrSetupGate({ children }: { children: React.ReactNode }) {
  const report = await getHrReadiness();
  if (report.ready) return <>{children}</>;

  const missing = report.items.filter((i) => !i.done);
  const first = missing[0];

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-foreground">
              Finish your HR setup first
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {missing.length === 1
                ? "One piece of HR configuration is missing before this page can save a record."
                : `${missing.length} pieces of HR configuration are missing before this page can save a record.`}
              {" "}
              Fix them once; onboarding, leave and attendance will work after that.
            </p>
          </div>
          {first && (
            <Link
              href={first.href as Route}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white hover:bg-ink-700"
            >
              Fix now
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {report.items.map((item) => (
          <li
            key={item.key}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-3",
              item.done ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/60 bg-card",
            )}
          >
            <div
              className={cn(
                "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                item.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-amber-500 text-amber-500",
              )}
              aria-hidden
            >
              {item.done ? <Check className="h-3 w-3" strokeWidth={3} /> : <AlertTriangle className="h-3 w-3" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className={cn("text-sm", item.done ? "font-normal text-muted-foreground line-through" : "font-semibold text-foreground")}>
                {item.label}
              </div>
              {!item.done && (
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.hint}</p>
              )}
            </div>
            {!item.done && (
              <Link
                href={item.href as Route}
                className="shrink-0 self-center rounded-chip border border-input px-3 py-1.5 text-xs font-semibold hover:bg-muted/40"
              >
                Open
              </Link>
            )}
          </li>
        ))}
      </ul>

      <div className="text-center text-xs text-muted-foreground">
        See the full{" "}
        <Link href={"/hr/setup" as Route} className="font-semibold text-foreground underline">
          HR setup checklist
        </Link>
        .
      </div>
    </div>
  );
}

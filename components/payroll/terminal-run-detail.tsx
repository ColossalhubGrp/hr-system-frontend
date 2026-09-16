import Link from "next/link";
import type { Route } from "next";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { PayRunRow } from "@/lib/payroll-engine/payruns";
import { loadTerminalRunSnapshot } from "@/lib/frappe/payroll-terminal";
import { TerminalProcessButton } from "@/components/payroll/terminal-process-button";

/**
 * Detail view for TERMINAL off-cycle Payroll Runs — replaces the
 * regular whole-roster employees table since terminal runs target
 * one employee. Shows the captured package items grouped by ZIMRA
 * §14 class + a Process button that runs the specialised §14
 * engine branch.
 *
 * This is an async server component; loads the snapshot then
 * hands it to the client Process button.
 */
export async function TerminalRunDetail({ run }: { run: PayRunRow }) {
  const targetEmployee = run.target_employee || "";
  const snapshot = targetEmployee
    ? await loadTerminalRunSnapshot(run.name, targetEmployee)
    : null;

  const usd = (n: number) =>
    `US$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const CLASS_META: Record<
    string,
    { label: string; chip: string; hint: string }
  > = {
    retrenchment_eligible: {
      label: "Retrenchment package",
      chip: "bg-emerald-100 text-emerald-700",
      hint: "§14 exemption applies",
    },
    cash_in_lieu: {
      label: "Cash in lieu of leave",
      chip: "bg-amber-100 text-amber-700",
      hint: "Fully taxable",
    },
    exempt_passage: {
      label: "Relocation / passage",
      chip: "bg-blue-100 text-blue-700",
      hint: "Fully exempt",
    },
    regular: {
      label: "Other taxable earning",
      chip: "bg-slate-100 text-slate-700",
      hint: "Fully taxable",
    },
  };

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/payroll" as Route}
        className="w-fit text-sm font-semibold text-primary hover:underline"
      >
        ← All pay runs
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            {run.period_label}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Off-cycle · Terminal · Pay date{" "}
            {(() => {
              const [y, m, d] = run.pay_date.slice(0, 10).split("-").map(Number);
              return y && m && d
                ? new Date(y, m - 1, d).toLocaleDateString("en-GB", {
                    day: "numeric", month: "short", year: "numeric",
                  })
                : run.pay_date;
            })()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/payroll/terminate?employee=${encodeURIComponent(targetEmployee)}` as Route}
            className="inline-flex items-center gap-1 rounded-lg border border-input bg-transparent px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/40"
          >
            Edit package
          </Link>
          <TerminalProcessButton runId={run.name} />
        </div>
      </header>

      {!snapshot ? (
        <Card className="p-6 text-sm text-muted-foreground">
          Terminal run has no target employee recorded. Delete this run and
          create a new one via <Link href={"/payroll/terminate" as Route} className="text-primary hover:underline">Terminate employee</Link>.
        </Card>
      ) : (
        <>
          <Card className="p-6">
            <div className="flex items-baseline gap-3">
              <h2 className="text-lg font-bold text-foreground">
                {snapshot.employee_name}
              </h2>
              <span className="text-xs text-muted-foreground">{snapshot.employee}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Package items captured for this run. Process applies the
              ZIMRA §14 exemption + writes the payslip.
            </p>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="border-b px-4 py-3 text-sm font-bold text-foreground">
              Package items ({snapshot.items.length})
            </div>
            {snapshot.items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No items captured. <Link href={`/payroll/terminate?employee=${encodeURIComponent(targetEmployee)}` as Route} className="text-primary hover:underline">Edit package</Link> to add lines.
              </div>
            ) : (
              <div className="divide-y">
                {snapshot.items.map((it, i) => {
                  const meta = CLASS_META[it.package_class] ?? CLASS_META.regular;
                  return (
                    <div
                      key={`${it.code}-${i}`}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "rounded px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide",
                              meta.chip,
                            )}
                          >
                            {meta.label}
                          </span>
                          <span className="text-xs text-muted-foreground">{meta.hint}</span>
                        </div>
                        <div className="mt-1 text-sm font-semibold text-foreground">
                          {it.code}
                        </div>
                      </div>
                      <div className="flex-none tabular-nums text-right font-semibold">
                        {usd(it.amount)}
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between border-t-2 bg-muted/20 px-4 py-3 font-bold">
                  <div>Total gross package</div>
                  <div className="tabular-nums">{usd(snapshot.totals.gross)}</div>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="mb-3 text-sm font-bold text-foreground">
              How this will process
            </h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>
                <strong>Retrenchment-eligible:</strong>{" "}
                <span className="tabular-nums text-foreground">{usd(snapshot.totals.package_eligible)}</span>
                {" "}— ZIMRA §14 exemption applies (floor + fraction + cap
                editable on the{" "}
                <Link href={"/payroll/setup/compliance" as Route} className="text-primary hover:underline">
                  ZIMRA compliance panel
                </Link>).
              </li>
              <li>
                <strong>Cash in lieu of leave:</strong>{" "}
                <span className="tabular-nums text-foreground">{usd(snapshot.totals.cash_in_lieu)}</span>
                {" "}— fully taxable, no §14.
              </li>
              <li>
                <strong>Relocation / passage:</strong>{" "}
                <span className="tabular-nums text-foreground">{usd(snapshot.totals.exempt_passage)}</span>
                {" "}— fully exempt, not taxed.
              </li>
              {snapshot.totals.regular > 0 ? (
                <li>
                  <strong>Other taxable:</strong>{" "}
                  <span className="tabular-nums text-foreground">{usd(snapshot.totals.regular)}</span>
                  {" "}— added to taxable base in full.
                </li>
              ) : null}
              <li className="mt-2">
                PAYE computed on <em>(package − §14 exempt) + cash-in-lieu +
                other taxable</em> using ZIMRA&apos;s independent monthly
                bands. AIDS Levy piggybacks on PAYE. NSSA and ZIMDEF are
                not levied on termination payments.
              </li>
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition, useEffect, useRef } from "react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { toast } from "@/components/ui/sonner";
import { DeltaTag } from "@/components/payroll/delta-tag";
import type { EmployeeForRun, PayrollClass, WizardEntry } from "@/lib/payroll-engine/payruns";
import {
  processPeriod,
  upsertWizardEntry,
  type WizardEntryPatch,
} from "@/app/(workspace)/payroll/payruns-actions";

type PrevSnapshot = {
  gross_usd: number;
  paye_usd: number;
  nssa_ee_usd: number;
  net_usd: number;
};

const CLASS_LABEL: Record<PayrollClass, { plural: string; singular: string }> = {
  SALARIED: { plural: "Salaried employees", singular: "salaried employee" },
  HOURLY: { plural: "Hourly employees", singular: "hourly employee" },
  CONTRACTOR: { plural: "Contractors", singular: "contractor" },
};

/**
 * Compute the projected gross for this row based on its class + wizard
 * entry. Salaried = basic + adjustment + captured earnings; hourly =
 * rate × hours + rate × 1.5 × OT (basic doesn't apply); contractor =
 * flat 1099 (no basic, no earnings — statutory bypassed at process).
 */
function projectedGrossUsd(e: EmployeeForRun): number {
  const w = e.wiz;
  if (e.payroll_class === "HOURLY") {
    const otMult = w.overtime_multiplier || 1.5;
    return w.hourly_rate_usd * w.hours_worked + w.hourly_rate_usd * otMult * w.overtime_hours;
  }
  if (e.payroll_class === "CONTRACTOR") {
    return w.contractor_flat_usd;
  }
  return e.basic_usd + w.salary_adjustment_usd + e.captured_earn_usd;
}

const usd = (n: number) =>
  `US$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const zig = (n: number) =>
  `ZiG ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function RunWizard({
  runId,
  runLabel,
  payDate,
  exchangeRate,
  employees,
  prevLabel,
  prevSnapshots,
  prevTotalNet,
}: {
  runId: string;
  runLabel: string;
  payDate: string;
  exchangeRate: number;
  employees: EmployeeForRun[];
  prevLabel: string | null;
  prevSnapshots: Record<string, PrevSnapshot>;
  prevTotalNet: number;
}) {
  const router = useRouter();

  // Local state — mirrors the server rows and lets inline edits stay
  // responsive without a round-trip per keystroke.
  const [rows, setRows] = useState<EmployeeForRun[]>(employees);
  const [approving, startApprove] = useTransition();

  // Classification buckets.
  const salaried = rows.filter((r) => r.payroll_class === "SALARIED");
  const hourly = rows.filter((r) => r.payroll_class === "HOURLY");
  const contractors = rows.filter((r) => r.payroll_class === "CONTRACTOR");
  const blocked = rows.filter((r) => r.missing.length > 0);

  const steps = useMemo(() => {
    const s: Array<{ id: string; title: string; count: number }> = [];
    if (blocked.length > 0) {
      s.push({ id: "missing", title: "Employees missing details", count: blocked.length });
    }
    s.push({ id: "salaried", title: CLASS_LABEL.SALARIED.plural, count: salaried.length });
    s.push({ id: "hourly", title: CLASS_LABEL.HOURLY.plural, count: hourly.length });
    s.push({ id: "contractors", title: CLASS_LABEL.CONTRACTOR.plural, count: contractors.length });
    s.push({ id: "preview", title: "Preview your payroll summary", count: rows.length });
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocked.length, salaried.length, hourly.length, contractors.length, rows.length]);

  const [stepIdx, setStepIdx] = useState(0);
  const step = steps[stepIdx]?.id ?? "preview";

  const patchRow = (emp: string, patch: Partial<EmployeeForRun>) =>
    setRows((rs) => rs.map((r) => (r.employee === emp ? { ...r, ...patch } : r)));

  async function approve() {
    startApprove(async () => {
      try {
        await processPeriod(runId);
        toast.success("Pay run processed.");
        router.push(`/payroll/${encodeURIComponent(runId)}` as Route);
      } catch (err) {
        const msg = (err as { message?: string })?.message ?? "Approve failed.";
        toast.error(msg);
      }
    });
  }

  return (
    <div className="flex min-h-full flex-col gap-0">
      {/* Wizard top bar */}
      <div className="flex items-center justify-between border-b bg-background px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">☰</span>
          <span className="font-bold text-foreground">
            {steps[stepIdx]?.title}
          </span>
        </div>
        <Link
          href={`/payroll/${encodeURIComponent(runId)}` as Route}
          className="text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          ⤓ Save and exit
        </Link>
      </div>

      {/* Step chips */}
      <div className="flex flex-wrap items-center gap-2 border-b bg-muted/20 px-6 py-2 text-xs">
        {steps.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStepIdx(i)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold transition",
              i === stepIdx
                ? "bg-primary text-primary-foreground"
                : i < stepIdx
                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                : "bg-background text-muted-foreground hover:bg-muted",
            )}
          >
            <span className="tabular-nums">{i + 1}</span>
            <span>{s.title}</span>
            {s.id !== "preview" && s.id !== "missing" ? (
              <span className="rounded-full bg-black/10 px-1.5 text-[10px]">{s.count}</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="flex-1 px-6 py-6">
        {/* Run meta header (hidden on missing + preview) */}
        {step !== "missing" && step !== "preview" && (
          <Card className="mb-6 p-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <Meta label="Pay run" value={runLabel} />
              <Meta label="Pay date" value={fmtDate(payDate)} />
              <Meta
                label="Exchange rate"
                value={`US$1 = ZiG ${exchangeRate.toFixed(2)}`}
              />
            </div>
          </Card>
        )}

        {step === "missing" && <MissingStep blocked={blocked} runId={runId} />}

        {step === "salaried" && (
          <ClassStep
            cls="SALARIED"
            runId={runId}
            rows={salaried}
            prevSnapshots={prevSnapshots}
            prevLabel={prevLabel}
            onPatch={patchRow}
          />
        )}

        {step === "hourly" && (
          <ClassStep
            cls="HOURLY"
            runId={runId}
            rows={hourly}
            prevSnapshots={prevSnapshots}
            prevLabel={prevLabel}
            onPatch={patchRow}
          />
        )}

        {step === "contractors" && (
          <ClassStep
            cls="CONTRACTOR"
            runId={runId}
            rows={contractors}
            prevSnapshots={prevSnapshots}
            prevLabel={prevLabel}
            onPatch={patchRow}
          />
        )}

        {step === "preview" && (
          <PreviewStep
            rows={rows}
            blocked={blocked}
            payDate={payDate}
            prevSnapshots={prevSnapshots}
            prevLabel={prevLabel}
            prevTotalNet={prevTotalNet}
          />
        )}
      </div>

      {/* Footer nav */}
      <div className="sticky bottom-0 flex items-center justify-between border-t bg-background px-6 py-3">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-muted disabled:opacity-40"
          disabled={stepIdx === 0}
          onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
        >
          ‹ Back
        </button>

        {step === "preview" ? (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            disabled={approving}
            onClick={approve}
          >
            {approving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Approving…
              </>
            ) : (
              <>Approve &amp; process payroll</>
            )}
          </button>
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            onClick={() => setStepIdx((i) => Math.min(steps.length - 1, i + 1))}
          >
            Next: {steps[stepIdx + 1]?.title ?? "Preview"} ›
          </button>
        )}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-semibold text-foreground">{value}</div>
    </div>
  );
}

// ── Step: Missing details ────────────────────────────────────────

function MissingStep({ blocked, runId }: { blocked: EmployeeForRun[]; runId: string }) {
  return (
    <Card className="p-6">
      <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
        These employees will <strong>not be included</strong> in this pay run
        until their missing information is provided. Fix each profile — you can
        come back to the wizard here after saving.
      </p>
      <div className="mb-2 text-sm font-semibold text-foreground">
        Showing {blocked.length} of {blocked.length}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-3">Employee</TableHead>
            <TableHead className="px-3">Missing</TableHead>
            <TableHead className="px-3 text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {blocked.map((r) => (
            <TableRow key={r.employee}>
              <TableCell className="px-3">
                <div className="font-semibold">{r.employee_name}</div>
                <div className="text-xs text-muted-foreground">
                  {r.employee}
                  {r.job_title ? ` · ${r.job_title}` : ""}
                </div>
              </TableCell>
              <TableCell className="px-3">
                <span className="text-rose-600">
                  ● Missing {r.missing.length} critical detail{r.missing.length === 1 ? "" : "s"}
                </span>
                <div className="text-xs text-muted-foreground">{r.missing.join(", ")}</div>
              </TableCell>
              <TableCell className="px-3 text-right">
                <Link
                  href={
                    `/employee/${encodeURIComponent(r.employee)}/edit?from=payroll-wizard&run=${encodeURIComponent(runId)}&fix=${r.missing_fieldnames.join(",")}` as Route
                  }
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Fix profile →
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

// ── Step: per-class editable table ───────────────────────────────

function ClassStep({
  cls,
  runId,
  rows,
  prevSnapshots,
  prevLabel,
  onPatch,
}: {
  cls: PayrollClass;
  runId: string;
  rows: EmployeeForRun[];
  prevSnapshots: Record<string, PrevSnapshot>;
  prevLabel: string | null;
  onPatch: (emp: string, patch: Partial<EmployeeForRun>) => void;
}) {
  const [filter, setFilter] = useState("");

  const visible = filter
    ? rows.filter((r) =>
        r.employee_name.toLowerCase().includes(filter.toLowerCase()) ||
        r.employee.toLowerCase().includes(filter.toLowerCase()),
      )
    : rows;

  const totalProjectedGross = visible.reduce((a, e) => a + projectedGrossUsd(e), 0);
  const totalPrevGross = visible.reduce(
    (a, e) => a + (prevSnapshots[e.employee]?.gross_usd ?? 0),
    0,
  );

  if (rows.length === 0) {
    return (
      <Card className="p-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-2xl">
          {cls === "SALARIED" ? "👔" : cls === "HOURLY" ? "⏱" : "📄"}
        </div>
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          No {CLASS_LABEL[cls].plural.toLowerCase()} on this run
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Assign the <strong>Payroll class</strong> field on an employee&apos;s
          profile to <strong>{cls}</strong> and they&apos;ll show up here on the
          next pay run.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            placeholder="Employee name"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-56 rounded-lg border px-3 py-1.5 text-sm"
          />
          <span className="text-xs text-muted-foreground">
            Showing {visible.length} of {rows.length}
          </span>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-4">Employee</TableHead>
            {cls === "SALARIED" && (
              <>
                <TableHead className="px-4 text-right">Basic</TableHead>
                <TableHead className="px-4 text-right w-40">Adjustment (USD)</TableHead>
              </>
            )}
            {cls === "HOURLY" && (
              <>
                <TableHead className="px-4 text-right w-32">Rate (USD/hr)</TableHead>
                <TableHead className="px-4 text-right w-24">Hours</TableHead>
                <TableHead className="px-4 text-right w-24">OT hrs</TableHead>
                <TableHead
                  className="px-4 text-right w-24"
                  title="Overtime multiplier — Zim weekday default 1.5×, weekends / public holidays commonly 2×. Editable per row."
                >
                  OT ×
                </TableHead>
              </>
            )}
            {cls === "CONTRACTOR" && (
              <TableHead className="px-4 text-right w-40">1099 payment (USD)</TableHead>
            )}
            <TableHead className="px-4 text-right">Projected gross</TableHead>
            <TableHead className="px-4 text-right">
              Previous
              {prevLabel && (
                <div className="text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
                  {prevLabel}
                </div>
              )}
            </TableHead>
            <TableHead className="px-4 text-right">Δ vs prev</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((r) => {
            const prev = prevSnapshots[r.employee];
            const projGross = projectedGrossUsd(r);
            const isMissing = r.missing.length > 0;
            const patchWiz = (patch: WizardEntryPatch, wizPatch: Partial<WizardEntry>) => {
              onPatch(r.employee, {
                wiz: { ...r.wiz, ...wizPatch },
              });
              // Fire the server upsert; failure toast is inside NumCell.
              void upsertWizardEntry(runId, r.employee, patch);
            };
            return (
              <TableRow
                key={r.employee}
                className={cn(isMissing ? "bg-rose-50/40" : undefined)}
              >
                <TableCell className="px-4 align-middle">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                      {initials(r.employee_name)}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">
                        {r.employee_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.employee}
                        {r.job_title ? ` · ${r.job_title}` : ""}
                      </div>
                      {isMissing && (
                        <div className="mt-0.5 text-[10px] font-semibold uppercase text-rose-600">
                          ⚠ Missing {r.missing.join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>

                {cls === "SALARIED" && (
                  <>
                    <TableCell className="px-4 align-middle text-right">
                      {r.basic_usd ? usd(r.basic_usd) : <span className="text-muted-foreground">—</span>}
                      {r.basic_zig ? (
                        <div className="text-xs text-muted-foreground">{zig(r.basic_zig)}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="px-4 align-middle text-right">
                      <NumCell
                        value={r.wiz.salary_adjustment_usd}
                        disabled={isMissing}
                        onCommit={(v) =>
                          patchWiz({ salary_adjustment_usd: v }, { salary_adjustment_usd: v })
                        }
                      />
                    </TableCell>
                  </>
                )}

                {cls === "HOURLY" && (
                  <>
                    <TableCell className="px-4 align-middle text-right">
                      <NumCell
                        value={r.wiz.hourly_rate_usd}
                        disabled={isMissing}
                        step="0.01"
                        onCommit={(v) =>
                          patchWiz({ hourly_rate_usd: v }, { hourly_rate_usd: v })
                        }
                      />
                    </TableCell>
                    <TableCell className="px-4 align-middle text-right">
                      <NumCell
                        value={r.wiz.hours_worked}
                        disabled={isMissing}
                        step="0.25"
                        onCommit={(v) =>
                          patchWiz({ hours_worked: v }, { hours_worked: v })
                        }
                      />
                    </TableCell>
                    <TableCell className="px-4 align-middle text-right">
                      <NumCell
                        value={r.wiz.overtime_hours}
                        disabled={isMissing}
                        step="0.25"
                        onCommit={(v) =>
                          patchWiz({ overtime_hours: v }, { overtime_hours: v })
                        }
                      />
                    </TableCell>
                    <TableCell className="px-4 align-middle text-right">
                      <NumCell
                        value={r.wiz.overtime_multiplier || 1.5}
                        disabled={isMissing}
                        step="0.1"
                        onCommit={(v) =>
                          patchWiz(
                            { overtime_multiplier: v },
                            { overtime_multiplier: v },
                          )
                        }
                      />
                    </TableCell>
                  </>
                )}

                {cls === "CONTRACTOR" && (
                  <TableCell className="px-4 align-middle text-right">
                    <NumCell
                      value={r.wiz.contractor_flat_usd}
                      disabled={isMissing}
                      onCommit={(v) =>
                        patchWiz({ contractor_flat_usd: v }, { contractor_flat_usd: v })
                      }
                    />
                  </TableCell>
                )}

                <TableCell className="px-4 align-middle text-right">
                  <span className="font-semibold text-foreground">{usd(projGross)}</span>
                  {r.captured_deduct_usd ? (
                    <div className="text-[10px] text-rose-600">
                      less {usd(r.captured_deduct_usd)}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className="px-4 align-middle text-right text-muted-foreground">
                  {prev ? (
                    <>
                      <div>{usd(prev.gross_usd)}</div>
                      <div className="text-[10px]">gross · {usd(prev.net_usd)} net</div>
                    </>
                  ) : (
                    <span className="text-xs">—</span>
                  )}
                </TableCell>
                <TableCell className="px-4 align-middle text-right">
                  {prev?.gross_usd ? (
                    <DeltaTag
                      current={projGross}
                      previous={prev.gross_usd}
                      fmt={usd}
                      withPercent
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow className="border-t-2 bg-muted/30 font-bold">
            <TableCell className="px-4">Totals</TableCell>
            {cls === "SALARIED" && (
              <>
                <TableCell className="px-4 text-right">
                  {usd(visible.reduce((a, e) => a + e.basic_usd, 0))}
                </TableCell>
                <TableCell className="px-4 text-right">
                  {(() => {
                    const t = visible.reduce((a, e) => a + e.wiz.salary_adjustment_usd, 0);
                    return t ? usd(t) : "—";
                  })()}
                </TableCell>
              </>
            )}
            {cls === "HOURLY" && (
              <>
                <TableCell className="px-4 text-right text-muted-foreground text-xs">
                  —
                </TableCell>
                <TableCell className="px-4 text-right">
                  {visible.reduce((a, e) => a + e.wiz.hours_worked, 0).toFixed(2)}
                </TableCell>
                <TableCell className="px-4 text-right">
                  {visible.reduce((a, e) => a + e.wiz.overtime_hours, 0).toFixed(2)}
                </TableCell>
                <TableCell className="px-4 text-right text-muted-foreground text-xs">
                  {/* Multipliers don't sum meaningfully — leave blank */}
                  —
                </TableCell>
              </>
            )}
            {cls === "CONTRACTOR" && (
              <TableCell className="px-4 text-right">
                {(() => {
                  const t = visible.reduce((a, e) => a + e.wiz.contractor_flat_usd, 0);
                  return t ? usd(t) : "—";
                })()}
              </TableCell>
            )}
            <TableCell className="px-4 text-right text-emerald-700">
              {usd(totalProjectedGross)}
            </TableCell>
            <TableCell className="px-4 text-right">
              {totalPrevGross ? usd(totalPrevGross) : "—"}
            </TableCell>
            <TableCell className="px-4 text-right">
              {totalPrevGross ? (
                <DeltaTag
                  current={totalProjectedGross}
                  previous={totalPrevGross}
                  fmt={usd}
                  withPercent
                />
              ) : (
                "—"
              )}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </Card>
  );
}

// ── Editable number cell (single generic input) ──────────────────

/**
 * Local-only number input that commits on blur / Enter. It doesn't
 * touch the server itself — the parent's `onCommit` is called with
 * the parsed value and is expected to (1) patch local row state so
 * projected gross re-renders and (2) fire the server upsert. The
 * cell shows a spinner while the parent's promise (if returned) is
 * outstanding.
 */
function NumCell({
  value,
  disabled,
  step = "0.01",
  onCommit,
}: {
  value: number;
  disabled?: boolean;
  step?: string;
  onCommit: (v: number) => void | Promise<void>;
}) {
  const [local, setLocal] = useState<string>(value ? String(value) : "");
  const [pending, setPending] = useState(false);
  const lastCommittedRef = useRef<number>(value);

  useEffect(() => {
    setLocal(value ? String(value) : "");
    lastCommittedRef.current = value;
  }, [value]);

  async function commit() {
    const parsed = parseFloat(local || "0") || 0;
    if (parsed === lastCommittedRef.current) return;
    const old = lastCommittedRef.current;
    setPending(true);
    try {
      await onCommit(parsed);
      lastCommittedRef.current = parsed;
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? "Save failed.";
      toast.error(msg);
      setLocal(old ? String(old) : "");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-1">
      <input
        type="number"
        step={step}
        disabled={disabled || pending}
        value={local}
        placeholder="0"
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="w-24 rounded-md border px-2 py-1 text-right text-sm disabled:bg-muted disabled:text-muted-foreground"
      />
      {pending ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : null}
    </div>
  );
}

// ── Step: Preview ────────────────────────────────────────────────

function PreviewStep({
  rows,
  blocked,
  payDate,
  prevSnapshots,
  prevLabel,
  prevTotalNet,
}: {
  rows: EmployeeForRun[];
  blocked: EmployeeForRun[];
  payDate: string;
  prevSnapshots: Record<string, PrevSnapshot>;
  prevLabel: string | null;
  prevTotalNet: number;
}) {
  const payable = rows.filter((r) => r.missing.length === 0);

  // Client-side projected numbers. PAYE/NSSA/AIDS are computed
  // authoritatively at Approve time; here we just show the pre-tax
  // projected gross and captured deductions so HR gets a real-shape
  // preview.
  const totalGross = payable.reduce((s, r) => s + projectedGrossUsd(r), 0);
  const totalDeduct = payable.reduce(
    // Contractors don't pay statutory — only USD deductions apply.
    // Salaried/Hourly deductions all count.
    (s, r) => s + r.captured_deduct_usd,
    0,
  );
  const prevTotalGross = payable.reduce(
    (s, r) => s + (prevSnapshots[r.employee]?.gross_usd ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Debit summary */}
      <Card className="p-6">
        <h3 className="mb-4 font-bold text-foreground">Debit Summary</h3>
        <dl className="space-y-2 text-sm">
          <Line label="Total projected gross" value={usd(totalGross)} bold />
          <Line label="Captured deductions" value={usd(totalDeduct)} muted />
          <Line
            label="Statutory (PAYE / AIDS Levy / NSSA / ZIMDEF)"
            value="Computed on Approve"
            muted
          />
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          Actual net (after all statutory deductions) is computed
          authoritatively by the payroll engine when you Approve. The final
          Debit Summary — with true net-vs-previous-net deltas — appears on
          the run detail page.
        </p>
      </Card>

      {/* Missing info warning */}
      {blocked.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-amber-900">
                These people have missing info · {blocked.length} of {rows.length}
              </div>
              <p className="text-sm text-amber-800">
                Warning only — you can still Approve; these employees will not
                be paid on this run until fixed.
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {blocked.map((b) => (
              <Link
                key={b.employee}
                href={
                  `/employee/${encodeURIComponent(b.employee)}/edit?from=payroll&fix=${b.missing.join(",")}` as Route
                }
                className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                ⚠ {b.employee_name} · {b.missing.length} missing
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Payroll changes vs last run */}
      <Card className="overflow-x-auto p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold text-foreground">
            Payroll changes · {payable.length} employees
          </span>
          {prevLabel ? (
            <span className="rounded-md border px-3 py-1 text-xs text-muted-foreground">
              Compared to {prevLabel}
            </span>
          ) : (
            <span className="rounded-md border px-3 py-1 text-xs text-muted-foreground">
              No previous run to compare
            </span>
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4">Employee</TableHead>
              <TableHead className="px-4 text-right">Projected gross</TableHead>
              <TableHead className="px-4 text-right">Captured deductions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payable.map((r) => {
              const gross = projectedGrossUsd(r);
              const prev = prevSnapshots[r.employee];
              return (
                <TableRow key={r.employee}>
                  <TableCell className="px-4 align-middle">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {r.employee_name}
                      </span>
                      <span
                        className={cn(
                          "rounded px-1.5 py-px text-[9px] font-bold uppercase tracking-wide",
                          r.payroll_class === "SALARIED"
                            ? "bg-primary/10 text-primary"
                            : r.payroll_class === "HOURLY"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-purple-100 text-purple-700",
                        )}
                      >
                        {r.payroll_class}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {r.employee}
                      {r.job_title ? ` · ${r.job_title}` : ""}
                    </div>
                  </TableCell>
                  <DeltaCell current={gross} previous={prev?.gross_usd} />
                  <TableCell className="px-4 align-middle text-right text-rose-600">
                    {r.captured_deduct_usd ? usd(r.captured_deduct_usd) : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          {payable.length > 0 && (
            <TableFooter>
              <TableRow className="border-t-2 bg-muted/30 font-bold">
                <TableCell className="px-4">Totals</TableCell>
                <TableCell className="px-4 text-right">
                  <div>{usd(totalGross)}</div>
                  {prevLabel && prevTotalGross ? (
                    <div className="text-[11px] font-normal">
                      <DeltaTag
                        current={totalGross}
                        previous={prevTotalGross}
                        fmt={usd}
                        withPercent
                      />
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className="px-4 text-right text-rose-600">
                  {totalDeduct ? usd(totalDeduct) : "—"}
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
        <p className="border-t px-4 py-2 text-[11px] text-muted-foreground">
          Actual net (after PAYE, AIDS Levy, NSSA, ZIMDEF, pension, NEC dues,
          medical aid) is computed by the payroll engine at Approve. It appears
          on the run detail page with a true net-vs-previous-net delta.
        </p>
      </Card>
    </div>
  );
}

function DeltaCell({
  current,
  previous,
  bold,
}: {
  current: number;
  previous?: number;
  bold?: boolean;
}) {
  return (
    <TableCell className="px-4 align-middle text-right">
      <div className={bold ? "font-bold" : ""}>{usd(current)}</div>
      {previous ? (
        <div className="text-[11px]">
          <DeltaTag current={current} previous={previous} fmt={usd} withPercent />
        </div>
      ) : null}
    </TableCell>
  );
}

function Line({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className={bold ? "font-bold text-foreground" : "text-muted-foreground"}>
        {label}
      </dt>
      <dd
        className={cn(
          bold
            ? "text-lg font-extrabold text-foreground"
            : muted
            ? "text-emerald-700"
            : "font-semibold text-foreground",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

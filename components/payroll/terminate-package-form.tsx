"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Loader2,
  Plus,
  Trash2,
  UserMinus,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { toast } from "@/components/ui/sonner";
import {
  createTerminalRun,
  previewTerminalPackage,
  type TerminalItem,
  type TerminalPreview,
} from "@/app/(workspace)/payroll/payruns-actions";

type EmployeePick = { id: string; name: string };

type PackageClass = TerminalItem["package_class"];

type PackageCode = { code: string; package_class: PackageClass };

const CLASS_META: Record<
  PackageClass,
  { label: string; hint: string; chip: string; fallbackCode: string }
> = {
  retrenchment_eligible: {
    label: "Retrenchment package",
    hint: "Loss-of-employment comp, notice pay. §14 exemption applies.",
    chip: "bg-emerald-100 text-emerald-700",
    fallbackCode: "RETRENCH_COMP",
  },
  cash_in_lieu: {
    label: "Cash in lieu of leave",
    hint: "Accrued leave paid out. Fully taxable — no §14.",
    chip: "bg-amber-100 text-amber-700",
    fallbackCode: "LEAVE_PAYOUT",
  },
  exempt_passage: {
    label: "Relocation / passage",
    hint: "Fully exempt per ZIMRA.",
    chip: "bg-blue-100 text-blue-700",
    fallbackCode: "RELOCATION",
  },
  regular: {
    label: "Other taxable earning",
    hint: "Rarely used on terminal runs. Fully taxable.",
    chip: "bg-slate-100 text-slate-700",
    fallbackCode: "OTHER_PAY",
  },
};

const usd = (n: number) =>
  `US$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

let rowIdSeed = 0;
const nextRowId = () => `row-${++rowIdSeed}`;

type Row = TerminalItem & { rid: string };

/** First code for the given class, or the fallback constant if the
 *  operator hasn't classified any yet. Used when adding a new row
 *  or switching a row's class — Code shouldn't be a free-text field
 *  since the engine keys off package_class from the code record. */
function firstCodeForClass(
  cls: PackageClass,
  codes: PackageCode[],
): string {
  const match = codes.find((c) => c.package_class === cls);
  return match?.code ?? CLASS_META[cls].fallbackCode;
}

const defaultRow = (cls: PackageClass, codes: PackageCode[]): Row => ({
  rid: nextRowId(),
  code: firstCodeForClass(cls, codes),
  amount: 0,
  package_class: cls,
});

export function TerminatePackageForm({
  employees,
  initialEmployee,
  codes,
  thresholds,
}: {
  employees: EmployeePick[];
  initialEmployee: string;
  codes: PackageCode[];
  /** Current ZIMRA §14 knobs from Company Payroll Settings.
   *  Subtitle interpolates these so HR sees the tenant's live
   *  values (not statutory defaults) — matches what the engine
   *  will actually apply at process time. */
  thresholds: { floor: number; cap: number; fraction: number };
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [employee, setEmployee] = useState<string>(initialEmployee);
  const [payDate, setPayDate] = useState<string>(today);
  const [notes, setNotes] = useState<string>("");
  // Group codes by class once for O(1) lookups when rendering
  // each row's Code dropdown.
  const codesByClass = useMemo(() => {
    const map: Record<PackageClass, string[]> = {
      retrenchment_eligible: [],
      cash_in_lieu: [],
      exempt_passage: [],
      regular: [],
    };
    for (const c of codes) map[c.package_class].push(c.code);
    return map;
  }, [codes]);

  const [rows, setRows] = useState<Row[]>(() => {
    // Seed with the first code of retrenchment_eligible (usually
    // RETRENCH_COMP + NOTICE_PAY) + one cash-in-lieu line.
    const retrenchCodes = codes.filter((c) => c.package_class === "retrenchment_eligible");
    const initial: Row[] = [];
    for (const c of retrenchCodes.slice(0, 2)) {
      initial.push({
        rid: nextRowId(),
        code: c.code,
        amount: 0,
        package_class: "retrenchment_eligible",
      });
    }
    if (initial.length === 0) initial.push(defaultRow("retrenchment_eligible", codes));
    initial.push(defaultRow("cash_in_lieu", codes));
    return initial;
  });
  const [preview, setPreview] = useState<TerminalPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [creating, startCreate] = useTransition();

  // Live §14 preview — debounce refetches by 200ms so typing doesn't
  // hammer the endpoint.
  const items = useMemo<TerminalItem[]>(
    () => rows.map((r) => ({
      code: r.code,
      amount: r.amount || 0,
      package_class: r.package_class,
    })),
    [rows],
  );
  useEffect(() => {
    const timer = setTimeout(async () => {
      const anyAmount = items.some((i) => i.amount > 0);
      if (!anyAmount) {
        setPreview(null);
        return;
      }
      setPreviewing(true);
      try {
        const p = await previewTerminalPackage(items);
        setPreview(p);
      } catch (err) {
        toast.error(
          (err as { message?: string })?.message ?? "Preview failed.",
        );
      } finally {
        setPreviewing(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [items]);

  const empName = employees.find((e) => e.id === employee)?.name ?? "";

  function addRow(cls: PackageClass) {
    setRows((rs) => [...rs, defaultRow(cls, codes)]);
  }
  function updateRow(rid: string, patch: Partial<Row>) {
    setRows((rs) =>
      rs.map((r) => {
        if (r.rid !== rid) return r;
        const next = { ...r, ...patch };
        // Snap the Code back to a valid one for the new class when
        // the class changes — a "Relocation / passage" row can't
        // legitimately carry NOTICE_PAY (which is retrenchment_eligible).
        if (patch.package_class && patch.package_class !== r.package_class) {
          const valid = codesByClass[patch.package_class];
          if (!valid.includes(next.code)) {
            next.code = firstCodeForClass(patch.package_class, codes);
          }
        }
        return next;
      }),
    );
  }
  function removeRow(rid: string) {
    setRows((rs) => rs.filter((r) => r.rid !== rid));
  }

  async function submit() {
    if (!employee) {
      toast.error("Pick an employee first.");
      return;
    }
    const valid = items.filter((i) => i.amount > 0 && i.code.trim());
    if (valid.length === 0) {
      toast.error("Add at least one line with an amount.");
      return;
    }
    startCreate(async () => {
      try {
        const res = await createTerminalRun(employee, valid, payDate, notes || undefined);
        toast.success(`Created ${res.period_label}. Redirecting…`);
        router.push(`/payroll/${encodeURIComponent(res.payroll_run)}` as Route);
      } catch (err) {
        toast.error((err as { message?: string })?.message ?? "Create failed.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/payroll" as Route}
        className="w-fit inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to Payroll
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <UserMinus className="h-3.5 w-3.5" />
            Payroll · Terminate employee
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">
            Termination Package
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Itemize the retrenchment / final payout below. ZIMRA §14 exempts a
            portion of the retrenchment package — currently{" "}
            <strong>{(thresholds.fraction * 100).toFixed(2)}%</strong> of the
            package, floor <strong>{usd(thresholds.floor)}</strong>, cap{" "}
            <strong>{usd(thresholds.cap)}</strong>. Change these on the{" "}
            <Link
              href={"/payroll/setup/compliance" as Route}
              className="font-semibold text-primary hover:underline"
            >
              ZIMRA compliance panel
            </Link>
            . Live preview updates as you type.
          </p>
        </div>
      </header>

      <Card className="p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Employee</span>
            <select
              value={employee}
              onChange={(e) => setEmployee(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">— select —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Pay date</span>
            <input
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Notes (optional)</span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Retrenchment approved by MD 12 Sep 2026"
              className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            />
          </label>
        </div>
      </Card>

      {/* Item table */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-bold text-foreground">Package items</h2>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CLASS_META) as PackageClass[]).map((cls) => (
              <button
                key={cls}
                type="button"
                onClick={() => addRow(cls)}
                className="inline-flex items-center gap-1 rounded-md border border-input bg-transparent px-2 py-1 text-xs font-semibold text-foreground transition hover:bg-muted/40"
              >
                <Plus className="h-3 w-3" />
                {CLASS_META[cls].label}
              </button>
            ))}
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4">Class</TableHead>
              <TableHead className="px-4">Code</TableHead>
              <TableHead className="px-4 text-right">Amount (USD)</TableHead>
              <TableHead className="px-4 text-right w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  No items yet — add one using the buttons above.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.rid}>
                  <TableCell className="px-4 align-middle">
                    <select
                      value={r.package_class}
                      onChange={(e) =>
                        updateRow(r.rid, {
                          package_class: e.target.value as PackageClass,
                        })
                      }
                      className={cn(
                        "rounded px-2 py-1 text-[11px] font-semibold uppercase tracking-wide",
                        CLASS_META[r.package_class].chip,
                      )}
                    >
                      {(Object.keys(CLASS_META) as PackageClass[]).map((c) => (
                        <option key={c} value={c}>
                          {CLASS_META[c].label}
                        </option>
                      ))}
                    </select>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      {CLASS_META[r.package_class].hint}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 align-middle">
                    {(() => {
                      const validCodes = codesByClass[r.package_class];
                      if (validCodes.length === 0) {
                        // Fallback: no coded codes for this class,
                        // let HR type one. This only happens on a
                        // fresh site pre-seed.
                        return (
                          <input
                            value={r.code}
                            onChange={(e) =>
                              updateRow(r.rid, { code: e.target.value.toUpperCase() })
                            }
                            className="w-40 rounded-md border px-2 py-1 text-sm uppercase"
                            placeholder="CODE"
                          />
                        );
                      }
                      return (
                        <select
                          value={r.code}
                          onChange={(e) => updateRow(r.rid, { code: e.target.value })}
                          className="w-40 rounded-md border bg-white px-2 py-1 text-sm"
                        >
                          {validCodes.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="px-4 align-middle text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={r.amount || ""}
                      onChange={(e) =>
                        updateRow(r.rid, { amount: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="0.00"
                      className="w-32 rounded-md border px-2 py-1 text-right text-sm"
                    />
                  </TableCell>
                  <TableCell className="px-4 align-middle text-right">
                    <button
                      type="button"
                      onClick={() => removeRow(r.rid)}
                      className="rounded p-1 text-rose-600 hover:bg-rose-50"
                      title="Remove line"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {rows.length > 0 && preview && (
            <TableFooter>
              <TableRow className="border-t-2 bg-muted/30 font-bold">
                <TableCell className="px-4">Totals</TableCell>
                <TableCell className="px-4 text-xs font-normal text-muted-foreground">
                  gross of {rows.length} line{rows.length === 1 ? "" : "s"}
                </TableCell>
                <TableCell className="px-4 text-right">{usd(preview.gross)}</TableCell>
                <TableCell className="px-4" />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </Card>

      {/* Live §14 preview */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">
            ZIMRA §14 preview
          </h2>
          {previewing ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              recomputing…
            </span>
          ) : null}
        </div>
        {preview ? (
          <>
            <dl className="mt-4 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
              <Row label="Retrenchment-eligible package" v={usd(preview.package_eligible)} />
              <Row label="Cash in lieu of leave" v={usd(preview.cash_in_lieu)} />
              <Row label="Exempt passage / relocation" v={usd(preview.exempt_passage)} muted />
              <Row
                label={`§14 exempt (max of ${(preview.fraction * 100).toFixed(1)}% × package or ${usd(preview.floor)}, capped at ${usd(preview.cap)})`}
                v={`− ${usd(preview.exempt)}`}
                muted
              />
              <div className="border-t pt-2 md:col-span-2">
                <Row label="Taxable base (feeds PAYE)" v={usd(preview.taxable_base)} bold />
                <Row label="Total gross package" v={usd(preview.gross)} bold />
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              PAYE is computed on the taxable base using ZIMRA's independent
              monthly bands (no FDS cumulative — retrenchment is a one-off).
              AIDS Levy applies to PAYE. NSSA and ZIMDEF are not levied on
              termination payments.
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Add amounts above to see the §14 breakdown.
          </p>
        )}
      </Card>

      {/* Footer actions */}
      <div className="sticky bottom-0 flex items-center justify-between rounded-lg border bg-background px-6 py-3">
        <p className="text-xs text-muted-foreground">
          Approve creates a TERMINAL off-cycle Payroll Run targeted at{" "}
          <strong>{empName || "the selected employee"}</strong>. Click Process
          on that run to compute PAYE + write the payslip.
        </p>
        <button
          type="button"
          onClick={submit}
          disabled={creating || !employee || rows.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          {creating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating…
            </>
          ) : (
            <>Create terminal run →</>
          )}
        </button>
      </div>
    </div>
  );
}

function Row({
  label, v, bold, muted,
}: {
  label: string;
  v: string;
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
            ? "text-base font-extrabold text-foreground"
            : muted
            ? "text-emerald-700"
            : "font-semibold text-foreground",
        )}
      >
        {v}
      </dd>
    </div>
  );
}

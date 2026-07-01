"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/sonner";
import { saveNecSchedule } from "@/app/(workspace)/payroll/setup/actions";
import type { NecScheduleRow } from "@/lib/payroll-engine/setup";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";

const num = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Per-industry grade-schedule editor.
 *
 * Every Payroll Pay Grade is listed. For each, the admin fills in the
 * NEC-published salary for THIS industry. Empty rows (both 0) are
 * skipped server-side — the salary resolver falls back to Payroll Pay
 * Grade.salary_usd/zig ("flat" columns shown in muted text for
 * reference).
 *
 * Above-NEC grades are still rendered so a Custom-Ladder tenant can
 * fill them in if they want, but they get an "Above NEC" badge so the
 * admin knows editing salary here doesn't lock the employee on the
 * edit form (that's driven by is_nec_grade).
 */
export function NecScheduleEditor({
  industry,
  gradingSystem,
  rows: initialRows,
}: {
  industry: string;
  gradingSystem: string | null;
  rows: NecScheduleRow[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<NecScheduleRow[]>(initialRows);
  const [pending, startTransition] = useTransition();

  function updateRow(idx: number, patch: Partial<NecScheduleRow>) {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  function submit() {
    const payload = rows.map((r) => ({
      code: r.code,
      salary_usd: r.salary_usd,
      salary_zig: r.salary_zig,
    }));
    startTransition(async () => {
      try {
        const r = await saveNecSchedule(industry, payload);
        toast.success(
          `Saved ${r.saved} grade${r.saved === 1 ? "" : "s"} for ${industry}. ` +
            "Employees on this industry will pick up the new salaries on next save.",
        );
        router.refresh();
      } catch (err) {
        toast.error(
          (err as { message?: string })?.message ??
            "Couldn't save the schedule.",
        );
      }
    });
  }

  const necCount = rows.filter((r) => r.is_nec_grade).length;
  const filledCount = rows.filter((r) => r.salary_usd || r.salary_zig).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/20 px-4 py-3 text-sm">
        <span>
          <span className="font-semibold text-foreground">Grading system:</span>{" "}
          {gradingSystem ?? <span className="text-muted-foreground">none</span>}
        </span>
        <span className="text-muted-foreground">·</span>
        <span>
          <span className="font-semibold text-foreground">Inside NEC:</span>{" "}
          {necCount} of {rows.length} grades
        </span>
        <span className="text-muted-foreground">·</span>
        <span>
          <span className="font-semibold text-foreground">Filled:</span>{" "}
          {filledCount} of {rows.length}
        </span>
      </div>

      <Card className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-5">Code</TableHead>
              <TableHead className="px-5">Name</TableHead>
              <TableHead className="px-5">Status</TableHead>
              <TableHead className="px-5 text-right">
                Flat USD (fallback)
              </TableHead>
              <TableHead className="px-5 text-right">
                Flat ZiG (fallback)
              </TableHead>
              <TableHead className="px-5 text-right">
                Industry USD
              </TableHead>
              <TableHead className="px-5 text-right">
                Industry ZiG
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No pay grades yet — load a grading system in Setup → Pay grades first.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r, i) => (
                <TableRow key={r.code} className={r.is_nec_grade ? undefined : "bg-muted/20"}>
                  <TableCell className="px-5 align-middle font-mono font-semibold">
                    {r.code}
                  </TableCell>
                  <TableCell className="px-5 align-middle text-muted-foreground">
                    {r.grade_name ?? "—"}
                  </TableCell>
                  <TableCell className="px-5 align-middle">
                    {r.is_nec_grade ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        Inside NEC
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        Above NEC
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-5 align-middle text-right text-muted-foreground">
                    {r.flat_usd ? num(r.flat_usd) : "—"}
                  </TableCell>
                  <TableCell className="px-5 align-middle text-right text-muted-foreground">
                    {r.flat_zig ? num(r.flat_zig) : "—"}
                  </TableCell>
                  <TableCell className="px-5 align-middle text-right">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min={0}
                      value={r.salary_usd || ""}
                      onChange={(e) =>
                        updateRow(i, { salary_usd: Number(e.target.value) || 0 })
                      }
                      className="h-9 w-28 rounded-md border border-input bg-transparent px-2 text-right text-sm"
                    />
                  </TableCell>
                  <TableCell className="px-5 align-middle text-right">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min={0}
                      value={r.salary_zig || ""}
                      onChange={(e) =>
                        updateRow(i, { salary_zig: Number(e.target.value) || 0 })
                      }
                      className="h-9 w-28 rounded-md border border-input bg-transparent px-2 text-right text-sm"
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        <span>
          Leave USD and ZiG both at 0 for grades this NEC doesn&apos;t publish —
          the resolver falls back to the flat grade salary.
        </span>
        <button
          type="button"
          onClick={submit}
          disabled={pending || rows.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save schedule"}
        </button>
      </div>
    </div>
  );
}

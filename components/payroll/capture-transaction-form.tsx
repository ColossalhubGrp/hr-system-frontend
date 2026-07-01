"use client";

import { useState, useTransition } from "react";
import { toast } from "@/components/ui/sonner";
import { addTransaction } from "@/app/(workspace)/payroll/transactions/actions";

export interface CodePick {
  code: string;
  kind: "EARNING" | "DEDUCTION";
  default_currency: string;
  taxable: boolean | 0 | 1;
}

/**
 * Capture-transaction modal.
 *
 *   - When `fixedEmployee` is passed (e.g. the pay-run detail page's
 *     per-row trigger), the employee picker collapses to a read-only
 *     label + hidden field — no dropdown to scroll.
 *   - Tax treatment AND currency aren't shown: both come from the
 *     code's row in Setup → Earnings & Deductions, applied server-side.
 *     If a code should pay out in ZiG, set its default currency to ZWG
 *     once in Setup and every capture for that code will be in ZiG.
 */
export function CaptureTransactionForm({
  periodId,
  employees,
  codes,
  fixedEmployee,
  triggerLabel = "+ Capture transaction",
  triggerVariant = "primary",
}: {
  periodId: string;
  employees: { id: string; name: string }[];
  codes: CodePick[];
  fixedEmployee?: { id: string; name: string };
  triggerLabel?: string;
  triggerVariant?: "primary" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"EARNING" | "DEDUCTION">("EARNING");
  const [pending, startTransition] = useTransition();

  const available = codes.filter((c) => c.kind === kind);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await addTransaction(fd);
        toast.success("Transaction captured.");
        setOpen(false);
      } catch (err) {
        const msg = (err as { message?: string })?.message ?? "Capture failed.";
        toast.error(msg);
      }
    });
  }

  if (!open) {
    const trigger =
      triggerVariant === "primary"
        ? "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        : "inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline";
    return (
      <button type="button" onClick={() => setOpen(true)} className={trigger}>
        {triggerLabel}
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={(e) => {
        if (!pending && e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Capture transaction</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <input type="hidden" name="payPeriodId" value={periodId} />

          {/* Employee — read-only label + hidden field when fixed,
              otherwise the original dropdown. */}
          {fixedEmployee ? (
            <>
              <input type="hidden" name="employeeId" value={fixedEmployee.id} />
              <div className="col-span-2 rounded-md border border-input bg-muted/30 px-3 py-2 text-sm">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Employee
                </div>
                <div className="font-semibold text-foreground">
                  {fixedEmployee.name}
                </div>
              </div>
            </>
          ) : (
            <label className="col-span-2 text-sm">
              <span className="mb-1 block font-semibold text-foreground">Employee</span>
              <select
                name="employeeId"
                required
                className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Type</span>
            <select
              name="kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as "EARNING" | "DEDUCTION")}
              className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="EARNING">Earning</option>
              <option value="DEDUCTION">Deduction</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Code</span>
            <select
              name="code"
              required
              className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {available.length === 0 ? (
                <option value="">— add codes in Setup →</option>
              ) : (
                available.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}{" "}
                    ({c.default_currency === "ZWG" ? "ZiG" : c.default_currency})
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Amount</span>
            <input
              name="amount"
              type="number"
              step="any"
              required
              className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            />
          </label>

          {/* Currency + Tax treatment intentionally omitted — both come
              from the code's row in Setup → Earnings & Deductions and
              are applied server-side. */}

          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-transparent px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/40 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {pending ? "Capturing…" : "Capture"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

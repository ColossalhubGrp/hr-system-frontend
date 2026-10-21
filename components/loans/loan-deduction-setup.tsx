"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { CheckCircle2 } from "lucide-react";
import {
  EmployeePickerField,
  type EmployeeDirectoryEntry,
} from "@/components/common/employee-picker-field";
import { createAdditionalSalaryAction } from "@/app/(workspace)/payroll/adjustments/actions";
import { Field, SelectInput, TextInput } from "@/components/employee/form-bits";

/**
 * One-click bridge from loan amortization to a recurring payroll
 * deduction. Submits to the existing createAdditionalSalaryAction so
 * the pay-run engine's recurring-adjustment mechanism carries the
 * monthly EMI as a DEDUCTION on every pay run between From and To.
 *
 * The capital balance reduces organically each run — the engine
 * subtracts the EMI amount from net pay, matching the amortization
 * table's principal + interest split per month.
 */
export function LoanDeductionSetup({
  employeeDirectory,
  components,
}: {
  employeeDirectory: EmployeeDirectoryEntry[];
  components: string[];
}) {
  const [state, dispatch] = useFormState(createAdditionalSalaryAction, {});
  const [emi, setEmi] = useState<number>(0);
  const [from, setFrom] = useState<string>(new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 12);
    return d.toISOString().slice(0, 10);
  });

  const months = monthsBetween(from, to);

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <header className="mb-3">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Set up recurring payroll deduction
        </h2>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          Picks up the EMI from the schedule above and installs a recurring deduction. The pay-run
          engine will fire it every month between the From and To dates — net pay drops by this
          amount and the outstanding capital balance reduces automatically.
        </p>
      </header>

      {state.error && (
        <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <form action={dispatch} className="grid grid-cols-1 gap-3 sm:grid-cols-6">
        <div className="sm:col-span-2">
          <EmployeePickerField
            name="employee"
            required
            directory={employeeDirectory}
          />
        </div>
        <Field label="Salary component" htmlFor="salary_component" required>
          {components.length > 0 ? (
            <SelectInput
              id="salary_component"
              name="salary_component"
              options={components}
              placeholder="Pick a deduction component"
            />
          ) : (
            <TextInput id="salary_component" name="salary_component" placeholder="e.g. Loan Deduction" />
          )}
        </Field>
        <Field label="Monthly EMI (USD)" htmlFor="amount" required>
          <TextInput
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            value={emi || ""}
            onChange={(e) => setEmi(Number(e.target.value) || 0)}
            placeholder="Copy from the schedule's Payment column"
          />
        </Field>
        <Field label="Payroll date" htmlFor="payroll_date" required>
          <TextInput id="payroll_date" name="payroll_date" type="date" defaultValue={from} />
        </Field>
        <Field label="From" htmlFor="from_date" required>
          <TextInput id="from_date" name="from_date" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="To" htmlFor="to_date" required>
          <TextInput id="to_date" name="to_date" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        {/* Always recurring — this helper exists for recurring loans */}
        <input type="hidden" name="is_recurring" value="on" />
        <div className="sm:col-span-6 flex items-center justify-between">
          <p className="text-[12px] text-muted-foreground">
            Deducts <strong className="font-semibold tabular-nums">US$ {emi.toFixed(2)}</strong>
            {" × "}
            <strong className="font-semibold tabular-nums">{months}</strong> months →
            total <strong className="font-semibold tabular-nums">US$ {(emi * months).toFixed(2)}</strong>
          </p>
          <button
            type="submit"
            disabled={emi <= 0 || !from || !to}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Install recurring deduction
          </button>
        </div>
      </form>
    </section>
  );
}

function monthsBetween(a: string, b: string): number {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  if (!ay || !am || !by || !bm) return 0;
  return Math.max(0, (by - ay) * 12 + (bm - am) + 1);
}

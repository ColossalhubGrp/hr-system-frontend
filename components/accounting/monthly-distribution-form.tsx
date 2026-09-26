"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState, useMemo } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save, Trash2 } from "lucide-react";
import { Field, FormSection, SelectInput, TextInput } from "@/components/employee/form-bits";
import {
  createMonthlyDistributionAction,
  updateMonthlyDistributionAction,
  deleteMonthlyDistributionAction,
  type FormState,
} from "@/app/(workspace)/accounting/masters/monthly-distribution/actions";
import { MONTHS } from "@/lib/frappe/budgets/monthly-distribution-constants";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};
type Row = { month: string; percentage_allocation: string };
const DEFAULT_ROWS = (): Row[] => MONTHS.map((m) => ({ month: m, percentage_allocation: (100 / 12).toFixed(4) }));

type Initial = { fiscalYear: string | null; percentages: Row[] };

export function MonthlyDistributionForm({
  mode,
  name,
  fiscalYears,
  initial,
}: {
  mode: "create" | "edit";
  name?: string;
  fiscalYears: string[];
  initial?: Initial;
}) {
  const action = mode === "create" ? createMonthlyDistributionAction : updateMonthlyDistributionAction.bind(null, name ?? "");
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};
  const [rows, setRows] = useState<Row[]>(initial?.percentages && initial.percentages.length === 12 ? initial.percentages : DEFAULT_ROWS());

  const total = useMemo(() => rows.reduce((a, r) => a + (Number(r.percentage_allocation) || 0), 0), [rows]);
  const isBalanced = Math.abs(total - 100) < 0.01;

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{state.error}</div>
        </div>
      )}
      <FormSection title="Distribution" description="What to call it + which fiscal year it belongs to.">
        <div className="grid gap-4 sm:grid-cols-2">
          {mode === "create" ? (
            <Field label="Name" htmlFor="distribution_id" error={fe.distribution_id} required>
              <TextInput id="distribution_id" name="distribution_id" placeholder="e.g. Seasonal Sales" />
            </Field>
          ) : (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</div>
              <div className="mt-1 text-sm font-mono font-semibold text-foreground">{name}</div>
            </div>
          )}
          <Field label="Fiscal year" htmlFor="fiscal_year" error={fe.fiscal_year}>
            <SelectInput id="fiscal_year" name="fiscal_year" defaultValue={initial?.fiscalYear ?? ""} options={[{ value: "", label: "—" }, ...fiscalYears.map((y) => ({ value: y, label: y }))]} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Monthly split" description="12 percentages that must add up to 100.">
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((r, idx) => (
            <div key={r.month} className="rounded-xl border border-border/60 bg-muted/10 p-2">
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">{r.month}</label>
              <TextInput
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={r.percentage_allocation}
                onChange={(e) => setRows((p) => p.map((x, i) => (i === idx ? { ...x, percentage_allocation: e.target.value } : x)))}
                className="tabular-nums"
              />
            </div>
          ))}
        </div>
        <div className={cn("mt-3 flex items-center justify-end gap-2 text-sm", isBalanced ? "text-rise" : "text-fall")}>
          <span>Total </span>
          <strong className="tabular-nums">{total.toFixed(2)}%</strong>
          <span className={cn("rounded-chip px-2 py-0.5 text-xs font-semibold", isBalanced ? "bg-rise/10" : "bg-fall/10")}>
            {isBalanced ? "Balanced" : `Off by ${(total - 100).toFixed(2)}`}
          </span>
        </div>
        <input type="hidden" name="pct_json" value={JSON.stringify(rows.map((r) => ({ month: r.month, percentage_allocation: Number(r.percentage_allocation) || 0 })))} />
        {fe.pct_json && <p className="mt-2 text-xs text-destructive">{fe.pct_json}</p>}
      </FormSection>

      <div className="flex items-center justify-between">
        {mode === "edit" && name && <DelBtn name={name} />}
        <div className="ml-auto flex items-center gap-2">
          <Link href={"/accounting/masters/monthly-distribution" as Route} className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40">Cancel</Link>
          <SubBtn mode={mode} disabled={!isBalanced} />
        </div>
      </div>
    </form>
  );
}

function SubBtn({ mode, disabled }: { mode: "create" | "edit"; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} className={cn("inline-flex h-10 items-center gap-1.5 rounded-chip px-4 text-sm font-semibold text-white transition focus-ring", disabled || pending ? "bg-muted-foreground cursor-not-allowed" : "bg-ink-800 hover:bg-ink-700")}>
      <Save className="h-4 w-4" /> {pending ? "Saving…" : mode === "create" ? "Save distribution" : "Save changes"}
    </button>
  );
}

function DelBtn({ name }: { name: string }) {
  const onSubmit = async () => { await deleteMonthlyDistributionAction(name); };
  return (
    <form action={onSubmit}>
      <button type="submit" className="inline-flex items-center gap-1.5 rounded-chip border border-destructive/30 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10" onClick={(e) => { if (!confirm(`Delete "${name}"?`)) e.preventDefault(); }}>
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
    </form>
  );
}

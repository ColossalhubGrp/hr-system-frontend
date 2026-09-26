"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState, useMemo } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save, Trash2, Plus } from "lucide-react";
import { Field, FormSection, SelectInput, TextInput } from "@/components/employee/form-bits";
import {
  createAllocationAction,
  updateAllocationAction,
  deleteAllocationAction,
  type FormState,
} from "@/app/(workspace)/accounting/cost-centers/allocations/actions";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};
type Row = { cost_center: string; percentage: string };
const EMPTY_ROW = (): Row => ({ cost_center: "", percentage: "" });

type Company = { name: string };
type Initial = { company: string; mainCostCenter: string; validFrom: string; percentages: Row[] };

export function CostCenterAllocationForm({
  mode,
  name,
  companies,
  initial,
}: {
  mode: "create" | "edit";
  name?: string;
  companies: Company[];
  initial?: Initial;
}) {
  const action = mode === "create" ? createAllocationAction : updateAllocationAction.bind(null, name ?? "");
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};
  const [rows, setRows] = useState<Row[]>(initial?.percentages && initial.percentages.length ? initial.percentages : [EMPTY_ROW()]);

  const total = useMemo(() => rows.reduce((a, r) => a + (Number(r.percentage) || 0), 0), [rows]);
  const isBalanced = Math.abs(total - 100) < 0.01;

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{state.error}</div>
        </div>
      )}
      <FormSection title="Allocation" description="Which main cost centre gets split, from when, in which company.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Company" htmlFor="company" error={fe.company} required>
            <SelectInput id="company" name="company" defaultValue={initial?.company ?? companies[0]?.name ?? ""} options={companies.map((c) => c.name)} />
          </Field>
          <Field label="Main cost centre" htmlFor="main_cost_center" error={fe.main_cost_center} required>
            <TextInput id="main_cost_center" name="main_cost_center" defaultValue={initial?.mainCostCenter ?? ""} placeholder="Cost Center to split" />
          </Field>
          <Field label="Valid from" htmlFor="valid_from" error={fe.valid_from} required>
            <TextInput id="valid_from" name="valid_from" type="date" defaultValue={initial?.validFrom ?? ""} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Split" description="Sub-cost-centres and their percentages. Must add up to 100.">
        <div className="flex flex-col gap-3">
          {rows.map((r, idx) => (
            <div key={idx} className="grid grid-cols-12 items-end gap-2 rounded-xl border border-border/60 bg-muted/10 p-3">
              <div className="col-span-12 md:col-span-8">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Cost centre #{idx + 1}</label>
                <TextInput value={r.cost_center} onChange={(e) => setRows((p) => p.map((x, i) => (i === idx ? { ...x, cost_center: e.target.value } : x)))} />
              </div>
              <div className="col-span-11 md:col-span-3">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Percentage</label>
                <TextInput type="number" step="0.01" min="0" max="100" value={r.percentage} onChange={(e) => setRows((p) => p.map((x, i) => (i === idx ? { ...x, percentage: e.target.value } : x)))} className="tabular-nums" />
              </div>
              <div className="col-span-1 flex justify-end">
                {rows.length > 1 && (
                  <button type="button" onClick={() => setRows((p) => p.filter((_, i) => i !== idx))} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Remove ${idx + 1}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          <div className={cn("flex items-center justify-end gap-2 text-sm", isBalanced ? "text-rise" : "text-fall")}>
            <span>Total</span>
            <strong className="tabular-nums">{total.toFixed(2)}%</strong>
            <span className={cn("rounded-chip px-2 py-0.5 text-xs font-semibold", isBalanced ? "bg-rise/10" : "bg-fall/10")}>{isBalanced ? "Balanced" : `Off by ${(total - 100).toFixed(2)}`}</span>
          </div>
          <button type="button" onClick={() => setRows((p) => [...p, EMPTY_ROW()])} className="inline-flex w-max items-center gap-1.5 rounded-chip border border-input px-3 py-1.5 text-sm font-semibold hover:bg-muted/40">
            <Plus className="h-3.5 w-3.5" />
            Add sub-centre
          </button>
        </div>
        <input type="hidden" name="pct_json" value={JSON.stringify(rows.filter((r) => r.cost_center).map((r) => ({ cost_center: r.cost_center, percentage: Number(r.percentage) || 0 })))} />
        {fe.pct_json && <p className="mt-2 text-xs text-destructive">{fe.pct_json}</p>}
      </FormSection>

      <div className="flex items-center justify-between">
        {mode === "edit" && name && <DelBtn name={name} />}
        <div className="ml-auto flex items-center gap-2">
          <Link href={"/accounting/cost-centers/allocations" as Route} className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40">Cancel</Link>
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
      <Save className="h-4 w-4" /> {pending ? "Saving…" : mode === "create" ? "Save allocation" : "Save changes"}
    </button>
  );
}

function DelBtn({ name }: { name: string }) {
  const onSubmit = async () => { await deleteAllocationAction(name); };
  return (
    <form action={onSubmit}>
      <button type="submit" className="inline-flex items-center gap-1.5 rounded-chip border border-destructive/30 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10" onClick={(e) => { if (!confirm(`Delete allocation "${name}"?`)) e.preventDefault(); }}>
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
    </form>
  );
}

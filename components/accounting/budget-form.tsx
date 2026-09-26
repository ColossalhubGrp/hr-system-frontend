"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save, Trash2, Plus } from "lucide-react";
import { Field, FormSection, SelectInput, TextInput } from "@/components/employee/form-bits";
import {
  createBudgetAction,
  updateBudgetAction,
  deleteBudgetAction,
  type FormState,
} from "@/app/(workspace)/accounting/budgets/actions";
import type { AccountOption } from "@/lib/frappe/accounting";
import { BUDGET_AGAINST, ACTIONS } from "@/lib/frappe/budgets/budget-constants";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};
type Line = { account: string; budget_amount: string };
const EMPTY_LINE = (): Line => ({ account: "", budget_amount: "" });

type Company = { name: string };
type Initial = {
  budgetAgainst: string;
  company: string;
  fiscalYear: string;
  costCenter: string | null;
  project: string | null;
  accountingDimension: string | null;
  monthlyDistribution: string | null;
  applicableOnMaterialRequest: boolean;
  applicableOnPurchaseOrder: boolean;
  applicableOnBookingActualExpenses: boolean;
  actionIfAnnualBudgetExceeded: string;
  actionIfAnnualBudgetExceededOnMr: string;
  actionIfAnnualBudgetExceededOnPo: string;
  actionIfAccumulatedMonthlyBudgetExceeded: string;
  actionIfAccumulatedMonthlyBudgetExceededOnMr: string;
  actionIfAccumulatedMonthlyBudgetExceededOnPo: string;
  accounts: Line[];
};

export function BudgetForm({
  mode,
  name,
  companies,
  fiscalYears,
  accounts,
  monthlyDistributions,
  initial,
}: {
  mode: "create" | "edit";
  name?: string;
  companies: Company[];
  fiscalYears: string[];
  accounts: AccountOption[];
  monthlyDistributions: string[];
  initial?: Initial;
}) {
  const action = mode === "create" ? createBudgetAction : updateBudgetAction.bind(null, name ?? "");
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};
  const [against, setAgainst] = useState(initial?.budgetAgainst ?? "Cost Center");
  const [lines, setLines] = useState<Line[]>(initial?.accounts && initial.accounts.length ? initial.accounts : [EMPTY_LINE()]);

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{state.error}</div>
        </div>
      )}
      <FormSection title="Budget" description="What this budget scopes and where it applies.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Budget against" htmlFor="budget_against" error={fe.budget_against} required>
            <SelectInput id="budget_against" name="budget_against" value={against} options={[...BUDGET_AGAINST]} onChange={(e) => setAgainst(e.target.value)} />
          </Field>
          <Field label="Company" htmlFor="company" error={fe.company} required>
            <SelectInput id="company" name="company" defaultValue={initial?.company ?? companies[0]?.name ?? ""} options={companies.map((c) => c.name)} />
          </Field>
          <Field label="Fiscal year" htmlFor="fiscal_year" error={fe.fiscal_year} required>
            <SelectInput id="fiscal_year" name="fiscal_year" defaultValue={initial?.fiscalYear ?? fiscalYears[0] ?? ""} options={fiscalYears} />
          </Field>
          {against === "Cost Center" && (
            <Field label="Cost centre" htmlFor="cost_center" error={fe.cost_center} required>
              <TextInput id="cost_center" name="cost_center" defaultValue={initial?.costCenter ?? ""} placeholder="Cost Center name" />
            </Field>
          )}
          {against === "Project" && (
            <Field label="Project" htmlFor="project" error={fe.project} required>
              <TextInput id="project" name="project" defaultValue={initial?.project ?? ""} placeholder="Project name" />
            </Field>
          )}
          {against === "Accounting Dimension" && (
            <Field label="Accounting dimension" htmlFor="accounting_dimension" error={fe.accounting_dimension} required>
              <TextInput id="accounting_dimension" name="accounting_dimension" defaultValue={initial?.accountingDimension ?? ""} />
            </Field>
          )}
          <Field label="Monthly distribution" htmlFor="monthly_distribution">
            <SelectInput id="monthly_distribution" name="monthly_distribution" defaultValue={initial?.monthlyDistribution ?? ""} options={[{ value: "", label: "—" }, ...monthlyDistributions.map((m) => ({ value: m, label: m }))]} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Applies to" description="Which documents trigger the budget check.">
        <div className="flex flex-col gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="applicable_on_material_request" defaultChecked={initial?.applicableOnMaterialRequest ?? false} className="h-4 w-4" />
            <span>Material Requests</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="applicable_on_purchase_order" defaultChecked={initial?.applicableOnPurchaseOrder ?? false} className="h-4 w-4" />
            <span>Purchase Orders</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="applicable_on_booking_actual_expenses" defaultChecked={initial?.applicableOnBookingActualExpenses ?? true} className="h-4 w-4" />
            <span>Actual GL bookings (recommended)</span>
          </label>
        </div>
      </FormSection>

      <FormSection title="Actions" description="What to do when the cap is hit — Stop / Warn / Ignore.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Annual · GL bookings" htmlFor="action_if_annual_budget_exceeded"><SelectInput id="action_if_annual_budget_exceeded" name="action_if_annual_budget_exceeded" defaultValue={initial?.actionIfAnnualBudgetExceeded ?? ""} options={[...ACTIONS]} /></Field>
          <Field label="Annual · Material Requests" htmlFor="action_if_annual_budget_exceeded_on_mr"><SelectInput id="action_if_annual_budget_exceeded_on_mr" name="action_if_annual_budget_exceeded_on_mr" defaultValue={initial?.actionIfAnnualBudgetExceededOnMr ?? ""} options={[...ACTIONS]} /></Field>
          <Field label="Annual · Purchase Orders" htmlFor="action_if_annual_budget_exceeded_on_po"><SelectInput id="action_if_annual_budget_exceeded_on_po" name="action_if_annual_budget_exceeded_on_po" defaultValue={initial?.actionIfAnnualBudgetExceededOnPo ?? ""} options={[...ACTIONS]} /></Field>
          <Field label="Monthly cum. · GL bookings" htmlFor="action_if_accumulated_monthly_budget_exceeded"><SelectInput id="action_if_accumulated_monthly_budget_exceeded" name="action_if_accumulated_monthly_budget_exceeded" defaultValue={initial?.actionIfAccumulatedMonthlyBudgetExceeded ?? ""} options={[...ACTIONS]} /></Field>
          <Field label="Monthly cum. · Material Requests" htmlFor="action_if_accumulated_monthly_budget_exceeded_on_mr"><SelectInput id="action_if_accumulated_monthly_budget_exceeded_on_mr" name="action_if_accumulated_monthly_budget_exceeded_on_mr" defaultValue={initial?.actionIfAccumulatedMonthlyBudgetExceededOnMr ?? ""} options={[...ACTIONS]} /></Field>
          <Field label="Monthly cum. · Purchase Orders" htmlFor="action_if_accumulated_monthly_budget_exceeded_on_po"><SelectInput id="action_if_accumulated_monthly_budget_exceeded_on_po" name="action_if_accumulated_monthly_budget_exceeded_on_po" defaultValue={initial?.actionIfAccumulatedMonthlyBudgetExceededOnPo ?? ""} options={[...ACTIONS]} /></Field>
        </div>
      </FormSection>

      <FormSection title="Accounts" description="Which ledger accounts this budget caps, and by how much for the year.">
        <div className="flex flex-col gap-3">
          {lines.map((l, idx) => (
            <div key={idx} className="grid grid-cols-12 items-end gap-2 rounded-xl border border-border/60 bg-muted/10 p-3">
              <div className="col-span-12 md:col-span-8">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Account #{idx + 1}</label>
                <SelectInput value={l.account} options={[{ value: "", label: "—" }, ...accounts.map((a) => ({ value: a.name, label: a.name }))]} onChange={(e) => setLines((p) => p.map((x, i) => (i === idx ? { ...x, account: e.target.value } : x)))} />
              </div>
              <div className="col-span-11 md:col-span-3">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Budget amount</label>
                <TextInput type="number" step="0.01" min="0" value={l.budget_amount} onChange={(e) => setLines((p) => p.map((x, i) => (i === idx ? { ...x, budget_amount: e.target.value } : x)))} className="tabular-nums" />
              </div>
              <div className="col-span-1 flex justify-end">
                {lines.length > 1 && (
                  <button type="button" onClick={() => setLines((p) => p.filter((_, i) => i !== idx))} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Remove ${idx + 1}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setLines((p) => [...p, EMPTY_LINE()])} className="inline-flex w-max items-center gap-1.5 rounded-chip border border-input px-3 py-1.5 text-sm font-semibold hover:bg-muted/40">
            <Plus className="h-3.5 w-3.5" />
            Add account
          </button>
        </div>
        <input type="hidden" name="accounts_json" value={JSON.stringify(lines.filter((l) => l.account).map((l) => ({ account: l.account, budget_amount: Number(l.budget_amount) || 0 })))} />
      </FormSection>

      <div className="flex items-center justify-between">
        {mode === "edit" && name && <DelBtn name={name} />}
        <div className="ml-auto flex items-center gap-2">
          <Link href={"/accounting/budgets" as Route} className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40">Cancel</Link>
          <SubBtn mode={mode} />
        </div>
      </div>
    </form>
  );
}

function SubBtn({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={cn("inline-flex h-10 items-center gap-1.5 rounded-chip px-4 text-sm font-semibold text-white transition focus-ring", pending ? "bg-muted-foreground cursor-not-allowed" : "bg-ink-800 hover:bg-ink-700")}>
      <Save className="h-4 w-4" /> {pending ? "Saving…" : mode === "create" ? "Save budget" : "Save changes"}
    </button>
  );
}

function DelBtn({ name }: { name: string }) {
  const onSubmit = async () => { await deleteBudgetAction(name); };
  return (
    <form action={onSubmit}>
      <button type="submit" className="inline-flex items-center gap-1.5 rounded-chip border border-destructive/30 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10" onClick={(e) => { if (!confirm(`Delete budget "${name}"?`)) e.preventDefault(); }}>
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
    </form>
  );
}

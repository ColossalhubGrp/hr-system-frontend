"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save, Trash2, Plus, Ban } from "lucide-react";
import { Field, FormSection, SelectInput, TextInput } from "@/components/employee/form-bits";
import {
  createSubscriptionAction,
  updateSubscriptionAction,
  cancelSubscriptionAction,
  deleteSubscriptionAction,
  type FormState,
} from "@/app/(workspace)/accounting/subscriptions/actions";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};
type PlanRow = { plan: string; qty: string };

type Initial = {
  partyType: string;
  party: string;
  company: string;
  startDate: string;
  endDate: string | null;
  daysUntilDue: number;
  followCalendarMonths: boolean;
  generateNewInvoicesPastDueDate: boolean;
  submitInvoice: boolean;
  generateInvoiceAt: string;
  plans: PlanRow[];
};

export function SubscriptionForm({
  mode,
  name,
  companies,
  plans,
  initial,
  defaultDate,
  status,
}: {
  mode: "create" | "edit";
  name?: string;
  companies: string[];
  plans: string[];
  initial?: Initial;
  defaultDate: string;
  status?: string;
}) {
  const action = mode === "create" ? createSubscriptionAction : updateSubscriptionAction.bind(null, name ?? "");
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};
  const [rows, setRows] = useState<PlanRow[]>(initial?.plans && initial.plans.length ? initial.plans : [{ plan: "", qty: "1" }]);

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{state.error}</div>
        </div>
      )}
      <FormSection title="Subscription" description="Who is subscribed, in which company, from when.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Party type" htmlFor="party_type" required>
            <SelectInput id="party_type" name="party_type" defaultValue={initial?.partyType ?? "Customer"} options={["Customer", "Supplier"]} />
          </Field>
          <Field label="Party" htmlFor="party" error={fe.party} required>
            <TextInput id="party" name="party" defaultValue={initial?.party ?? ""} placeholder="Party ID" />
          </Field>
          <Field label="Company" htmlFor="company" error={fe.company} required>
            <SelectInput id="company" name="company" defaultValue={initial?.company ?? companies[0] ?? ""} options={companies} />
          </Field>
          <Field label="Start date" htmlFor="start_date" error={fe.start_date} required>
            <TextInput id="start_date" name="start_date" type="date" defaultValue={initial?.startDate ?? defaultDate} />
          </Field>
          <Field label="End date" htmlFor="end_date">
            <TextInput id="end_date" name="end_date" type="date" defaultValue={initial?.endDate ?? ""} />
          </Field>
          <Field label="Days until due" htmlFor="days_until_due">
            <TextInput id="days_until_due" name="days_until_due" type="number" min="0" defaultValue={String(initial?.daysUntilDue ?? 0)} className="tabular-nums" />
          </Field>
          <Field label="Generate invoice at" htmlFor="generate_invoice_at" wide>
            <SelectInput id="generate_invoice_at" name="generate_invoice_at" defaultValue={initial?.generateInvoiceAt ?? "End of the current subscription period"} options={["Beginning of the current subscription period", "End of the current subscription period"]} />
          </Field>
          <Field label="Behaviour" htmlFor="follow_calendar_months" wide>
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex items-center gap-2"><input id="follow_calendar_months" type="checkbox" name="follow_calendar_months" defaultChecked={initial?.followCalendarMonths ?? false} className="h-4 w-4" /><span>Follow calendar months (align invoice periods to month-end)</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" name="generate_new_invoices_past_due_date" defaultChecked={initial?.generateNewInvoicesPastDueDate ?? false} className="h-4 w-4" /><span>Generate new invoices even past due date</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" name="submit_invoice" defaultChecked={initial?.submitInvoice ?? true} className="h-4 w-4" /><span>Auto-submit generated invoices</span></label>
            </div>
          </Field>
        </div>
      </FormSection>

      <FormSection title="Plans" description="One or more Subscription Plans, each with a quantity.">
        <div className="flex flex-col gap-3">
          {rows.map((r, idx) => (
            <div key={idx} className="grid grid-cols-12 items-end gap-2 rounded-xl border border-border/60 bg-muted/10 p-3">
              <div className="col-span-12 md:col-span-8">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Plan #{idx + 1}</label>
                <SelectInput value={r.plan} options={[{ value: "", label: "—" }, ...plans.map((p) => ({ value: p, label: p }))]} onChange={(e) => setRows((p) => p.map((x, i) => (i === idx ? { ...x, plan: e.target.value } : x)))} />
              </div>
              <div className="col-span-11 md:col-span-3">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Qty</label>
                <TextInput type="number" step="0.01" min="0" value={r.qty} onChange={(e) => setRows((p) => p.map((x, i) => (i === idx ? { ...x, qty: e.target.value } : x)))} className="tabular-nums" />
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
          <button type="button" onClick={() => setRows((p) => [...p, { plan: "", qty: "1" }])} className="inline-flex w-max items-center gap-1.5 rounded-chip border border-input px-3 py-1.5 text-sm font-semibold hover:bg-muted/40">
            <Plus className="h-3.5 w-3.5" />
            Add plan
          </button>
        </div>
        <input type="hidden" name="plans_json" value={JSON.stringify(rows.filter((r) => r.plan).map((r) => ({ plan: r.plan, qty: Number(r.qty) || 1 })))} />
      </FormSection>

      <div className="flex items-center justify-between">
        {mode === "edit" && name && (
          <div className="flex items-center gap-2">
            {status !== "Cancelled" && <CancelSubBtn name={name} />}
            <DelBtn name={name} />
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Link href={"/accounting/subscriptions" as Route} className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40">Cancel</Link>
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
      <Save className="h-4 w-4" /> {pending ? "Saving…" : mode === "create" ? "Create subscription" : "Save changes"}
    </button>
  );
}

function CancelSubBtn({ name }: { name: string }) {
  const onSubmit = async () => { await cancelSubscriptionAction(name); };
  return (
    <form action={onSubmit}>
      <button type="submit" className="inline-flex items-center gap-1.5 rounded-chip border border-destructive/30 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10" onClick={(e) => { if (!confirm(`Cancel subscription "${name}"? Its next billing cycle won't run.`)) e.preventDefault(); }}>
        <Ban className="h-3.5 w-3.5" /> Cancel subscription
      </button>
    </form>
  );
}

function DelBtn({ name }: { name: string }) {
  const onSubmit = async () => { await deleteSubscriptionAction(name); };
  return (
    <form action={onSubmit}>
      <button type="submit" className="inline-flex items-center gap-1.5 rounded-chip border border-destructive/30 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10" onClick={(e) => { if (!confirm(`Delete "${name}"? This is permanent.`)) e.preventDefault(); }}>
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
    </form>
  );
}

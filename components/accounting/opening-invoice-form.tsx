"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Save, Trash2, Plus } from "lucide-react";
import { Field, FormSection, SelectInput, TextInput } from "@/components/employee/form-bits";
import { createOpeningInvoicesAction, type FormState } from "@/app/(workspace)/accounting/tools/opening-invoices/actions";
import type { AccountOption } from "@/lib/frappe/accounting";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};

type Row = {
  party: string;
  amount: string;
  temporary_opening_account: string;
  posting_date: string;
  due_date: string;
  invoice_number: string;
  item_description: string;
};

const EMPTY_ROW = (postingDate: string): Row => ({
  party: "", amount: "", temporary_opening_account: "", posting_date: postingDate,
  due_date: "", invoice_number: "", item_description: "",
});

export function OpeningInvoiceForm({
  companies,
  openingAccounts,
  defaultDate,
}: {
  companies: string[];
  openingAccounts: AccountOption[];
  defaultDate: string;
}) {
  const [state, dispatch] = useFormState(createOpeningInvoicesAction, EMPTY);
  const fe = state.fieldErrors ?? {};
  const [rows, setRows] = useState<Row[]>([EMPTY_ROW(defaultDate)]);

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{state.error}</div>
        </div>
      )}
      {state.ok && (
        <div className="flex items-start gap-2 rounded-xl border border-rise/30 bg-rise/5 p-3 text-sm text-rise">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{state.ok}</div>
        </div>
      )}

      <FormSection title="Batch" description="Every row here becomes one invoice at submit time.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company" htmlFor="company" error={fe.company} required>
            <SelectInput id="company" name="company" defaultValue={companies[0] ?? ""} options={companies} />
          </Field>
          <Field label="Invoice type" htmlFor="invoice_type" error={fe.invoice_type} required>
            <SelectInput id="invoice_type" name="invoice_type" defaultValue="Sales" options={["Sales", "Purchase"]} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Opening invoices" description="Party (customer or supplier), amount owed at cut-over, temporary opening account, and posting date.">
        <div className="flex flex-col gap-3">
          {rows.map((r, idx) => (
            <div key={idx} className="grid grid-cols-12 items-end gap-2 rounded-xl border border-border/60 bg-muted/10 p-3">
              <div className="col-span-12 md:col-span-3">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Party #{idx + 1}</label>
                <TextInput value={r.party} onChange={(e) => setRows((p) => p.map((x, i) => (i === idx ? { ...x, party: e.target.value } : x)))} placeholder="Customer/Supplier ID" />
              </div>
              <div className="col-span-6 md:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Amount</label>
                <TextInput type="number" step="0.01" min="0" value={r.amount} onChange={(e) => setRows((p) => p.map((x, i) => (i === idx ? { ...x, amount: e.target.value } : x)))} className="tabular-nums" />
              </div>
              <div className="col-span-6 md:col-span-3">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Opening account</label>
                <SelectInput value={r.temporary_opening_account} options={[...openingAccounts.map((a) => ({ value: a.name, label: a.name }))]} onChange={(e) => setRows((p) => p.map((x, i) => (i === idx ? { ...x, temporary_opening_account: e.target.value } : x)))} />
              </div>
              <div className="col-span-6 md:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Posting date</label>
                <TextInput type="date" value={r.posting_date} onChange={(e) => setRows((p) => p.map((x, i) => (i === idx ? { ...x, posting_date: e.target.value } : x)))} />
              </div>
              <div className="col-span-6 md:col-span-1">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Ref no.</label>
                <TextInput value={r.invoice_number} onChange={(e) => setRows((p) => p.map((x, i) => (i === idx ? { ...x, invoice_number: e.target.value } : x)))} />
              </div>
              <div className="col-span-11 md:col-span-1 flex justify-end">
                {rows.length > 1 && (
                  <button type="button" onClick={() => setRows((p) => p.filter((_, i) => i !== idx))} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Remove row ${idx + 1}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setRows((p) => [...p, EMPTY_ROW(defaultDate)])} className="inline-flex w-max items-center gap-1.5 rounded-chip border border-input px-3 py-1.5 text-sm font-semibold hover:bg-muted/40">
            <Plus className="h-3.5 w-3.5" />
            Add row
          </button>
        </div>
        <input
          type="hidden"
          name="rows_json"
          value={JSON.stringify(
            rows.filter((r) => r.party && r.temporary_opening_account && r.amount).map((r) => ({
              party: r.party,
              amount: Number(r.amount) || 0,
              temporary_opening_account: r.temporary_opening_account,
              posting_date: r.posting_date,
              due_date: r.due_date || undefined,
              invoice_number: r.invoice_number || undefined,
              item_description: r.item_description || undefined,
            })),
          )}
        />
      </FormSection>

      <div className="flex items-center justify-end gap-2">
        <Link href={"/accounting" as Route} className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40">Cancel</Link>
        <Sub />
      </div>
    </form>
  );
}

function Sub() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={cn("inline-flex h-10 items-center gap-1.5 rounded-chip px-4 text-sm font-semibold text-white transition focus-ring", pending ? "bg-muted-foreground cursor-not-allowed" : "bg-ink-800 hover:bg-ink-700")}>
      <Save className="h-4 w-4" />
      {pending ? "Creating…" : "Create opening invoices"}
    </button>
  );
}

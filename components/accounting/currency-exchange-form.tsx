"use client";

import Link from "next/link";
import type { Route } from "next";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save, Trash2 } from "lucide-react";
import { Field, FormSection, SelectInput, TextInput } from "@/components/employee/form-bits";
import {
  createExchangeAction,
  updateExchangeAction,
  deleteExchangeAction,
  type FormState,
} from "@/app/(workspace)/accounting/multi-currency/exchange-rates/actions";
import type { CurrencyExchange } from "@/lib/frappe/multi-currency/currency-exchange";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};

export function CurrencyExchangeForm({
  mode,
  name,
  currencies,
  initial,
  defaultDate,
}: {
  mode: "create" | "edit";
  name?: string;
  currencies: string[];
  initial?: CurrencyExchange;
  defaultDate: string;
}) {
  const action = mode === "create" ? createExchangeAction : updateExchangeAction.bind(null, name ?? "");
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{state.error}</div>
        </div>
      )}
      <FormSection title="Rate" description="One rate per (from → to) pair per date; buying/selling toggles narrow it further.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Date" htmlFor="date" error={fe.date} required>
            <TextInput id="date" name="date" type="date" defaultValue={initial?.date ?? defaultDate} />
          </Field>
          <Field label="From currency" htmlFor="from_currency" error={fe.from_currency} required>
            <SelectInput id="from_currency" name="from_currency" defaultValue={initial?.fromCurrency ?? ""} options={[...currencies.map((c) => ({ value: c, label: c }))]} />
          </Field>
          <Field label="To currency" htmlFor="to_currency" error={fe.to_currency} required>
            <SelectInput id="to_currency" name="to_currency" defaultValue={initial?.toCurrency ?? ""} options={[...currencies.map((c) => ({ value: c, label: c }))]} />
          </Field>
          <Field label="Exchange rate" htmlFor="exchange_rate" error={fe.exchange_rate} required>
            <TextInput id="exchange_rate" name="exchange_rate" type="number" step="0.000001" min="0" defaultValue={String(initial?.exchangeRate ?? "")} placeholder="1 from = X to" className="tabular-nums" />
          </Field>
          <Field label="Applies to" htmlFor="for_buying">
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex items-center gap-2"><input id="for_buying" type="checkbox" name="for_buying" defaultChecked={initial?.forBuying ?? false} className="h-4 w-4" /> <span>Buying</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" name="for_selling" defaultChecked={initial?.forSelling ?? false} className="h-4 w-4" /> <span>Selling</span></label>
            </div>
          </Field>
        </div>
      </FormSection>
      <div className="flex items-center justify-between">
        {mode === "edit" && name && <DelBtn name={name} />}
        <div className="ml-auto flex items-center gap-2">
          <Link href={"/accounting/multi-currency/exchange-rates" as Route} className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40">Cancel</Link>
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
      <Save className="h-4 w-4" /> {pending ? "Saving…" : mode === "create" ? "Save rate" : "Save changes"}
    </button>
  );
}

function DelBtn({ name }: { name: string }) {
  const onSubmit = async () => { await deleteExchangeAction(name); };
  return (
    <form action={onSubmit}>
      <button type="submit" className="inline-flex items-center gap-1.5 rounded-chip border border-destructive/30 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10" onClick={(e) => { if (!confirm(`Delete "${name}"?`)) e.preventDefault(); }}>
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
    </form>
  );
}

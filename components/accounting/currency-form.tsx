"use client";

import Link from "next/link";
import type { Route } from "next";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save, Trash2 } from "lucide-react";
import { Field, FormSection, SelectInput, TextInput } from "@/components/employee/form-bits";
import {
  createCurrencyAction,
  updateCurrencyAction,
  deleteCurrencyAction,
  type FormState,
} from "@/app/(workspace)/accounting/multi-currency/currencies/actions";
import type { Currency } from "@/lib/frappe/multi-currency/currency";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};
const FORMATS = ["", "#,###.##", "#.###,##", "# ###.##", "#,###.###", "#'###.##", "#,##,###.##"];

export function CurrencyForm({
  mode,
  name,
  initial,
}: {
  mode: "create" | "edit";
  name?: string;
  initial?: Currency;
}) {
  const action = mode === "create" ? createCurrencyAction : updateCurrencyAction.bind(null, name ?? "");
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
      <FormSection title="Currency" description="Code + display symbol + formatting.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Name (currency code)" htmlFor="currency_name" error={fe.currency_name} required>
            <TextInput id="currency_name" name="currency_name" defaultValue={initial?.currencyName ?? ""} placeholder="e.g. USD, ZiG, ZAR" maxLength={10} />
          </Field>
          <Field label="Symbol" htmlFor="symbol">
            <TextInput id="symbol" name="symbol" defaultValue={initial?.symbol ?? ""} placeholder="$, ZiG, R" maxLength={10} />
          </Field>
          <Field label="Number format" htmlFor="number_format">
            <SelectInput id="number_format" name="number_format" defaultValue={initial?.numberFormat ?? ""} options={FORMATS} />
          </Field>
          <Field label="Fraction name" htmlFor="fraction">
            <TextInput id="fraction" name="fraction" defaultValue={initial?.fraction ?? ""} placeholder="Cent, Bond" />
          </Field>
          <Field label="Fraction units" htmlFor="fraction_units">
            <TextInput id="fraction_units" name="fraction_units" type="number" min="0" defaultValue={String(initial?.fractionUnits ?? 100)} className="tabular-nums" />
          </Field>
          <Field label="Smallest unit" htmlFor="smallest_currency_fraction_value">
            <TextInput id="smallest_currency_fraction_value" name="smallest_currency_fraction_value" type="number" step="0.001" min="0" defaultValue={String(initial?.smallestCurrencyFractionValue ?? 0.01)} className="tabular-nums" />
          </Field>
          <Field label="Enabled" htmlFor="enabled">
            <label className="flex items-center gap-2 text-sm">
              <input id="enabled" type="checkbox" name="enabled" defaultChecked={initial?.enabled ?? true} className="h-4 w-4" />
              <span className="text-muted-foreground">Show in currency picker.</span>
            </label>
          </Field>
        </div>
      </FormSection>
      <div className="flex items-center justify-between">
        {mode === "edit" && name && <DelBtn name={name} />}
        <div className="ml-auto flex items-center gap-2">
          <Link href={"/accounting/multi-currency/currencies" as Route} className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40">Cancel</Link>
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
      <Save className="h-4 w-4" /> {pending ? "Saving…" : mode === "create" ? "Save currency" : "Save changes"}
    </button>
  );
}

function DelBtn({ name }: { name: string }) {
  const onSubmit = async () => { await deleteCurrencyAction(name); };
  return (
    <form action={onSubmit}>
      <button type="submit" className="inline-flex items-center gap-1.5 rounded-chip border border-destructive/30 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10" onClick={(e) => { if (!confirm(`Delete "${name}"?`)) e.preventDefault(); }}>
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
    </form>
  );
}

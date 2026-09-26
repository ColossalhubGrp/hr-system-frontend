"use client";

import Link from "next/link";
import type { Route } from "next";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save, Trash2 } from "lucide-react";
import { Field, FormSection, SelectInput, TextInput } from "@/components/employee/form-bits";
import {
  updateCompanyMasterAction,
  deleteCompanyMasterAction,
  type FormState,
} from "@/app/(workspace)/accounting/masters/companies/actions";
import type { CompanyDetail } from "@/lib/frappe/masters/company";
import type { AccountOption } from "@/lib/frappe/accounting";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};

export function EditCompanyForm({ initial, accounts }: { initial: CompanyDetail; accounts: AccountOption[] }) {
  const [state, dispatch] = useFormState(updateCompanyMasterAction.bind(null, initial.name), EMPTY);
  const acctOptions = [{ value: "", label: "—" }, ...accounts.map((a) => ({ value: a.name, label: a.name }))];

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{state.error}</div>
        </div>
      )}

      <FormSection title="Identity" description="Read-only — renaming these values re-flows every posting in the company, so ask IT if you need to change them.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Read label="Company name" value={initial.companyName} />
          <Read label="Abbreviation" value={initial.abbr} />
          <Read label="Default currency" value={initial.defaultCurrency} />
          <Read label="Country" value={initial.country ?? "—"} />
          <Read label="Kind" value={initial.isGroup ? "Group" : "Operating"} />
          <Field label="Status" htmlFor="disabled">
            <label className="flex items-center gap-2 text-sm">
              <input id="disabled" type="checkbox" name="disabled" defaultChecked={initial.disabled} className="h-4 w-4" />
              <span className="text-muted-foreground">Disabled — hide from every picker.</span>
            </label>
          </Field>
        </div>
      </FormSection>

      <FormSection title="Meta" description="Tax registration, domain, holiday list.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Tax ID" htmlFor="tax_id">
            <TextInput id="tax_id" name="tax_id" defaultValue={initial.taxId ?? ""} />
          </Field>
          <Field label="Domain" htmlFor="domain">
            <TextInput id="domain" name="domain" defaultValue={initial.domain ?? ""} />
          </Field>
          <Field label="Default holiday list" htmlFor="default_holiday_list">
            <TextInput id="default_holiday_list" name="default_holiday_list" defaultValue={initial.defaultHolidayList ?? ""} placeholder="Holiday List name" />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Default accounts" description="Which ledger accounts Sales/Purchase Invoices and payments post to when the user doesn't override.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Default receivable" htmlFor="default_receivable_account">
            <SelectInput id="default_receivable_account" name="default_receivable_account" defaultValue={initial.defaultReceivableAccount ?? ""} options={acctOptions} />
          </Field>
          <Field label="Default payable" htmlFor="default_payable_account">
            <SelectInput id="default_payable_account" name="default_payable_account" defaultValue={initial.defaultPayableAccount ?? ""} options={acctOptions} />
          </Field>
          <Field label="Default income" htmlFor="default_income_account">
            <SelectInput id="default_income_account" name="default_income_account" defaultValue={initial.defaultIncomeAccount ?? ""} options={acctOptions} />
          </Field>
          <Field label="Default expense" htmlFor="default_expense_account">
            <SelectInput id="default_expense_account" name="default_expense_account" defaultValue={initial.defaultExpenseAccount ?? ""} options={acctOptions} />
          </Field>
          <Field label="Default cash" htmlFor="default_cash_account">
            <SelectInput id="default_cash_account" name="default_cash_account" defaultValue={initial.defaultCashAccount ?? ""} options={acctOptions} />
          </Field>
          <Field label="Default bank" htmlFor="default_bank_account">
            <SelectInput id="default_bank_account" name="default_bank_account" defaultValue={initial.defaultBankAccount ?? ""} options={acctOptions} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Rounding & FX" description="Where currency and rounding gains/losses land.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Round-off account" htmlFor="round_off_account">
            <SelectInput id="round_off_account" name="round_off_account" defaultValue={initial.roundOffAccount ?? ""} options={acctOptions} />
          </Field>
          <Field label="Round-off cost centre" htmlFor="round_off_cost_center">
            <TextInput id="round_off_cost_center" name="round_off_cost_center" defaultValue={initial.roundOffCostCenter ?? ""} placeholder="Cost Center name" />
          </Field>
          <Field label="Write-off account" htmlFor="write_off_account">
            <SelectInput id="write_off_account" name="write_off_account" defaultValue={initial.writeOffAccount ?? ""} options={acctOptions} />
          </Field>
          <Field label="Exchange gain/loss" htmlFor="exchange_gain_loss_account">
            <SelectInput id="exchange_gain_loss_account" name="exchange_gain_loss_account" defaultValue={initial.exchangeGainLossAccount ?? ""} options={acctOptions} />
          </Field>
          <Field label="Default cost centre" htmlFor="cost_center">
            <TextInput id="cost_center" name="cost_center" defaultValue={initial.costCenter ?? ""} placeholder="Cost Center name" />
          </Field>
        </div>
      </FormSection>

      <div className="flex items-center justify-between">
        <DelBtn name={initial.name} />
        <div className="ml-auto flex items-center gap-2">
          <Link href={"/accounting/masters/companies" as Route} className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40">Cancel</Link>
          <SaveBtn />
        </div>
      </div>
    </form>
  );
}

function Read({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function SaveBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={cn("inline-flex h-10 items-center gap-1.5 rounded-chip px-4 text-sm font-semibold text-white transition focus-ring", pending ? "bg-muted-foreground cursor-not-allowed" : "bg-ink-800 hover:bg-ink-700")}>
      <Save className="h-4 w-4" />
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}

function DelBtn({ name }: { name: string }) {
  const onSubmit = async () => { await deleteCompanyMasterAction(name); };
  return (
    <form action={onSubmit}>
      <button type="submit" className="inline-flex items-center gap-1.5 rounded-chip border border-destructive/30 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10" onClick={(e) => { if (!confirm(`Delete company "${name}"? This can't be undone. Removes all its accounts and postings.`)) e.preventDefault(); }}>
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
    </form>
  );
}

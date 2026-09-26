"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save, Trash2 } from "lucide-react";
import { Field, FormSection, SelectInput, TextInput } from "@/components/employee/form-bits";
import {
  createBankAccountAction,
  updateBankAccountAction,
  deleteBankAccountAction,
  type FormState,
} from "@/app/(workspace)/accounting/banking/accounts/actions";
import type { AccountOption } from "@/lib/frappe/accounting";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};
const ACCOUNT_TYPES = ["", "Checking", "Savings", "Current", "Credit Card", "Cash", "Wallet"];
const PARTY_TYPES = ["", "Customer", "Supplier", "Employee", "Shareholder"];

type Company = { name: string };
type Initial = {
  accountName: string;
  bank: string;
  accountType: string | null;
  isDefault: boolean;
  isCompanyAccount: boolean;
  disabled: boolean;
  bankAccountNo: string | null;
  iban: string | null;
  company: string | null;
  account: string | null;
  currency: string | null;
  partyType: string | null;
  party: string | null;
};

export function BankAccountForm({
  mode,
  name,
  banks,
  companies,
  accounts,
  currencies,
  initial,
}: {
  mode: "create" | "edit";
  name?: string;
  banks: string[];
  companies: Company[];
  accounts: AccountOption[];
  currencies: string[];
  initial?: Initial;
}) {
  const action = mode === "create" ? createBankAccountAction : updateBankAccountAction.bind(null, name ?? "");
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};
  const [isCompany, setIsCompany] = useState(initial?.isCompanyAccount ?? true);

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{state.error}</div>
        </div>
      )}
      <FormSection title="Account" description="Identity of the bank account.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Account name" htmlFor="account_name" error={fe.account_name} required>
            <TextInput id="account_name" name="account_name" defaultValue={initial?.accountName ?? ""} placeholder="e.g. CBZ Payroll USD" />
          </Field>
          <Field label="Bank" htmlFor="bank" error={fe.bank} required>
            <SelectInput id="bank" name="bank" defaultValue={initial?.bank ?? banks[0] ?? ""} options={[{ value: "", label: "—" }, ...banks.map((b) => ({ value: b, label: b }))]} />
          </Field>
          <Field label="Account type" htmlFor="account_type">
            <SelectInput id="account_type" name="account_type" defaultValue={initial?.accountType ?? ""} options={ACCOUNT_TYPES} />
          </Field>
          <Field label="Account no." htmlFor="bank_account_no">
            <TextInput id="bank_account_no" name="bank_account_no" defaultValue={initial?.bankAccountNo ?? ""} />
          </Field>
          <Field label="IBAN" htmlFor="iban">
            <TextInput id="iban" name="iban" defaultValue={initial?.iban ?? ""} />
          </Field>
          <Field label="Currency" htmlFor="currency">
            <SelectInput id="currency" name="currency" defaultValue={initial?.currency ?? ""} options={[{ value: "", label: "—" }, ...currencies.map((c) => ({ value: c, label: c }))]} />
          </Field>
          <Field label="Kind" htmlFor="is_company_account">
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input id="is_company_account" type="checkbox" name="is_company_account" checked={isCompany} onChange={(e) => setIsCompany(e.target.checked)} className="h-4 w-4" />
                <span>Company account (posts to the GL)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="is_default" defaultChecked={initial?.isDefault ?? false} className="h-4 w-4" />
                <span>Default for its owner</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="disabled" defaultChecked={initial?.disabled ?? false} className="h-4 w-4" />
                <span>Disabled</span>
              </label>
            </div>
          </Field>
        </div>
      </FormSection>

      {isCompany ? (
        <FormSection title="Company link" description="Which company owns it and which ledger account it posts to.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company" htmlFor="company"><SelectInput id="company" name="company" defaultValue={initial?.company ?? companies[0]?.name ?? ""} options={companies.map((c) => c.name)} /></Field>
            <Field label="Ledger account" htmlFor="account"><SelectInput id="account" name="account" defaultValue={initial?.account ?? ""} options={[{ value: "", label: "—" }, ...accounts.map((a) => ({ value: a.name, label: a.name }))]} /></Field>
          </div>
        </FormSection>
      ) : (
        <FormSection title="Party" description="The customer/supplier/employee this account belongs to.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Party type" htmlFor="party_type"><SelectInput id="party_type" name="party_type" defaultValue={initial?.partyType ?? ""} options={PARTY_TYPES} /></Field>
            <Field label="Party" htmlFor="party"><TextInput id="party" name="party" defaultValue={initial?.party ?? ""} placeholder="Party ID" /></Field>
          </div>
        </FormSection>
      )}

      <div className="flex items-center justify-between">
        {mode === "edit" && name && <DelBtn name={name} />}
        <div className="ml-auto flex items-center gap-2">
          <Link href={"/accounting/banking/accounts" as Route} className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40">Cancel</Link>
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
      <Save className="h-4 w-4" /> {pending ? "Saving…" : mode === "create" ? "Save account" : "Save changes"}
    </button>
  );
}

function DelBtn({ name }: { name: string }) {
  const onSubmit = async () => { await deleteBankAccountAction(name); };
  return (
    <form action={onSubmit}>
      <button type="submit" className="inline-flex items-center gap-1.5 rounded-chip border border-destructive/30 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10" onClick={(e) => { if (!confirm(`Delete "${name}"?`)) e.preventDefault(); }}>
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
    </form>
  );
}

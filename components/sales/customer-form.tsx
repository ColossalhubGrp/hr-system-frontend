"use client";

import Link from "next/link";
import type { Route } from "next";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save, Trash2 } from "lucide-react";
import { Field, FormSection, SelectInput, TextInput } from "@/components/employee/form-bits";
import { CreatableSelect } from "@/components/common/creatable-select";
import {
  createCustomerAction,
  updateCustomerAction,
  deleteCustomerAction,
  type FormState,
} from "@/app/(workspace)/sales/customers/actions";
import type { CustomerDetail } from "@/lib/frappe/sales/customer";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};

export function CustomerForm({
  mode,
  name,
  customerGroups,
  territories,
  currencies,
  paymentTerms,
  industries,
  marketSegments,
  languages,
  priceLists,
  taxCategories,
  initial,
}: {
  mode: "create" | "edit";
  name?: string;
  customerGroups: string[];
  territories: string[];
  currencies: string[];
  paymentTerms: string[];
  industries: string[];
  marketSegments: string[];
  languages: string[];
  priceLists: string[];
  taxCategories: string[];
  initial?: CustomerDetail;
}) {
  const action = mode === "create" ? createCustomerAction : updateCustomerAction.bind(null, name ?? "");
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
      <FormSection title="Basics" description="Who the customer is + how they get grouped for reporting.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Customer name" htmlFor="customer_name" error={fe.customer_name} required>
            <TextInput id="customer_name" name="customer_name" defaultValue={initial?.customerName ?? ""} placeholder="Legal name / trading name" />
          </Field>
          <Field label="Kind" htmlFor="customer_type" required>
            <SelectInput id="customer_type" name="customer_type" defaultValue={initial?.customerType ?? "Company"} options={["Company", "Individual"]} />
          </Field>
          <Field label="Group" htmlFor="customer_group">
            <SelectInput
              id="customer_group"
              name="customer_group"
              defaultValue={initial?.customerGroup ?? ""}
              options={[...customerGroups.map((g) => ({ value: g, label: g }))]}
            />
          </Field>
          <Field label="Territory" htmlFor="territory">
            <SelectInput
              id="territory"
              name="territory"
              defaultValue={initial?.territory ?? ""}
              options={[...territories.map((t) => ({ value: t, label: t }))]}
            />
          </Field>
          <Field label="Industry" htmlFor="industry">
            <CreatableSelect id="industry" name="industry" kind="industry" defaultValue={initial?.industry ?? ""} options={industries} />
          </Field>
          <Field label="Market segment" htmlFor="market_segment">
            <CreatableSelect id="market_segment" name="market_segment" kind="market-segment" defaultValue={initial?.marketSegment ?? ""} options={marketSegments} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Billing" description="Currency, tax and payment defaults that flow onto new sales invoices.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Default currency" htmlFor="default_currency">
            <SelectInput
              id="default_currency"
              name="default_currency"
              defaultValue={initial?.defaultCurrency ?? ""}
              options={[...currencies.map((c) => ({ value: c, label: c }))]}
            />
          </Field>
          <Field label="Default price list" htmlFor="default_price_list">
            <CreatableSelect id="default_price_list" name="default_price_list" kind="price-list" defaultValue={initial?.defaultPriceList ?? ""} options={priceLists} />
          </Field>
          <Field label="Tax ID" htmlFor="tax_id">
            <TextInput id="tax_id" name="tax_id" defaultValue={initial?.taxId ?? ""} placeholder="e.g. ZIMRA BP" />
          </Field>
          <Field label="Tax category" htmlFor="tax_category">
            <CreatableSelect id="tax_category" name="tax_category" kind="tax-category" defaultValue={initial?.taxCategory ?? ""} options={taxCategories} />
          </Field>
          <Field label="Payment terms" htmlFor="payment_terms">
            <CreatableSelect id="payment_terms" name="payment_terms" kind="payment-terms-template" defaultValue={initial?.paymentTerms ?? ""} options={paymentTerms} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Contact" description="Reachable-at details for the primary contact.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Website" htmlFor="website">
            <TextInput id="website" name="website" defaultValue={initial?.websiteUrl ?? ""} placeholder="https://…" />
          </Field>
          <Field label="Language" htmlFor="language">
            <CreatableSelect id="language" name="language" kind="language" defaultValue={initial?.language ?? ""} options={languages} />
          </Field>
        </div>
      </FormSection>

      <div className="flex items-center justify-between">
        {mode === "edit" && name && <DelBtn name={name} />}
        <div className="ml-auto flex items-center gap-2">
          <Link href={"/sales/customers" as Route} className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40">Cancel</Link>
          <SubBtn mode={mode} />
        </div>
      </div>
    </form>
  );
}

function SubBtn({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn("inline-flex h-10 items-center gap-1.5 rounded-chip px-4 text-sm font-semibold text-white transition focus-ring", pending ? "bg-muted-foreground cursor-not-allowed" : "bg-ink-800 hover:bg-ink-700")}
    >
      <Save className="h-4 w-4" />
      {pending ? "Saving…" : mode === "create" ? "Save customer" : "Save changes"}
    </button>
  );
}

function DelBtn({ name }: { name: string }) {
  const onSubmit = async () => { await deleteCustomerAction(name); };
  return (
    <form action={onSubmit}>
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 rounded-chip border border-destructive/30 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10"
        onClick={(e) => { if (!confirm(`Delete "${name}"? Refused if there are any invoices or receipts against them.`)) e.preventDefault(); }}
      >
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
    </form>
  );
}

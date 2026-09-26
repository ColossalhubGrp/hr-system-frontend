"use client";

import Link from "next/link";
import type { Route } from "next";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save, Trash2 } from "lucide-react";
import { Field, FormSection, SelectInput, TextInput } from "@/components/employee/form-bits";
import {
  createSupplierAction,
  updateSupplierAction,
  deleteSupplierAction,
  type FormState,
} from "@/app/(workspace)/buying/suppliers/actions";
import { HOLD_TYPES } from "@/lib/frappe/buying/supplier-constants";
import type { SupplierDetail } from "@/lib/frappe/buying/supplier";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};

export function SupplierForm({
  mode,
  name,
  supplierGroups,
  countries,
  currencies,
  paymentTerms,
  languages,
  priceLists,
  taxCategories,
  initial,
}: {
  mode: "create" | "edit";
  name?: string;
  supplierGroups: string[];
  countries: string[];
  currencies: string[];
  paymentTerms: string[];
  languages: string[];
  priceLists: string[];
  taxCategories: string[];
  initial?: SupplierDetail;
}) {
  const action = mode === "create" ? createSupplierAction : updateSupplierAction.bind(null, name ?? "");
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
      <FormSection title="Basics" description="Who the supplier is + how they get grouped for reporting.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Supplier name" htmlFor="supplier_name" error={fe.supplier_name} required>
            <TextInput id="supplier_name" name="supplier_name" defaultValue={initial?.supplierName ?? ""} placeholder="Legal name / trading name" />
          </Field>
          <Field label="Kind" htmlFor="supplier_type" required>
            <SelectInput id="supplier_type" name="supplier_type" defaultValue={initial?.supplierType ?? "Company"} options={["Company", "Individual"]} />
          </Field>
          <Field label="Group" htmlFor="supplier_group">
            <SelectInput
              id="supplier_group"
              name="supplier_group"
              defaultValue={initial?.supplierGroup ?? ""}
              options={[{ value: "", label: "—" }, ...supplierGroups.map((g) => ({ value: g, label: g }))]}
            />
          </Field>
          <Field label="Country" htmlFor="country">
            <SelectInput
              id="country"
              name="country"
              defaultValue={initial?.country ?? ""}
              options={[{ value: "", label: "—" }, ...countries.map((c) => ({ value: c, label: c }))]}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Billing" description="Currency, tax and payment defaults that flow onto new purchase invoices.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Default currency" htmlFor="default_currency">
            <SelectInput
              id="default_currency"
              name="default_currency"
              defaultValue={initial?.defaultCurrency ?? ""}
              options={[{ value: "", label: "—" }, ...currencies.map((c) => ({ value: c, label: c }))]}
            />
          </Field>
          <Field label="Default price list" htmlFor="default_price_list">
            <SelectInput
              id="default_price_list"
              name="default_price_list"
              defaultValue={initial?.defaultPriceList ?? ""}
              options={[{ value: "", label: "—" }, ...priceLists.map((p) => ({ value: p, label: p }))]}
            />
          </Field>
          <Field label="Tax ID" htmlFor="tax_id">
            <TextInput id="tax_id" name="tax_id" defaultValue={initial?.taxId ?? ""} placeholder="e.g. ZIMRA BP" />
          </Field>
          <Field label="Tax category" htmlFor="tax_category">
            <SelectInput
              id="tax_category"
              name="tax_category"
              defaultValue={initial?.taxCategory ?? ""}
              options={[{ value: "", label: "—" }, ...taxCategories.map((c) => ({ value: c, label: c }))]}
            />
          </Field>
          <Field label="Payment terms" htmlFor="payment_terms">
            <SelectInput
              id="payment_terms"
              name="payment_terms"
              defaultValue={initial?.paymentTerms ?? ""}
              options={[{ value: "", label: "—" }, ...paymentTerms.map((t) => ({ value: t, label: t }))]}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Hold" description="Optionally block new bills, new payments or both against this supplier — e.g. while resolving a dispute.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Hold type" htmlFor="hold_type">
            <SelectInput
              id="hold_type"
              name="hold_type"
              defaultValue={initial?.holdType ?? ""}
              options={[...HOLD_TYPES].map((v) => ({ value: v, label: v || "None" }))}
            />
          </Field>
          <Field label="Release on" htmlFor="release_date">
            <TextInput id="release_date" name="release_date" type="date" defaultValue={initial?.releaseDate ?? ""} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Contact" description="Reachable-at details.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Website" htmlFor="website">
            <TextInput id="website" name="website" defaultValue={initial?.websiteUrl ?? ""} placeholder="https://…" />
          </Field>
          <Field label="Language" htmlFor="language">
            <SelectInput
              id="language"
              name="language"
              defaultValue={initial?.language ?? ""}
              options={[{ value: "", label: "—" }, ...languages.map((l) => ({ value: l, label: l }))]}
            />
          </Field>
        </div>
      </FormSection>

      <div className="flex items-center justify-between">
        {mode === "edit" && name && <DelBtn name={name} />}
        <div className="ml-auto flex items-center gap-2">
          <Link href={"/buying/suppliers" as Route} className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40">Cancel</Link>
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
      {pending ? "Saving…" : mode === "create" ? "Save supplier" : "Save changes"}
    </button>
  );
}

function DelBtn({ name }: { name: string }) {
  const onSubmit = async () => { await deleteSupplierAction(name); };
  return (
    <form action={onSubmit}>
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 rounded-chip border border-destructive/30 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10"
        onClick={(e) => { if (!confirm(`Delete "${name}"? Refused if there are any bills or payments against them.`)) e.preventDefault(); }}
      >
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
    </form>
  );
}

"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save, Trash2 } from "lucide-react";
import { Field, FormSection, SelectInput, TextInput } from "@/components/employee/form-bits";
import {
  createTaxRuleAction,
  updateTaxRuleAction,
  deleteTaxRuleAction,
  type FormState,
} from "@/app/(workspace)/accounting/tax/rules/actions";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};

type Initial = {
  taxType: string;
  taxCategory: string | null;
  salesTaxTemplate: string | null;
  purchaseTaxTemplate: string | null;
  customer: string | null;
  supplier: string | null;
  customerGroup: string | null;
  supplierGroup: string | null;
  item: string | null;
  itemGroup: string | null;
  priority: number;
  useForShoppingCart: boolean;
  fromDate: string | null;
  toDate: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingCountry: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingCountry: string | null;
};

export function TaxRuleForm({
  mode,
  name,
  salesTemplates,
  purchaseTemplates,
  categories,
  initial,
}: {
  mode: "create" | "edit";
  name?: string;
  salesTemplates: string[];
  purchaseTemplates: string[];
  categories: string[];
  initial?: Initial;
}) {
  const action = mode === "create" ? createTaxRuleAction : updateTaxRuleAction.bind(null, name ?? "");
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};
  const [taxType, setTaxType] = useState(initial?.taxType ?? "Sales");

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{state.error}</div>
        </div>
      )}
      <FormSection title="Rule" description="Pick the tax type + the template it should choose when the filters below match.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Tax type" htmlFor="tax_type" error={fe.tax_type} required>
            <SelectInput id="tax_type" name="tax_type" value={taxType} options={["Sales", "Purchase"]} onChange={(e) => setTaxType(e.target.value)} />
          </Field>
          <Field label="Tax category" htmlFor="tax_category">
            <SelectInput id="tax_category" name="tax_category" defaultValue={initial?.taxCategory ?? ""} options={[{ value: "", label: "Any" }, ...categories.map((c) => ({ value: c, label: c }))]} />
          </Field>
          <Field label="Priority" htmlFor="priority">
            <TextInput id="priority" name="priority" type="number" min="0" defaultValue={String(initial?.priority ?? 1)} className="tabular-nums" />
          </Field>
          {taxType === "Sales" ? (
            <Field label="Sales tax template" htmlFor="sales_tax_template" required>
              <SelectInput id="sales_tax_template" name="sales_tax_template" defaultValue={initial?.salesTaxTemplate ?? ""} options={[{ value: "", label: "—" }, ...salesTemplates.map((c) => ({ value: c, label: c }))]} />
            </Field>
          ) : (
            <Field label="Purchase tax template" htmlFor="purchase_tax_template" required>
              <SelectInput id="purchase_tax_template" name="purchase_tax_template" defaultValue={initial?.purchaseTaxTemplate ?? ""} options={[{ value: "", label: "—" }, ...purchaseTemplates.map((c) => ({ value: c, label: c }))]} />
            </Field>
          )}
          <Field label="Shopping cart" htmlFor="use_for_shopping_cart">
            <label className="flex items-center gap-2 text-sm">
              <input id="use_for_shopping_cart" type="checkbox" name="use_for_shopping_cart" defaultChecked={initial?.useForShoppingCart ?? false} className="h-4 w-4" />
              <span className="text-muted-foreground">Use for online shopping cart.</span>
            </label>
          </Field>
        </div>
      </FormSection>

      <FormSection title="Party filters" description="Which parties this rule applies to. Leave any blank to match everything.">
        <div className="grid gap-4 sm:grid-cols-2">
          {taxType === "Sales" ? (
            <>
              <Field label="Customer" htmlFor="customer"><TextInput id="customer" name="customer" defaultValue={initial?.customer ?? ""} placeholder="Specific customer" /></Field>
              <Field label="Customer group" htmlFor="customer_group"><TextInput id="customer_group" name="customer_group" defaultValue={initial?.customerGroup ?? ""} /></Field>
            </>
          ) : (
            <>
              <Field label="Supplier" htmlFor="supplier"><TextInput id="supplier" name="supplier" defaultValue={initial?.supplier ?? ""} placeholder="Specific supplier" /></Field>
              <Field label="Supplier group" htmlFor="supplier_group"><TextInput id="supplier_group" name="supplier_group" defaultValue={initial?.supplierGroup ?? ""} /></Field>
            </>
          )}
          <Field label="Item" htmlFor="item"><TextInput id="item" name="item" defaultValue={initial?.item ?? ""} /></Field>
          <Field label="Item group" htmlFor="item_group"><TextInput id="item_group" name="item_group" defaultValue={initial?.itemGroup ?? ""} /></Field>
        </div>
      </FormSection>

      <FormSection title="Validity" description="Optional date window this rule is active.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="From date" htmlFor="from_date"><TextInput id="from_date" name="from_date" type="date" defaultValue={initial?.fromDate ?? ""} /></Field>
          <Field label="To date" htmlFor="to_date"><TextInput id="to_date" name="to_date" type="date" defaultValue={initial?.toDate ?? ""} /></Field>
        </div>
      </FormSection>

      <FormSection title="Address filters" description="Geographic filters — leave blank to match anywhere.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Billing city" htmlFor="billing_city"><TextInput id="billing_city" name="billing_city" defaultValue={initial?.billingCity ?? ""} /></Field>
          <Field label="Billing state" htmlFor="billing_state"><TextInput id="billing_state" name="billing_state" defaultValue={initial?.billingState ?? ""} /></Field>
          <Field label="Billing country" htmlFor="billing_country"><TextInput id="billing_country" name="billing_country" defaultValue={initial?.billingCountry ?? ""} /></Field>
          <Field label="Shipping city" htmlFor="shipping_city"><TextInput id="shipping_city" name="shipping_city" defaultValue={initial?.shippingCity ?? ""} /></Field>
          <Field label="Shipping state" htmlFor="shipping_state"><TextInput id="shipping_state" name="shipping_state" defaultValue={initial?.shippingState ?? ""} /></Field>
          <Field label="Shipping country" htmlFor="shipping_country"><TextInput id="shipping_country" name="shipping_country" defaultValue={initial?.shippingCountry ?? ""} /></Field>
        </div>
      </FormSection>

      <div className="flex items-center justify-between">
        {mode === "edit" && name && <DelBtn name={name} />}
        <div className="ml-auto flex items-center gap-2">
          <Link href={"/accounting/tax/rules" as Route} className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40">Cancel</Link>
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
      <Save className="h-4 w-4" /> {pending ? "Saving…" : mode === "create" ? "Save rule" : "Save changes"}
    </button>
  );
}

function DelBtn({ name }: { name: string }) {
  const onSubmit = async () => { await deleteTaxRuleAction(name); };
  return (
    <form action={onSubmit}>
      <button type="submit" className="inline-flex items-center gap-1.5 rounded-chip border border-destructive/30 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10" onClick={(e) => { if (!confirm(`Delete rule "${name}"?`)) e.preventDefault(); }}>
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
    </form>
  );
}

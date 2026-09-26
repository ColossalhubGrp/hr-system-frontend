"use client";

import Link from "next/link";
import type { Route } from "next";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save, Trash2 } from "lucide-react";
import { Field, FormSection, SelectInput, TextInput } from "@/components/employee/form-bits";
import {
  createPlanAction,
  updatePlanAction,
  deletePlanAction,
  type FormState,
} from "@/app/(workspace)/accounting/subscriptions/plans/actions";
import type { SubscriptionPlan } from "@/lib/frappe/subscriptions/plan";
import { INTERVALS, PRICE_MODES } from "@/lib/frappe/subscriptions/plan-constants";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};

export function SubscriptionPlanForm({
  mode,
  name,
  currencies,
  initial,
}: {
  mode: "create" | "edit";
  name?: string;
  currencies: string[];
  initial?: SubscriptionPlan;
}) {
  const action = mode === "create" ? createPlanAction : updatePlanAction.bind(null, name ?? "");
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
      <FormSection title="Plan" description="What the plan is worth per interval + how it's priced.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Plan name" htmlFor="plan_name" error={fe.plan_name} required>
            <TextInput id="plan_name" name="plan_name" defaultValue={initial?.planName ?? ""} placeholder="e.g. Premium Monthly" />
          </Field>
          <Field label="Item (optional)" htmlFor="item">
            <TextInput id="item" name="item" defaultValue={initial?.item ?? ""} placeholder="Item code" />
          </Field>
          <Field label="Pricing mode" htmlFor="price_determination" error={fe.price_determination} required>
            <SelectInput id="price_determination" name="price_determination" defaultValue={initial?.priceDetermination ?? "Fixed Rate"} options={[...PRICE_MODES]} />
          </Field>
          <Field label="Cost" htmlFor="cost" error={fe.cost}>
            <TextInput id="cost" name="cost" type="number" step="0.01" min="0" defaultValue={String(initial?.cost ?? 0)} className="tabular-nums" />
          </Field>
          <Field label="Currency" htmlFor="currency" error={fe.currency} required>
            <SelectInput id="currency" name="currency" defaultValue={initial?.currency ?? "USD"} options={currencies} />
          </Field>
          <Field label="Billing every" htmlFor="billing_interval_count">
            <div className="flex gap-2">
              <TextInput id="billing_interval_count" name="billing_interval_count" type="number" min="1" defaultValue={String(initial?.billingIntervalCount ?? 1)} className="w-20 tabular-nums" />
              <SelectInput id="billing_interval" name="billing_interval" defaultValue={initial?.billingInterval ?? "Month"} options={[...INTERVALS]} />
            </div>
          </Field>
        </div>
      </FormSection>
      <div className="flex items-center justify-between">
        {mode === "edit" && name && <DelBtn name={name} />}
        <div className="ml-auto flex items-center gap-2">
          <Link href={"/accounting/subscriptions/plans" as Route} className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40">Cancel</Link>
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
      <Save className="h-4 w-4" /> {pending ? "Saving…" : mode === "create" ? "Save plan" : "Save changes"}
    </button>
  );
}

function DelBtn({ name }: { name: string }) {
  const onSubmit = async () => { await deletePlanAction(name); };
  return (
    <form action={onSubmit}>
      <button type="submit" className="inline-flex items-center gap-1.5 rounded-chip border border-destructive/30 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10" onClick={(e) => { if (!confirm(`Delete "${name}"?`)) e.preventDefault(); }}>
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
    </form>
  );
}

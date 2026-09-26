"use client";

import Link from "next/link";
import type { Route } from "next";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Save } from "lucide-react";
import { Field, FormSection, TextInput } from "@/components/employee/form-bits";
import { saveSubSettingsAction, type FormState } from "@/app/(workspace)/accounting/subscriptions/settings/actions";
import type { SubscriptionSettings } from "@/lib/frappe/subscriptions/settings";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};

export function SubscriptionSettingsForm({ initial }: { initial: SubscriptionSettings }) {
  const [state, dispatch] = useFormState(saveSubSettingsAction, EMPTY);
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
          <div>Settings saved.</div>
        </div>
      )}
      <FormSection title="Grace + billing" description="What the scheduler does after a subscription bills.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Grace period (days)" htmlFor="grace_period">
            <TextInput id="grace_period" name="grace_period" type="number" min="0" defaultValue={String(initial.gracePeriod)} className="tabular-nums" />
          </Field>
          <Field label="Cancel after grace" htmlFor="cancel_after_grace">
            <label className="flex items-center gap-2 text-sm">
              <input id="cancel_after_grace" type="checkbox" name="cancel_after_grace" defaultChecked={initial.cancelAfterGrace} className="h-4 w-4" />
              <span className="text-muted-foreground">Auto-cancel unpaid subscriptions once grace lapses.</span>
            </label>
          </Field>
          <Field label="Prorate" htmlFor="prorate">
            <label className="flex items-center gap-2 text-sm">
              <input id="prorate" type="checkbox" name="prorate" defaultChecked={initial.prorate} className="h-4 w-4" />
              <span className="text-muted-foreground">Prorate first invoice to the billing cycle.</span>
            </label>
          </Field>
        </div>
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
      {pending ? "Saving…" : "Save settings"}
    </button>
  );
}

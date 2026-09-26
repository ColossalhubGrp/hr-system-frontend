"use client";

import Link from "next/link";
import type { Route } from "next";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Save } from "lucide-react";
import { Field, FormSection, SelectInput, TextInput } from "@/components/employee/form-bits";
import { savePlaidAction, type FormState } from "@/app/(workspace)/accounting/banking/plaid/actions";
import type { PlaidSettings } from "@/lib/frappe/banking/plaid-settings";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};

export function PlaidForm({ initial }: { initial: PlaidSettings }) {
  const [state, dispatch] = useFormState(savePlaidAction, EMPTY);
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
      <FormSection title="Plaid" description="Plaid links external US bank accounts. Sandbox is safe for testing; production hits real banks.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Enabled" htmlFor="enabled">
            <label className="flex items-center gap-2 text-sm">
              <input id="enabled" type="checkbox" name="enabled" defaultChecked={initial.enabled} className="h-4 w-4" />
              <span className="text-muted-foreground">Turn on Plaid link-account button in Bank Account.</span>
            </label>
          </Field>
          <Field label="Environment" htmlFor="plaid_env" required>
            <SelectInput id="plaid_env" name="plaid_env" defaultValue={initial.plaidEnv ?? "sandbox"} options={["sandbox", "development", "production"]} />
          </Field>
          <Field label="Client ID" htmlFor="plaid_client_id">
            <TextInput id="plaid_client_id" name="plaid_client_id" defaultValue={initial.plaidClientId ?? ""} placeholder="From Plaid dashboard" />
          </Field>
          <Field label="Secret" htmlFor="plaid_secret">
            <TextInput id="plaid_secret" name="plaid_secret" type="password" defaultValue={initial.plaidSecret ?? ""} placeholder="Env-specific secret" />
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
      <Save className="h-4 w-4" /> {pending ? "Saving…" : "Save settings"}
    </button>
  );
}

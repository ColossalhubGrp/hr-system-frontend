"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Save } from "lucide-react";
import { Field, FormSection, TextInput } from "@/components/employee/form-bits";
import {
  saveFiscalisationSettingsAction,
  type FormState,
} from "@/app/(workspace)/accounting/masters/fiscalisation/actions";
import type { FiscalisationSettings } from "@/lib/frappe/fiscalisation";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};

export function FiscalisationSettingsForm({ initial }: { initial: FiscalisationSettings }) {
  const [state, dispatch] = useFormState(saveFiscalisationSettingsAction, EMPTY);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{state.error}</div>
        </div>
      )}
      {state.saved && !state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-rise/30 bg-rise/5 p-3 text-sm text-rise">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <div>Settings saved.</div>
        </div>
      )}

      <FormSection
        title="ZIMRA Fiscalisation"
        description="When switched on, every submitted Sales Invoice is reported to ZIMRA automatically and gets its fiscal receipt and QR code. Cancelling an invoice sends a credit note."
      >
        <div className="flex flex-col gap-4">
          <label className="flex w-max cursor-pointer items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={initial.enabled}
              className="h-4 w-4 rounded border-input"
            />
            Send invoices to ZIMRA
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Fiscal service address"
              htmlFor="sidecar_url"
              error={fe.sidecar_url}
              hint="Where the fiscal service runs. Leave as-is unless it was moved."
              required
            >
              <TextInput
                id="sidecar_url"
                name="sidecar_url"
                defaultValue={initial.sidecarUrl}
                placeholder="http://127.0.0.1:5007"
              />
            </Field>
            <Field
              label="Default ZIMRA tax ID"
              htmlFor="default_tax_id"
              error={fe.default_tax_id}
              hint="Used for invoices that have no tax template (usually the exempt code)."
            >
              <TextInput
                id="default_tax_id"
                name="default_tax_id"
                type="number"
                min="1"
                step="1"
                defaultValue={initial.defaultTaxId != null ? String(initial.defaultTaxId) : ""}
                className="tabular-nums"
              />
            </Field>
            <Field
              label="Default tax rate %"
              htmlFor="default_tax_percent"
              error={fe.default_tax_percent}
              hint="Leave empty for exempt; enter 0 for zero-rated."
            >
              <TextInput
                id="default_tax_percent"
                name="default_tax_percent"
                defaultValue={initial.defaultTaxPercent}
                placeholder="Empty = exempt"
                className="tabular-nums"
              />
            </Field>
          </div>
        </div>
      </FormSection>

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-chip px-4 text-sm font-semibold text-white transition focus-ring",
        pending ? "bg-muted-foreground cursor-not-allowed" : "bg-ink-800 hover:bg-ink-700",
      )}
    >
      <Save className="h-4 w-4" />
      {pending ? "Saving…" : "Save settings"}
    </button>
  );
}

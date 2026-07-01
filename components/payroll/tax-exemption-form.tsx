"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Field,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/employee/form-bits";
import {
  createTaxExemptionAction,
  type FormState,
} from "@/app/(workspace)/payroll/actions";

const EMPTY: FormState = {};

export function TaxExemptionForm() {
  const [state, dispatch] = useFormState(createTaxExemptionAction, EMPTY);
  const [scope, setScope] = useState<"COMPANY" | "EMPLOYEE">("COMPANY");
  const fe = state.fieldErrors ?? {};
  return (
    <form action={dispatch} className="flex flex-col gap-4">
      {state.error && (
        <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/[0.06] px-3 py-2 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
          {state.error}
        </p>
      )}

      <Field label="Scope" htmlFor="scope" required error={fe.scope}>
        <SelectInput
          id="scope"
          name="scope"
          options={["COMPANY", "EMPLOYEE"]}
          defaultValue="COMPANY"
          onChange={(e) => setScope(e.target.value as "COMPANY" | "EMPLOYEE")}
        />
      </Field>

      {scope === "EMPLOYEE" && (
        <Field label="Employee" htmlFor="employee" required error={fe.employee} wide>
          <TextInput
            id="employee"
            name="employee"
            invalid={Boolean(fe.employee)}
            placeholder="HR-EMP-00001"
          />
        </Field>
      )}

      <Field
        label="Tax type"
        htmlFor="tax_type"
        required
        error={fe.tax_type}
        wide
        hint="Stable code — FUTA, SUTA, FICA, FED_INCOME_US, PAYE_ZW, etc."
      >
        <TextInput id="tax_type" name="tax_type" invalid={Boolean(fe.tax_type)} />
      </Field>

      <Field label="Reason" htmlFor="reason" required error={fe.reason} wide>
        <TextArea id="reason" name="reason" rows={2} invalid={Boolean(fe.reason)} />
      </Field>

      <Field label="Valid from" htmlFor="valid_from" error={fe.valid_from}>
        <TextInput id="valid_from" name="valid_from" type="date" />
      </Field>

      <Field label="Valid until" htmlFor="valid_until" error={fe.valid_until}>
        <TextInput id="valid_until" name="valid_until" type="date" />
      </Field>

      <Submit />
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      <Save className="h-4 w-4" />
      {pending ? "Saving…" : "Add exemption"}
    </Button>
  );
}

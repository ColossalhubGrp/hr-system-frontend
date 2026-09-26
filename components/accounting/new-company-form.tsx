"use client";

import Link from "next/link";
import type { Route } from "next";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save } from "lucide-react";
import { Field, FormSection, SelectInput, TextInput } from "@/components/employee/form-bits";
import { createCompanyMasterAction, type FormState } from "@/app/(workspace)/accounting/masters/companies/actions";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};

const CHART_TEMPLATES = ["Standard", "Standard with Numbers", "Standard with Sections"];

export function NewCompanyForm({ currencies, countries }: { currencies: string[]; countries: string[] }) {
  const [state, dispatch] = useFormState(createCompanyMasterAction, EMPTY);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{state.error}</div>
        </div>
      )}
      <FormSection title="Identity" description="Who this company is on paper.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name" htmlFor="company_name" error={fe.company_name} required>
            <TextInput id="company_name" name="company_name" placeholder="e.g. Colossal Hub (Pvt) Ltd" />
          </Field>
          <Field label="Abbreviation" htmlFor="abbr" error={fe.abbr} required>
            <TextInput id="abbr" name="abbr" placeholder="e.g. CH" maxLength={5} />
          </Field>
          <Field label="Default currency" htmlFor="default_currency" error={fe.default_currency} required>
            <SelectInput id="default_currency" name="default_currency" defaultValue="USD" options={currencies} />
          </Field>
          <Field label="Country" htmlFor="country" error={fe.country} required>
            <SelectInput id="country" name="country" defaultValue="" options={[...countries.map((c) => ({ value: c, label: c }))]} />
          </Field>
          <Field label="Tax ID" htmlFor="tax_id">
            <TextInput id="tax_id" name="tax_id" placeholder="e.g. ZIMRA BP number" />
          </Field>
          <Field label="Domain" htmlFor="domain">
            <TextInput id="domain" name="domain" placeholder="e.g. Services, Manufacturing" />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Chart of Accounts" description="Which template to seed the CoA from on first save.">
        <Field label="Template" htmlFor="chart_of_accounts">
          <SelectInput id="chart_of_accounts" name="chart_of_accounts" defaultValue="Standard" options={CHART_TEMPLATES} />
        </Field>
      </FormSection>

      <div className="flex items-center justify-end gap-2">
        <Link href={"/accounting/masters/companies" as Route} className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40">Cancel</Link>
        <SubmitBtn />
      </div>
    </form>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={cn("inline-flex h-10 items-center gap-1.5 rounded-chip px-4 text-sm font-semibold text-white transition focus-ring", pending ? "bg-muted-foreground cursor-not-allowed" : "bg-ink-800 hover:bg-ink-700")}>
      <Save className="h-4 w-4" />
      {pending ? "Creating…" : "Create company"}
    </button>
  );
}

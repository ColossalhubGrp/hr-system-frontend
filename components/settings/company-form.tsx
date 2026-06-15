"use client";

import Link from "next/link";
import type { Route } from "next";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Save } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  Field,
  FormSection,
  SelectInput,
  TextInput,
} from "@/components/employee/form-bits";
import type { FormState } from "@/app/(workspace)/settings/company/actions";
import type { CompanyFull } from "@/lib/frappe/companies";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;
const EMPTY: FormState = {};

export function CompanyForm({
  mode,
  action,
  cancelHref,
  countries,
  currencies,
  holidayLists,
  initial,
}: {
  mode: "create" | "edit";
  action: Action;
  cancelHref: string;
  countries: string[];
  currencies: string[];
  holidayLists: string[];
  initial?: CompanyFull;
}) {
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};

  // Successful edit returns {} (no error, no fieldErrors).
  const justSaved =
    mode === "edit" && state && Object.keys(state).length === 0 && state !== EMPTY;

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {state.error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-card border border-fall/30 bg-fall/[0.06] px-4 py-3 text-sm text-fall"
        >
          <AlertCircle className="h-4 w-4" />
          {state.error}
        </p>
      )}
      {justSaved && (
        <p className="flex items-center gap-2 rounded-card border border-rise/30 bg-rise/[0.06] px-4 py-3 text-sm text-rise">
          <CheckCircle2 className="h-4 w-4" />
          Company saved.
        </p>
      )}

      <FormSection title="Identity">
        <Field
          label="Company name"
          htmlFor="company_name"
          required
          error={fe.company_name}
          wide
        >
          <TextInput
            id="company_name"
            name="company_name"
            defaultValue={initial?.companyName}
            invalid={Boolean(fe.company_name)}
          />
        </Field>
        <Field
          label="Abbreviation"
          htmlFor="abbr"
          required={mode === "create"}
          error={fe.abbr}
          hint={
            mode === "create"
              ? "Uppercase, 2–8 chars. Prefixes every auto-named child record — pick carefully, it can't change later."
              : "Read-only. Changing this would orphan every record auto-named under the old prefix."
          }
        >
          <TextInput
            id="abbr"
            name="abbr"
            defaultValue={initial?.abbr ?? ""}
            invalid={Boolean(fe.abbr)}
            readOnly={mode === "edit"}
            maxLength={8}
            placeholder="e.g. CHD"
          />
        </Field>
        <Field
          label="Country"
          htmlFor="country"
          required
          error={fe.country}
          hint="Drives Holiday List defaults and the country-level overtime rule cascade."
        >
          <SelectInput
            id="country"
            name="country"
            options={countries}
            defaultValue={initial?.country ?? "Zimbabwe"}
            placeholder="—"
          />
        </Field>
        <Field
          label="Default currency"
          htmlFor="default_currency"
          required
          error={fe.default_currency}
        >
          <SelectInput
            id="default_currency"
            name="default_currency"
            options={currencies}
            defaultValue={initial?.defaultCurrency ?? "USD"}
            placeholder="—"
          />
        </Field>
      </FormSection>

      <FormSection title="Calendar & contact">
        <Field
          label="Default holiday list"
          htmlFor="default_holiday_list"
          hint="Used by attendance + the overtime engine's public-holiday modifier."
        >
          <SelectInput
            id="default_holiday_list"
            name="default_holiday_list"
            options={holidayLists}
            defaultValue={initial?.defaultHolidayList ?? ""}
            placeholder="—"
          />
        </Field>
        <Field label="Tax ID" htmlFor="tax_id">
          <TextInput
            id="tax_id"
            name="tax_id"
            defaultValue={initial?.taxId ?? ""}
          />
        </Field>
        <Field
          label="Date of establishment"
          htmlFor="date_of_establishment"
          error={fe.date_of_establishment}
        >
          <TextInput
            id="date_of_establishment"
            name="date_of_establishment"
            type="date"
            defaultValue={initial?.dateOfEstablishment ?? ""}
          />
        </Field>
        <Field label="Phone" htmlFor="phone_no">
          <TextInput
            id="phone_no"
            name="phone_no"
            defaultValue={initial?.phoneNo ?? ""}
          />
        </Field>
      </FormSection>

      <SubmitRow cancelHref={cancelHref} mode={mode} />
    </form>
  );
}

function SubmitRow({
  cancelHref,
  mode,
}: {
  cancelHref: string;
  mode: "create" | "edit";
}) {
  return (
    <div className="sticky bottom-0 -mx-1 flex items-center justify-end gap-2 rounded-card border border-hairline bg-surface/95 p-3 shadow-rail backdrop-blur">
      <Link
        href={cancelHref as Route}
        className="inline-flex h-10 items-center justify-center rounded-chip px-4 text-sm font-medium text-ash-700 transition hover:bg-canvas focus-ring"
      >
        Cancel
      </Link>
      <Submit mode={mode} />
    </div>
  );
}

function Submit({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition focus-ring",
        "hover:bg-ink-700 disabled:opacity-60 disabled:cursor-not-allowed",
      )}
    >
      <Save className="h-4 w-4" />
      {pending
        ? mode === "create"
          ? "Creating…"
          : "Saving…"
        : mode === "create"
          ? "Create company"
          : "Save changes"}
    </button>
  );
}

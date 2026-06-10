"use client";

import Link from "next/link";
import type { Route } from "next";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Send } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  Field,
  FormSection,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/employee/form-bits";
import type { FormState } from "@/app/(workspace)/employee/lifecycle/actions";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;
const EMPTY: FormState = {};

const GRIEVANCE_AGAINST_TYPES = ["Employee", "Department", "Company"];

type Opts = {
  companies: string[];
  departments: string[];
  designations: string[];
  grades: string[];
  /** Optional pre-fill (e.g. when filing on behalf of a specific employee from
   *  their profile). */
  defaultEmployee?: string;
};

function ErrorBanner({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p
      role="alert"
      className="flex items-center gap-2 rounded-card border border-fall/30 bg-fall/[0.06] px-4 py-3 text-sm text-fall"
    >
      <AlertCircle className="h-4 w-4" />
      {msg}
    </p>
  );
}

function CancelLink({ href }: { href: string }) {
  return (
    <Link
      href={href as Route}
      className="h-10 inline-flex items-center justify-center rounded-chip px-4 text-sm font-medium text-ash-700 transition hover:bg-canvas focus-ring"
    >
      Cancel
    </Link>
  );
}

function SubmitBtn({ label }: { label: string }) {
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
      <Send className="h-4 w-4" />
      {pending ? "Saving…" : label}
    </button>
  );
}

function Bar({
  cancelHref,
  label,
}: {
  cancelHref: string;
  label: string;
}) {
  return (
    <div className="sticky bottom-0 -mx-1 flex items-center justify-end gap-2 rounded-card border border-hairline bg-surface/95 p-3 shadow-rail backdrop-blur">
      <CancelLink href={cancelHref} />
      <SubmitBtn label={label} />
    </div>
  );
}

// =================== Onboarding ===========================================

export function OnboardingForm({
  action,
  opts,
  cancelHref,
}: {
  action: Action;
  opts: Opts;
  cancelHref: string;
}) {
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={dispatch} className="flex flex-col gap-5">
      <ErrorBanner msg={state.error} />
      <FormSection title="Onboarding">
        <Field label="Employee" htmlFor="employee" required error={fe.employee}
               hint="Employee ID, e.g. HR-EMP-00292">
          <TextInput id="employee" name="employee" defaultValue={opts.defaultEmployee} invalid={Boolean(fe.employee)} />
        </Field>
        <Field label="Boarding begins" htmlFor="boarding_begins_on" required error={fe.boarding_begins_on}>
          <TextInput id="boarding_begins_on" name="boarding_begins_on" type="date" invalid={Boolean(fe.boarding_begins_on)} />
        </Field>
        <Field label="Company" htmlFor="company" required error={fe.company}>
          <SelectInput id="company" name="company" options={opts.companies} placeholder="Select company" invalid={Boolean(fe.company)} />
        </Field>
        <Field label="Department" htmlFor="department">
          <SelectInput id="department" name="department" options={opts.departments} placeholder="—" />
        </Field>
        <Field label="Designation" htmlFor="designation">
          <SelectInput id="designation" name="designation" options={opts.designations} placeholder="—" />
        </Field>
        <Field label="Grade" htmlFor="employee_grade">
          <SelectInput id="employee_grade" name="employee_grade" options={opts.grades} placeholder="—" />
        </Field>
      </FormSection>
      <Bar cancelHref={cancelHref} label="Create onboarding" />
    </form>
  );
}

// =================== Separation ===========================================

export function SeparationForm({
  action,
  opts,
  cancelHref,
}: {
  action: Action;
  opts: Opts;
  cancelHref: string;
}) {
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={dispatch} className="flex flex-col gap-5">
      <ErrorBanner msg={state.error} />
      <FormSection title="Separation">
        <Field label="Employee" htmlFor="employee" required error={fe.employee}
               hint="Employee ID who is leaving">
          <TextInput id="employee" name="employee" defaultValue={opts.defaultEmployee} invalid={Boolean(fe.employee)} />
        </Field>
        <Field label="Boarding begins" htmlFor="boarding_begins_on" required error={fe.boarding_begins_on}
               hint="Last working day kicks off the exit checklist.">
          <TextInput id="boarding_begins_on" name="boarding_begins_on" type="date" invalid={Boolean(fe.boarding_begins_on)} />
        </Field>
        <Field label="Company" htmlFor="company" required error={fe.company}>
          <SelectInput id="company" name="company" options={opts.companies} placeholder="Select company" invalid={Boolean(fe.company)} />
        </Field>
        <Field label="Department" htmlFor="department">
          <SelectInput id="department" name="department" options={opts.departments} placeholder="—" />
        </Field>
        <Field label="Designation" htmlFor="designation">
          <SelectInput id="designation" name="designation" options={opts.designations} placeholder="—" />
        </Field>
        <Field label="Resignation letter date" htmlFor="resignation_letter_date">
          <TextInput id="resignation_letter_date" name="resignation_letter_date" type="date" />
        </Field>
        <Field label="Exit interview summary" htmlFor="exit_interview_summary" wide>
          <TextArea id="exit_interview_summary" name="exit_interview_summary" rows={3} />
        </Field>
      </FormSection>
      <Bar cancelHref={cancelHref} label="Create separation" />
    </form>
  );
}

// =================== Transfer =============================================

export function TransferForm({
  action,
  opts,
  cancelHref,
}: {
  action: Action;
  opts: Opts;
  cancelHref: string;
}) {
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={dispatch} className="flex flex-col gap-5">
      <ErrorBanner msg={state.error} />
      <FormSection title="Transfer">
        <Field label="Employee" htmlFor="employee" required error={fe.employee}>
          <TextInput id="employee" name="employee" defaultValue={opts.defaultEmployee} invalid={Boolean(fe.employee)} />
        </Field>
        <Field label="Transfer date" htmlFor="transfer_date" required error={fe.transfer_date}>
          <TextInput id="transfer_date" name="transfer_date" type="date" invalid={Boolean(fe.transfer_date)} />
        </Field>
        <Field label="Current company" htmlFor="company" required error={fe.company}>
          <SelectInput id="company" name="company" options={opts.companies} placeholder="Select company" invalid={Boolean(fe.company)} />
        </Field>
        <Field label="New company" htmlFor="new_company"
               hint="Leave blank if the transfer stays within the same company.">
          <SelectInput id="new_company" name="new_company" options={opts.companies} placeholder="—" />
        </Field>
        <Field label="New department" htmlFor="new_department">
          <SelectInput id="new_department" name="new_department" options={opts.departments} placeholder="—" />
        </Field>
        <Field label="New designation" htmlFor="new_designation">
          <SelectInput id="new_designation" name="new_designation" options={opts.designations} placeholder="—" />
        </Field>
        <Field label="Reason" htmlFor="reason" wide>
          <TextArea id="reason" name="reason" rows={3} />
        </Field>
      </FormSection>
      <Bar cancelHref={cancelHref} label="Create transfer" />
    </form>
  );
}

// =================== Promotion ============================================

export function PromotionForm({
  action,
  opts,
  cancelHref,
}: {
  action: Action;
  opts: Opts;
  cancelHref: string;
}) {
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={dispatch} className="flex flex-col gap-5">
      <ErrorBanner msg={state.error} />
      <FormSection title="Promotion">
        <Field label="Employee" htmlFor="employee" required error={fe.employee}>
          <TextInput id="employee" name="employee" defaultValue={opts.defaultEmployee} invalid={Boolean(fe.employee)} />
        </Field>
        <Field label="Promotion date" htmlFor="promotion_date" required error={fe.promotion_date}>
          <TextInput id="promotion_date" name="promotion_date" type="date" invalid={Boolean(fe.promotion_date)} />
        </Field>
        <Field label="Company" htmlFor="company" required error={fe.company}>
          <SelectInput id="company" name="company" options={opts.companies} placeholder="Select company" invalid={Boolean(fe.company)} />
        </Field>
        <Field label="New designation" htmlFor="new_designation">
          <SelectInput id="new_designation" name="new_designation" options={opts.designations} placeholder="—" />
        </Field>
        <Field label="New grade" htmlFor="new_grade">
          <SelectInput id="new_grade" name="new_grade" options={opts.grades} placeholder="—" />
        </Field>
        <Field label="Reason" htmlFor="reason" wide>
          <TextArea id="reason" name="reason" rows={3} />
        </Field>
      </FormSection>
      <Bar cancelHref={cancelHref} label="Create promotion" />
    </form>
  );
}

// =================== Grievance ============================================

export function GrievanceForm({
  action,
  opts,
  cancelHref,
}: {
  action: Action;
  opts: Opts;
  cancelHref: string;
}) {
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={dispatch} className="flex flex-col gap-5">
      <ErrorBanner msg={state.error} />
      <FormSection title="Grievance">
        <Field label="Subject" htmlFor="subject" required error={fe.subject} wide
               hint="Short headline of the concern.">
          <TextInput id="subject" name="subject" invalid={Boolean(fe.subject)} />
        </Field>
        <Field label="Raised by" htmlFor="raised_by" required error={fe.raised_by}
               hint="Employee ID of who is raising it.">
          <TextInput id="raised_by" name="raised_by" defaultValue={opts.defaultEmployee} invalid={Boolean(fe.raised_by)} />
        </Field>
        <Field label="Date raised" htmlFor="grievance_raised_date">
          <TextInput id="grievance_raised_date" name="grievance_raised_date" type="date" />
        </Field>
        <Field label="Against" htmlFor="grievance_against_type" required error={fe.grievance_against_type}>
          <SelectInput id="grievance_against_type" name="grievance_against_type" options={GRIEVANCE_AGAINST_TYPES} defaultValue="Employee" invalid={Boolean(fe.grievance_against_type)} />
        </Field>
        <Field label="Target" htmlFor="grievance_against" required error={fe.grievance_against}
               hint="Employee ID, Department name, or Company name (matching the Against type).">
          <TextInput id="grievance_against" name="grievance_against" invalid={Boolean(fe.grievance_against)} />
        </Field>
        <Field label="Grievance type" htmlFor="grievance_type"
               hint="Free text — we'll auto-create if it's new.">
          <TextInput id="grievance_type" name="grievance_type" placeholder="e.g. Workplace Conduct" />
        </Field>
        <Field label="Cause" htmlFor="cause_of_grievance" wide>
          <TextArea id="cause_of_grievance" name="cause_of_grievance" rows={2} />
        </Field>
        <Field label="Description" htmlFor="description" wide>
          <TextArea id="description" name="description" rows={4} />
        </Field>
      </FormSection>
      <Bar cancelHref={cancelHref} label="File grievance" />
    </form>
  );
}

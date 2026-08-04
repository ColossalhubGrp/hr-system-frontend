"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useRef, useState } from "react";
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
import { toast } from "@/components/ui/sonner";
import type { FormState } from "@/app/(workspace)/employee/lifecycle/actions";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;
const EMPTY: FormState = {};

const GRIEVANCE_AGAINST_TYPES = ["Employee", "Department", "Company"];

type DirectoryEntry = {
  id: string;
  employee_name: string;
  user_id: string | null;
  department: string | null;
  designation: string | null;
  pay_grade: string | null;
  company: string | null;
};

type Opts = {
  companies: string[];
  departments: string[];
  designations: string[];
  /** Pay grades from Setup → Pay Grades (Payroll Pay Grade). After
   *  patch 30, Employee Onboarding.employee_grade and Employee
   *  Promotion.new_grade both accept these values too. */
  payGrades: string[];
  /** Active employees in the tenant — feeds the Employee / Raised-by
   *  dropdowns so HR picks instead of memorising IDs. */
  employeeDirectory: DirectoryEntry[];
  /** Existing Grievance Type records for the Grievance form's type
   *  picker — free-text used to be allowed but the backend rejects
   *  unknown values with "Could not find Grievance Type: X". */
  grievanceTypes: string[];
  /** Optional pre-fill (e.g. when filing on behalf of a specific employee from
   *  their profile). */
  defaultEmployee?: string;
};

/** SelectInput-shaped options for the employee directory. Falls back to a
 *  raw-ID entry when a saved / pre-filled value isn't in the directory
 *  (e.g. Inactive employee) so the field doesn't render blank on load. */
function employeeOptions(
  dir: DirectoryEntry[],
  ensureValue?: string,
): Array<{ value: string; label: string }> {
  const opts = dir.map((e) => ({
    value: e.id,
    label: `${e.employee_name} (${e.id})`,
  }));
  if (ensureValue && !opts.some((o) => o.value === ensureValue)) {
    return [{ value: ensureValue, label: ensureValue }, ...opts];
  }
  return opts;
}

/** Employee-picked fields pattern for Onboarding + Separation. Selecting
 *  an employee snaps department / designation / grade to that employee's
 *  current values so HR doesn't re-key data already on the record; the
 *  user can still override any of the three afterwards (typical case is
 *  the same values, but a mid-year transfer or promotion in flight could
 *  legitimately differ). Only overwrites when the picked employee has a
 *  real value for the field — a null on the record leaves the current
 *  selection alone so a manual choice isn't wiped by an incomplete
 *  record. */
function useEmployeeAutofill(opts: Opts) {
  const [selected, setSelected] = useState<string>(opts.defaultEmployee ?? "");
  const [department, setDepartment] = useState<string>("");
  const [designation, setDesignation] = useState<string>("");
  const [grade, setGrade] = useState<string>("");

  useEffect(() => {
    if (!selected) return;
    const e = opts.employeeDirectory.find((x) => x.id === selected);
    if (!e) return;
    if (e.department) setDepartment(e.department);
    if (e.designation) setDesignation(e.designation);
    if (e.pay_grade) setGrade(e.pay_grade);
  }, [selected, opts.employeeDirectory]);

  return {
    selected,
    setSelected,
    department,
    setDepartment,
    designation,
    setDesignation,
    grade,
    setGrade,
  };
}

/** Toast on error state transitions. Success paths in every lifecycle
 *  action redirect() to the detail page, so no success toast fires here
 *  — the URL change is the feedback. */
function useErrorToast(state: FormState) {
  const last = useRef(state);
  useEffect(() => {
    if (state === last.current) return;
    last.current = state;
    if (state.error) {
      toast.error(state.error, {
        description: state.fieldErrors
          ? "Check the highlighted fields."
          : undefined,
      });
    }
  }, [state]);
}

/** Company picker that auto-picks + hides itself when the tenant has
 *  exactly one company. Keeps the field mounted as a hidden input so
 *  the FormData still carries the value. */
function CompanyField({
  companies,
  name,
  label,
  required,
  error,
  hint,
  defaultValue,
}: {
  companies: string[];
  name: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  defaultValue?: string;
}) {
  if (companies.length === 1) {
    return <input type="hidden" name={name} value={companies[0]} />;
  }
  return (
    <Field label={label} htmlFor={name} required={required} error={error} hint={hint}>
      <SelectInput
        id={name}
        name={name}
        options={companies}
        defaultValue={defaultValue}
        placeholder={required ? "Select company" : "—"}
        invalid={Boolean(error)}
      />
    </Field>
  );
}

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
  useErrorToast(state);
  const { selected, setSelected, department, setDepartment, designation, setDesignation, grade, setGrade } =
    useEmployeeAutofill(opts);
  return (
    <form action={dispatch} className="flex flex-col gap-5">
      <ErrorBanner msg={state.error} />
      <FormSection title="Onboarding">
        <Field label="Employee" htmlFor="employee" required error={fe.employee}>
          <SelectInput
            id="employee"
            name="employee"
            options={employeeOptions(opts.employeeDirectory, opts.defaultEmployee)}
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            placeholder="Select employee"
            invalid={Boolean(fe.employee)}
          />
        </Field>
        <Field label="Onboarding begins" htmlFor="boarding_begins_on" required error={fe.boarding_begins_on}>
          <TextInput id="boarding_begins_on" name="boarding_begins_on" type="date" invalid={Boolean(fe.boarding_begins_on)} />
        </Field>
        <CompanyField companies={opts.companies} name="company" label="Company" required error={fe.company} />
        <Field label="Department" htmlFor="department"
               hint={selected ? "Pre-filled from the employee — override if this onboarding is for a different one." : undefined}>
          <SelectInput
            id="department"
            name="department"
            options={opts.departments}
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="—"
          />
        </Field>
        <Field label="Designation" htmlFor="designation">
          <SelectInput
            id="designation"
            name="designation"
            options={opts.designations}
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            placeholder="—"
          />
        </Field>
        <Field label="Grade" htmlFor="employee_grade">
          <SelectInput
            id="employee_grade"
            name="employee_grade"
            options={opts.payGrades}
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder="—"
          />
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
  useErrorToast(state);
  const { selected, setSelected, department, setDepartment, designation, setDesignation } =
    useEmployeeAutofill(opts);
  return (
    <form action={dispatch} className="flex flex-col gap-5">
      <ErrorBanner msg={state.error} />
      <FormSection title="Separation">
        <Field label="Employee" htmlFor="employee" required error={fe.employee}
               hint="Who is leaving.">
          <SelectInput
            id="employee"
            name="employee"
            options={employeeOptions(opts.employeeDirectory, opts.defaultEmployee)}
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            placeholder="Select employee"
            invalid={Boolean(fe.employee)}
          />
        </Field>
        <Field label="Offboarding begins" htmlFor="boarding_begins_on" required error={fe.boarding_begins_on}
               hint="Last working day kicks off the exit checklist.">
          <TextInput id="boarding_begins_on" name="boarding_begins_on" type="date" invalid={Boolean(fe.boarding_begins_on)} />
        </Field>
        <CompanyField companies={opts.companies} name="company" label="Company" required error={fe.company} />
        <Field label="Department" htmlFor="department"
               hint={selected ? "Pre-filled from the employee — override if leaving from a different one." : undefined}>
          <SelectInput
            id="department"
            name="department"
            options={opts.departments}
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="—"
          />
        </Field>
        <Field label="Designation" htmlFor="designation">
          <SelectInput
            id="designation"
            name="designation"
            options={opts.designations}
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            placeholder="—"
          />
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
  useErrorToast(state);
  const multiCompany = opts.companies.length > 1;
  return (
    <form action={dispatch} className="flex flex-col gap-5">
      <ErrorBanner msg={state.error} />
      <FormSection title="Transfer">
        <Field label="Employee" htmlFor="employee" required error={fe.employee}>
          <SelectInput
            id="employee"
            name="employee"
            options={employeeOptions(opts.employeeDirectory, opts.defaultEmployee)}
            defaultValue={opts.defaultEmployee}
            placeholder="Select employee"
            invalid={Boolean(fe.employee)}
          />
        </Field>
        <Field label="Transfer date" htmlFor="transfer_date" required error={fe.transfer_date}>
          <TextInput id="transfer_date" name="transfer_date" type="date" invalid={Boolean(fe.transfer_date)} />
        </Field>
        <CompanyField
          companies={opts.companies}
          name="company"
          label="Current company"
          required
          error={fe.company}
        />
        {multiCompany && (
          <Field label="New company" htmlFor="new_company"
                 hint="Leave blank if the transfer stays within the same company.">
            <SelectInput id="new_company" name="new_company" options={opts.companies} placeholder="—" />
          </Field>
        )}
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
  useErrorToast(state);
  return (
    <form action={dispatch} className="flex flex-col gap-5">
      <ErrorBanner msg={state.error} />
      <FormSection title="Promotion">
        <Field label="Employee" htmlFor="employee" required error={fe.employee}>
          <SelectInput
            id="employee"
            name="employee"
            options={employeeOptions(opts.employeeDirectory, opts.defaultEmployee)}
            defaultValue={opts.defaultEmployee}
            placeholder="Select employee"
            invalid={Boolean(fe.employee)}
          />
        </Field>
        <Field label="Promotion date" htmlFor="promotion_date" required error={fe.promotion_date}>
          <TextInput id="promotion_date" name="promotion_date" type="date" invalid={Boolean(fe.promotion_date)} />
        </Field>
        <CompanyField companies={opts.companies} name="company" label="Company" required error={fe.company} />
        <Field label="New designation" htmlFor="new_designation">
          <SelectInput id="new_designation" name="new_designation" options={opts.designations} placeholder="—" />
        </Field>
        <Field label="New grade" htmlFor="new_grade">
          <SelectInput id="new_grade" name="new_grade" options={opts.payGrades} placeholder="—" />
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
  useErrorToast(state);
  // Against + Target are coupled: pick Against = Employee → Target lists
  // employees; pick Department → Target lists departments; Company →
  // companies. Reset Target when Against changes so a stale value from
  // the previous type doesn't ride along on submit.
  type AgainstType = "Employee" | "Department" | "Company";
  const [againstType, setAgainstType] = useState<AgainstType>("Employee");
  const [target, setTarget] = useState<string>("");
  const targetOptions =
    againstType === "Employee"
      ? employeeOptions(opts.employeeDirectory)
      : againstType === "Department"
        ? opts.departments.map((d) => ({ value: d, label: d }))
        : opts.companies.map((c) => ({ value: c, label: c }));

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      <ErrorBanner msg={state.error} />
      <FormSection title="Grievance">
        <Field label="Subject" htmlFor="subject" required error={fe.subject} wide
               hint="Short headline of the concern.">
          <TextInput id="subject" name="subject" invalid={Boolean(fe.subject)} />
        </Field>
        <Field label="Raised by" htmlFor="raised_by" required error={fe.raised_by}
               hint="Who is raising it.">
          <SelectInput
            id="raised_by"
            name="raised_by"
            options={employeeOptions(opts.employeeDirectory, opts.defaultEmployee)}
            defaultValue={opts.defaultEmployee}
            placeholder="Select employee"
            invalid={Boolean(fe.raised_by)}
          />
        </Field>
        <Field label="Date raised" htmlFor="grievance_raised_date">
          <TextInput id="grievance_raised_date" name="grievance_raised_date" type="date" />
        </Field>
        <Field label="Against" htmlFor="grievance_against_type" required error={fe.grievance_against_type}>
          <SelectInput
            id="grievance_against_type"
            name="grievance_against_type"
            options={GRIEVANCE_AGAINST_TYPES}
            value={againstType}
            onChange={(e) => {
              setAgainstType(e.target.value as AgainstType);
              setTarget("");
            }}
            invalid={Boolean(fe.grievance_against_type)}
          />
        </Field>
        <Field label="Target" htmlFor="grievance_against" required error={fe.grievance_against}
               hint={
                 targetOptions.length === 0
                   ? `No ${againstType.toLowerCase()}s available on this tenant.`
                   : `Pick the ${againstType.toLowerCase()} this grievance is against.`
               }>
          <SelectInput
            id="grievance_against"
            name="grievance_against"
            options={targetOptions}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder={`— pick a ${againstType.toLowerCase()} —`}
            invalid={Boolean(fe.grievance_against)}
          />
        </Field>
        <Field
          label="Grievance type"
          htmlFor="grievance_type"
          hint={
            opts.grievanceTypes.length === 0
              ? "No grievance types configured on this tenant. Seed some via Frappe Desk (Grievance Type list) first."
              : "Pick a category — the backend rejects free-text values."
          }
        >
          <SelectInput
            id="grievance_type"
            name="grievance_type"
            options={opts.grievanceTypes}
            placeholder="— pick a type —"
          />
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

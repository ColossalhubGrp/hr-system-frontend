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
import { LinkField } from "@/components/common/link-field";
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

/** Toast on error state transitions AND scroll the first invalid
 *  field into view. Success paths in every lifecycle action redirect()
 *  to the detail page, so no success toast fires here — the URL change
 *  is the feedback. The scroll is critical for long forms where the
 *  failing field is below the fold (e.g. Description on the Grievance
 *  form) and the user would otherwise see the banner but no highlight.
 */
function useErrorToast(state: FormState) {
  const last = useRef(state);
  useEffect(() => {
    if (state === last.current) return;
    last.current = state;
    if (!state.error) return;
    toast.error(state.error, {
      description: state.fieldErrors
        ? "Check the highlighted fields."
        : undefined,
    });
    // Zod iterates issues in schema order, so the first key is the
    // first-declared invalid field — natural top-down focus target.
    // Field.htmlFor matches the input's id, so getElementById is enough.
    const firstKey = state.fieldErrors
      ? Object.keys(state.fieldErrors)[0]
      : undefined;
    if (!firstKey) return;
    const el = document.getElementById(firstKey);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // Focus after the scroll so the caret lands in the right field —
    // some inputs (SelectInput) don't focus visibly on scroll.
    if ("focus" in el && typeof (el as HTMLElement).focus === "function") {
      (el as HTMLElement).focus({ preventScroll: true });
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
      <LinkField
        id={name}
        name={name}
        doctype="Company"
        defaultValue={defaultValue}
        placeholder={required ? "Search company" : "—"}
        required={required}
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
    <div className="-mx-1 mt-6 flex items-center justify-end gap-2 rounded-card border border-hairline bg-surface/95 p-3 shadow-rail backdrop-blur">
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
          <LinkField
            id="employee"
            name="employee"
            doctype="Employee"
            value={selected}
            onChange={(next) => setSelected(next)}
            placeholder="Search employee"
            required
            invalid={Boolean(fe.employee)}
          />
        </Field>
        <Field label="Onboarding begins" htmlFor="boarding_begins_on" required error={fe.boarding_begins_on}>
          <TextInput id="boarding_begins_on" name="boarding_begins_on" type="date" invalid={Boolean(fe.boarding_begins_on)} />
        </Field>
        <CompanyField companies={opts.companies} name="company" label="Company" required error={fe.company} />
        <Field label="Department" htmlFor="department"
               hint={selected ? "Pre-filled from the employee — override if this onboarding is for a different one." : undefined}>
          <LinkField
            id="department"
            name="department"
            doctype="Department"
            value={department}
            onChange={(next) => setDepartment(next)}
          />
        </Field>
        <Field label="Designation" htmlFor="designation">
          <LinkField
            id="designation"
            name="designation"
            doctype="Designation"
            value={designation}
            onChange={(next) => setDesignation(next)}
          />
        </Field>
        <Field label="Grade" htmlFor="employee_grade">
          <LinkField
            id="employee_grade"
            name="employee_grade"
            doctype="Pay Grade"
            value={grade}
            onChange={(next) => setGrade(next)}
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
          <LinkField
            id="employee"
            name="employee"
            doctype="Employee"
            value={selected}
            onChange={(next) => setSelected(next)}
            placeholder="Search employee"
            required
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
          <LinkField
            id="department"
            name="department"
            doctype="Department"
            value={department}
            onChange={(next) => setDepartment(next)}
          />
        </Field>
        <Field label="Designation" htmlFor="designation">
          <LinkField
            id="designation"
            name="designation"
            doctype="Designation"
            value={designation}
            onChange={(next) => setDesignation(next)}
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
          <LinkField
            id="employee"
            name="employee"
            doctype="Employee"
            defaultValue={opts.defaultEmployee}
            placeholder="Search employee"
            required
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
            <LinkField id="new_company" name="new_company" doctype="Company" placeholder="—" />
          </Field>
        )}
        <Field label="New department" htmlFor="new_department">
          <LinkField id="new_department" name="new_department" doctype="Department" placeholder="—" />
        </Field>
        <Field label="New designation" htmlFor="new_designation">
          <LinkField id="new_designation" name="new_designation" doctype="Designation" placeholder="—" />
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
          <LinkField
            id="employee"
            name="employee"
            doctype="Employee"
            defaultValue={opts.defaultEmployee}
            placeholder="Search employee"
            required
            invalid={Boolean(fe.employee)}
          />
        </Field>
        <Field label="Promotion date" htmlFor="promotion_date" required error={fe.promotion_date}>
          <TextInput id="promotion_date" name="promotion_date" type="date" invalid={Boolean(fe.promotion_date)} />
        </Field>
        <CompanyField companies={opts.companies} name="company" label="Company" required error={fe.company} />
        <Field label="New designation" htmlFor="new_designation">
          <LinkField id="new_designation" name="new_designation" doctype="Designation" placeholder="—" />
        </Field>
        <Field label="New grade" htmlFor="new_grade">
          <LinkField id="new_grade" name="new_grade" doctype="Pay Grade" placeholder="—" />
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
          <LinkField
            id="raised_by"
            name="raised_by"
            doctype="Employee"
            defaultValue={opts.defaultEmployee}
            placeholder="Search employee"
            required
            invalid={Boolean(fe.raised_by)}
          />
        </Field>
        <Field
          label="Date raised"
          htmlFor="grievance_raised_date"
          error={fe.grievance_raised_date}
        >
          <TextInput
            id="grievance_raised_date"
            name="grievance_raised_date"
            type="date"
            invalid={Boolean(fe.grievance_raised_date)}
          />
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
          <LinkField
            id="grievance_against"
            name="grievance_against"
            doctype={againstType}
            value={target}
            onChange={(next) => setTarget(next)}
            placeholder={`— search a ${againstType.toLowerCase()} —`}
            required
            invalid={Boolean(fe.grievance_against)}
          />
        </Field>
        <Field
          label="Grievance type"
          htmlFor="grievance_type"
          required
          error={fe.grievance_type}
          hint={
            opts.grievanceTypes.length === 0
              ? undefined
              : "Pick a category — the backend rejects free-text values."
          }
        >
          <SelectInput
            id="grievance_type"
            name="grievance_type"
            options={opts.grievanceTypes}
            placeholder="— pick a type —"
            invalid={Boolean(fe.grievance_type)}
          />
        </Field>
        <Field
          label="Cause"
          htmlFor="cause_of_grievance"
          error={fe.cause_of_grievance}
          wide
        >
          <TextArea
            id="cause_of_grievance"
            name="cause_of_grievance"
            rows={2}
            invalid={Boolean(fe.cause_of_grievance)}
          />
        </Field>
        <Field
          label="Description"
          htmlFor="description"
          required
          error={fe.description}
          wide
        >
          <TextArea
            id="description"
            name="description"
            rows={4}
            invalid={Boolean(fe.description)}
          />
        </Field>
      </FormSection>
      <Bar cancelHref={cancelHref} label="File grievance" />
    </form>
  );
}

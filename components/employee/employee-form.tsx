"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, ArrowLeft, ArrowRight, Save, Wallet } from "lucide-react";
import type { EmployeeFull } from "@/lib/frappe/employees";
import type {
  EmployeeFormInput,
  EmployeeFormOptions,
} from "@/lib/frappe/employee-write";
import {
  EMPLOYEE_GENDERS,
  EMPLOYEE_STATUSES,
} from "@/lib/frappe/employee-meta";
import type { FormState } from "@/app/(workspace)/employee/actions";
import { cn } from "@/lib/cn";
import { Field, SelectInput, TextArea, TextInput } from "./form-bits";
import { ProfileImagePicker } from "./profile-image-picker";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;

type Props = {
  mode: "create" | "edit";
  action: Action;
  options: EmployeeFormOptions;
  initial?: EmployeeFull;
  cancelHref: string;
};

const EMPTY: FormState = {};

/**
 * Tabs match the read-only view on the detail page so the layout reads as a
 * single concept — the user already knows where to find each field. Salary,
 * Exit and Connections are read-only here because they're driven by other
 * apps (Payroll) or by lifecycle workflows.
 */
type TabId =
  | "overview"
  | "joining"
  | "contact"
  | "attendance"
  | "approvers"
  | "salary"
  | "profile"
  | "exit";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "joining", label: "Joining" },
  { id: "contact", label: "Contact Details" },
  { id: "attendance", label: "Attendance" },
  { id: "approvers", label: "Approvers" },
  { id: "salary", label: "Salary" },
  { id: "profile", label: "Profile" },
  { id: "exit", label: "Exit" },
];

/** Which form field name belongs to which tab — used so a server-side
 *  validation error jumps the user back to the tab that owns the bad field. */
const FIELDS_BY_TAB: Record<TabId, ReadonlyArray<keyof EmployeeFormInput>> = {
  overview: [
    "first_name",
    "middle_name",
    "last_name",
    "gender",
    "date_of_birth",
    "designation",
    "department",
    "branch",
    "company",
    "status",
  ],
  joining: ["date_of_joining", "employee_number", "employment_type", "grade"],
  contact: [
    "cell_number",
    "user_id",
    "company_email",
    "personal_email",
    "current_address",
    "permanent_address",
    "person_to_be_contacted",
    "emergency_phone_number",
  ],
  attendance: ["holiday_list", "default_shift"],
  approvers: [
    "reports_to",
    "leave_approver",
    "expense_approver",
    "shift_request_approver",
  ],
  salary: [],
  profile: ["image", "bio"],
  exit: [],
};

export function EmployeeForm({
  mode,
  action,
  options,
  initial,
  cancelHref,
}: Props) {
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};
  const [tab, setTab] = useState<TabId>("overview");

  // After a failed submit, jump to the first tab that contains an errored
  // field — without this the user sees a generic banner and has no idea which
  // tab to open. Tracking the state object reference is enough; useFormState
  // hands us a fresh one on every server response.
  const lastSeenState = useRef(state);
  useEffect(() => {
    if (state === lastSeenState.current) return;
    lastSeenState.current = state;
    if (!state.fieldErrors) return;
    const errored = new Set(Object.keys(state.fieldErrors));
    const target = TABS.find((t) =>
      FIELDS_BY_TAB[t.id].some((f) => errored.has(f)),
    );
    if (target) setTab(target.id);
  }, [state]);

  // Pre-fill from the existing doc — split employee_name back into parts only
  // if first/last aren't directly available (they always are for a saved doc).
  const v = {
    first_name: initial ? splitFirst(initial.name) : "",
    middle_name: "",
    last_name: initial ? splitLast(initial.name) : "",
    gender: initial?.gender ?? "",
    date_of_birth: initial?.dateOfBirth ?? "",
    image: initial?.imageUrl ?? "",
    company: initial?.company ?? "",
    status: initial?.status ?? "Active",
    department: initial?.department ?? "",
    designation: initial?.designation ?? "",
    branch: initial?.branch ?? "",
    employment_type: initial?.employmentType ?? "",
    grade: initial?.grade ?? "",
    date_of_joining: initial?.dateOfJoining ?? "",
    employee_number: initial?.employeeNumber ?? "",
    cell_number: initial?.mobile ?? "",
    company_email: initial?.email ?? "",
    personal_email: initial?.personalEmail ?? "",
    user_id: initial?.userId ?? "",
    current_address: initial?.currentAddress ?? "",
    permanent_address: initial?.permanentAddress ?? "",
    person_to_be_contacted: initial?.emergencyContactName ?? "",
    emergency_phone_number: initial?.emergencyContactNumber ?? "",
    reports_to: initial?.reportsTo ?? "",
    leave_approver: initial?.leaveApprover ?? "",
    expense_approver: initial?.expenseApprover ?? "",
    shift_request_approver: initial?.shiftRequestApprover ?? "",
    holiday_list: initial?.holidayList ?? "",
    default_shift: initial?.defaultShift ?? "",
    bio: initial?.bio ?? "",
    relieving_date: initial?.relievingDate ?? "",
  } satisfies Partial<Record<string, string>>;

  // Mark tabs that currently have an errored field, so the tab nav can flag
  // them with a tiny dot.
  const erroredTabs = new Set<TabId>();
  for (const t of TABS) {
    if (FIELDS_BY_TAB[t.id].some((f) => fe[f])) erroredTabs.add(t.id);
  }

  const idx = TABS.findIndex((t) => t.id === tab);
  const prev = idx > 0 ? TABS[idx - 1] : null;
  const next = idx >= 0 && idx < TABS.length - 1 ? TABS[idx + 1] : null;

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

      <FormTabs
        tabs={TABS}
        active={tab}
        onChange={setTab}
        erroredTabs={erroredTabs}
      />

      {/* Every section stays mounted — hiding inactive ones with `hidden`
          preserves typed-but-unsaved values across tab switches and keeps the
          submitted FormData complete regardless of what's on screen. */}
      <TabPane active={tab} id="overview">
        <Grid>
          <Field
            label="First name"
            htmlFor="first_name"
            required
            error={fe.first_name}
          >
            <TextInput
              id="first_name"
              name="first_name"
              defaultValue={v.first_name}
              invalid={Boolean(fe.first_name)}
              autoComplete="given-name"
            />
          </Field>
          <Field label="Middle name" htmlFor="middle_name">
            <TextInput
              id="middle_name"
              name="middle_name"
              defaultValue={v.middle_name}
            />
          </Field>
          <Field
            label="Last name"
            htmlFor="last_name"
            required
            error={fe.last_name}
          >
            <TextInput
              id="last_name"
              name="last_name"
              defaultValue={v.last_name}
              invalid={Boolean(fe.last_name)}
              autoComplete="family-name"
            />
          </Field>
          <Field label="Gender" htmlFor="gender" required error={fe.gender}>
            <SelectInput
              id="gender"
              name="gender"
              defaultValue={v.gender}
              options={EMPLOYEE_GENDERS}
              placeholder="Select"
              invalid={Boolean(fe.gender)}
            />
          </Field>
          <Field
            label="Date of birth"
            htmlFor="date_of_birth"
            required
            error={fe.date_of_birth}
          >
            <TextInput
              id="date_of_birth"
              name="date_of_birth"
              type="date"
              defaultValue={v.date_of_birth}
              invalid={Boolean(fe.date_of_birth)}
            />
          </Field>
          <Field label="Status" htmlFor="status" required>
            <SelectInput
              id="status"
              name="status"
              defaultValue={v.status}
              options={EMPLOYEE_STATUSES}
              placeholder="Select"
            />
          </Field>
          <Field label="Company" htmlFor="company" required error={fe.company}>
            <SelectInput
              id="company"
              name="company"
              defaultValue={v.company}
              options={options.companies}
              placeholder="Select company"
              invalid={Boolean(fe.company)}
            />
          </Field>
          <Field label="Department" htmlFor="department">
            <SelectInput
              id="department"
              name="department"
              defaultValue={v.department}
              options={options.departments}
              placeholder="—"
            />
          </Field>
          <Field label="Designation" htmlFor="designation">
            <SelectInput
              id="designation"
              name="designation"
              defaultValue={v.designation}
              options={options.designations}
              placeholder="—"
            />
          </Field>
          <Field label="Branch" htmlFor="branch">
            <SelectInput
              id="branch"
              name="branch"
              defaultValue={v.branch}
              options={options.branches}
              placeholder="—"
            />
          </Field>
        </Grid>
      </TabPane>

      <TabPane active={tab} id="joining">
        <Grid>
          <Field
            label="Date of joining"
            htmlFor="date_of_joining"
            required
            error={fe.date_of_joining}
          >
            <TextInput
              id="date_of_joining"
              name="date_of_joining"
              type="date"
              defaultValue={v.date_of_joining}
              invalid={Boolean(fe.date_of_joining)}
            />
          </Field>
          <Field
            label="Employee number"
            htmlFor="employee_number"
            hint="Optional HRIS reference."
          >
            <TextInput
              id="employee_number"
              name="employee_number"
              defaultValue={v.employee_number}
            />
          </Field>
          <Field label="Employment type" htmlFor="employment_type">
            <SelectInput
              id="employment_type"
              name="employment_type"
              defaultValue={v.employment_type}
              options={options.employmentTypes}
              placeholder="—"
            />
          </Field>
          <Field label="Grade" htmlFor="grade">
            <SelectInput
              id="grade"
              name="grade"
              defaultValue={v.grade}
              options={options.grades}
              placeholder="—"
            />
          </Field>
        </Grid>
      </TabPane>

      <TabPane active={tab} id="contact">
        <Grid>
          <Field label="Mobile" htmlFor="cell_number">
            <TextInput
              id="cell_number"
              name="cell_number"
              type="tel"
              defaultValue={v.cell_number}
              autoComplete="tel"
            />
          </Field>
          <Field
            label="Linked user account"
            htmlFor="user_id"
            hint="The Frappe user this employee signs in as."
            error={fe.user_id}
          >
            <TextInput
              id="user_id"
              name="user_id"
              type="email"
              defaultValue={v.user_id}
              invalid={Boolean(fe.user_id)}
            />
          </Field>
          <Field
            label="Company email"
            htmlFor="company_email"
            error={fe.company_email}
          >
            <TextInput
              id="company_email"
              name="company_email"
              type="email"
              defaultValue={v.company_email}
              invalid={Boolean(fe.company_email)}
            />
          </Field>
          <Field
            label="Personal email"
            htmlFor="personal_email"
            error={fe.personal_email}
          >
            <TextInput
              id="personal_email"
              name="personal_email"
              type="email"
              defaultValue={v.personal_email}
              invalid={Boolean(fe.personal_email)}
            />
          </Field>
          <Field label="Current address" htmlFor="current_address" wide>
            <TextArea
              id="current_address"
              name="current_address"
              defaultValue={v.current_address}
            />
          </Field>
          <Field label="Permanent address" htmlFor="permanent_address" wide>
            <TextArea
              id="permanent_address"
              name="permanent_address"
              defaultValue={v.permanent_address}
            />
          </Field>
          <Field label="Emergency contact" htmlFor="person_to_be_contacted">
            <TextInput
              id="person_to_be_contacted"
              name="person_to_be_contacted"
              defaultValue={v.person_to_be_contacted}
            />
          </Field>
          <Field label="Emergency phone" htmlFor="emergency_phone_number">
            <TextInput
              id="emergency_phone_number"
              name="emergency_phone_number"
              type="tel"
              defaultValue={v.emergency_phone_number}
            />
          </Field>
        </Grid>
      </TabPane>

      <TabPane active={tab} id="attendance">
        <Grid>
          <Field label="Holiday list" htmlFor="holiday_list">
            <SelectInput
              id="holiday_list"
              name="holiday_list"
              defaultValue={v.holiday_list}
              options={options.holidayLists}
              placeholder="—"
            />
          </Field>
          <Field label="Default shift" htmlFor="default_shift">
            <SelectInput
              id="default_shift"
              name="default_shift"
              defaultValue={v.default_shift}
              options={options.shifts}
              placeholder="—"
            />
          </Field>
        </Grid>
        <Hint>
          Day-by-day check-ins live in the Attendance module — they'll start
          flowing through here once this employee marks their first day.
        </Hint>
      </TabPane>

      <TabPane active={tab} id="approvers">
        <Grid>
          <Field
            label="Reports to"
            htmlFor="reports_to"
            hint="Manager's employee ID."
          >
            <TextInput
              id="reports_to"
              name="reports_to"
              defaultValue={v.reports_to}
            />
          </Field>
          <Field label="Leave approver" htmlFor="leave_approver">
            <TextInput
              id="leave_approver"
              name="leave_approver"
              type="email"
              defaultValue={v.leave_approver}
            />
          </Field>
          <Field label="Expense approver" htmlFor="expense_approver">
            <TextInput
              id="expense_approver"
              name="expense_approver"
              type="email"
              defaultValue={v.expense_approver}
            />
          </Field>
          <Field label="Shift request approver" htmlFor="shift_request_approver">
            <TextInput
              id="shift_request_approver"
              name="shift_request_approver"
              type="email"
              defaultValue={v.shift_request_approver}
            />
          </Field>
        </Grid>
        <Hint>
          Leave blank to inherit the approver configured on the department.
        </Hint>
      </TabPane>

      <TabPane active={tab} id="salary">
        <ReadOnly icon={<Wallet className="h-4 w-4" />} title="Compensation lives in Payroll">
          Salary structures, slips and payroll runs are managed by the Payroll
          app. Open it from the sidebar to assign a salary structure to this
          employee.
        </ReadOnly>
      </TabPane>

      <TabPane active={tab} id="profile">
        <Field
          label="Profile image"
          htmlFor="image"
          required={mode === "create"}
          error={fe.image}
          wide
        >
          <ProfileImagePicker
            name="image"
            defaultValue={v.image}
            fallbackName={`${v.first_name} ${v.last_name}`.trim()}
            invalid={Boolean(fe.image)}
          />
        </Field>
        <Field label="Bio" htmlFor="bio" wide>
          <TextArea id="bio" name="bio" defaultValue={v.bio} rows={5} />
        </Field>
      </TabPane>

      <TabPane active={tab} id="exit">
        {mode === "edit" && v.relieving_date ? (
          <Grid>
            <Field label="Relieving date" htmlFor="relieving_date">
              <TextInput
                id="relieving_date"
                name="relieving_date"
                type="date"
                defaultValue={v.relieving_date}
                disabled
              />
            </Field>
          </Grid>
        ) : (
          <ReadOnly title="Exit is driven by the Lifecycle module">
            When this employee leaves, file an Employee Separation under
            Lifecycle — that flow sets the relieving date and status here.
          </ReadOnly>
        )}
      </TabPane>

      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-between gap-2 rounded-card border border-hairline bg-surface/95 p-3 shadow-rail backdrop-blur">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => prev && setTab(prev.id)}
            disabled={!prev}
            className={cn(
              "inline-flex h-9 items-center gap-1 rounded-chip px-3 text-xs font-medium transition focus-ring",
              "text-ash-700 hover:bg-canvas",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            )}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {prev ? prev.label : "Previous"}
          </button>
          <button
            type="button"
            onClick={() => next && setTab(next.id)}
            disabled={!next}
            className={cn(
              "inline-flex h-9 items-center gap-1 rounded-chip px-3 text-xs font-medium transition focus-ring",
              "text-ash-700 hover:bg-canvas",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            )}
          >
            {next ? next.label : "Next"}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={cancelHref as Route}
            className="h-10 inline-flex items-center justify-center rounded-chip px-4 text-sm font-medium text-ash-700 transition hover:bg-canvas focus-ring"
          >
            Cancel
          </Link>
          <SubmitButton mode={mode} />
        </div>
      </div>
    </form>
  );
}

function FormTabs({
  tabs,
  active,
  onChange,
  erroredTabs,
}: {
  tabs: { id: TabId; label: string }[];
  active: TabId;
  onChange: (id: TabId) => void;
  erroredTabs: Set<TabId>;
}) {
  return (
    <nav
      className="card -mb-2 overflow-x-auto p-1.5"
      aria-label="Employee form sections"
    >
      <ul className="flex min-w-max items-center gap-1">
        {tabs.map((t) => {
          const isActive = t.id === active;
          const hasError = erroredTabs.has(t.id);
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onChange(t.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-chip px-3.5 py-1.5 text-sm font-medium transition focus-ring",
                  isActive
                    ? "bg-ink-800 text-white shadow-sm"
                    : "text-ash-600 hover:bg-canvas",
                )}
              >
                {t.label}
                {hasError && !isActive && (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-fall"
                    aria-label="has errors"
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function TabPane({
  active,
  id,
  children,
}: {
  active: TabId;
  id: TabId;
  children: React.ReactNode;
}) {
  // We render every pane but only show one — `hidden` keeps inputs in the DOM
  // so their values are preserved across tab switches and submitted regardless
  // of which tab is open at submit time.
  return (
    <section
      className={cn("card flex flex-col gap-5 p-6", active !== id && "hidden")}
      role="tabpanel"
      aria-hidden={active !== id}
    >
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
      {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-card border border-dashed border-hairline bg-canvas/40 px-4 py-3 text-xs text-ash-600">
      {children}
    </p>
  );
}

function ReadOnly({
  icon,
  title,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-card border border-dashed border-hairline bg-canvas/40 px-4 py-5">
      {icon && (
        <span className="mt-0.5 grid h-7 w-7 place-items-center rounded-full bg-ink-50 text-ink-700">
          {icon}
        </span>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-ash-900">{title}</p>
        <p className="text-xs text-ash-600">{children}</p>
      </div>
    </div>
  );
}

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
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
        ? "Add employee"
        : "Save changes"}
    </button>
  );
}

function splitFirst(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return parts[0] ?? "";
}

function splitLast(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1]! : "";
}

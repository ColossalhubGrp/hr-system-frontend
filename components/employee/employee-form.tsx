"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, ArrowLeft, ArrowRight, Info, Save } from "lucide-react";
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
import { toast } from "@/components/ui/sonner";
import { Field, SelectInput, TextArea, TextInput } from "./form-bits";
import { ProfileImagePicker } from "./profile-image-picker";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;

type Props = {
  mode: "create" | "edit";
  action: Action;
  options: EmployeeFormOptions;
  initial?: EmployeeFull;
  cancelHref: string;
  /** Persona roles the login-roles picker offers on create. Empty
   *  array or missing hides the picker; pass PERSONA_ROLES from
   *  lib/frappe/roles.ts to get the canonical set. */
  personaRoles?: string[];
  /** Only IT/HR Admins can assign persona roles; matches the backend
   *  gate on recruitment_app.api.me.set_login_roles_for_employee.
   *  When false, the picker is hidden entirely — non-admin HR still
   *  gets to create the employee, they just don't see the picker. */
  canAssignRoles?: boolean;
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
  | "profile";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "joining", label: "Joining" },
  { id: "contact", label: "Contact Details" },
  { id: "attendance", label: "Attendance" },
  { id: "approvers", label: "Approvers" },
  { id: "profile", label: "Profile" },
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
    "age_waiver_granted",
    "age_waiver_reason",
    "designation",
    "department",
    "branch",
    "company",
    "status",
  ],
  joining: ["date_of_joining", "employment_type", "pay_grade", "nec_industry", "basic_usd", "basic_zig", "nec_dues_override", "nec_dues_usd", "is_elderly", "is_disabled", "tax_method", "salary_currency_mode"],
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
  profile: ["image", "bio"],
};

export function EmployeeForm({
  mode,
  action,
  options,
  initial,
  cancelHref,
  personaRoles,
  canAssignRoles,
}: Props) {
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};
  const [tab, setTab] = useState<TabId>("overview");
  // Pay grade + basic salary are controlled so we can apply the NEC-
  // ceiling rule reactively: grades at/below the tenant's ceiling
  // (is_nec_grade=1) inherit the grade's salary and lock the input;
  // grades above are editable per employee.
  const [payGrade, setPayGrade] = useState<string>(initial?.payGrade ?? "");
  const [necIndustry, setNecIndustry] = useState<string>(initial?.necIndustry ?? "");
  const [basicUsd, setBasicUsd] = useState<number>(initial?.basicUsd ?? 0);
  const [basicZig, setBasicZig] = useState<number>(initial?.basicZig ?? 0);
  const [salarySource, setSalarySource] = useState<"industry" | "grade" | "none">("none");
  // NEC dues mirror the salary pattern: default is "Auto" (inherit
  // from industry.dues_amount_usd or dues_pct × basic_usd, split by
  // employer_share_pct), with an override toggle for negotiated /
  // grandfathered arrangements.
  const [necDuesOverride, setNecDuesOverride] = useState<boolean>(
    Boolean(initial?.necDuesOverride),
  );
  const [necDuesUsd, setNecDuesUsd] = useState<number>(initial?.necDuesUsd ?? 0);
  // ZIMRA credit flags — engine reads these on process and subtracts
  // the tenant's credit amounts from combined PAYE before AIDS Levy.
  const [isElderly, setIsElderly] = useState<boolean>(Boolean(initial?.isElderly));
  const [isDisabled, setIsDisabled] = useState<boolean>(Boolean(initial?.isDisabled));
  // ZIMRA tax method + currency mode. Both default to the most
  // permissive option (FDS + MIXED) so admins can leave them alone
  // for regular full-year employees.
  const [taxMethod, setTaxMethod] = useState<"FDS" | "NON_FDS">(
    initial?.taxMethod ?? "FDS",
  );
  const [salaryCurrencyMode, setSalaryCurrencyMode] = useState<
    "USD_ONLY" | "ZIG_ONLY" | "MIXED"
  >(initial?.salaryCurrencyMode ?? "MIXED");
  // Age-limit check needs both a live DOB and a live Company (so the
  // per-tenant min applies immediately when the user swaps company).
  // Controlled state — the raw defaultValue path can't drive the
  // reactive age math.
  const [dateOfBirth, setDateOfBirth] = useState<string>(
    initial?.dateOfBirth ?? "",
  );
  const [company, setCompany] = useState<string>(initial?.company ?? "");
  const [ageWaiverGranted, setAgeWaiverGranted] = useState<boolean>(
    Boolean(initial?.ageWaiverGranted),
  );
  const [ageWaiverReason, setAgeWaiverReason] = useState<string>(
    initial?.ageWaiverReason ?? "",
  );
  const minHireAge = company ? (options.companyMinHireAge[company] ?? 0) : 0;
  const ageYears = computeAgeYears(dateOfBirth);
  const ageBelowLimit =
    minHireAge > 0 && ageYears !== null && ageYears < minHireAge;
  // Waiver only applies to the below-limit case. When the DOB is edited
  // back above the limit, drop any lingering waiver state so the
  // record doesn't ship a stale override.
  useEffect(() => {
    if (!ageBelowLimit && (ageWaiverGranted || ageWaiverReason)) {
      setAgeWaiverGranted(false);
      setAgeWaiverReason("");
    }
  }, [ageBelowLimit, ageWaiverGranted, ageWaiverReason]);
  const industryDues = necIndustry ? options.necIndustryInfo[necIndustry] : undefined;
  const suggestedDuesUsd = (() => {
    if (!industryDues) return 0;
    const total = industryDues.dues_amount_usd
      || (basicUsd * industryDues.dues_pct) / 100;
    const employerPct = industryDues.employer_share_pct || 0;
    return Math.max(0, Number(((total * (100 - employerPct)) / 100).toFixed(2)));
  })();
  useEffect(() => {
    if (!necDuesOverride) setNecDuesUsd(suggestedDuesUsd);
  }, [necDuesOverride, suggestedDuesUsd]);
  const gradeInfo = payGrade ? options.payGradeInfo[payGrade] : undefined;
  const isNecLocked = Boolean(gradeInfo?.is_nec_grade);
  useEffect(() => {
    // When the grade is inside NEC, salary is authoritative. Prefer
    // the industry's per-grade schedule (Payroll NEC Industry.
    // grade_schedule); fall back to Payroll Pay Grade's flat salary
    // if the NEC hasn't published a figure for that grade yet.
    // Grades above NEC leave the inputs editable and unchanged.
    if (!isNecLocked || !gradeInfo) {
      setSalarySource("none");
      return;
    }
    let cancelled = false;
    if (necIndustry) {
      import("@/app/(workspace)/payroll/setup/actions")
        .then((m) => m.fetchIndustrySalary(necIndustry, payGrade))
        .then((r) => {
          if (cancelled) return;
          if (r.source === "industry") {
            setBasicUsd(r.salary_usd);
            setBasicZig(r.salary_zig);
            setSalarySource("industry");
          } else {
            setBasicUsd(gradeInfo.salary_usd);
            setBasicZig(gradeInfo.salary_zig);
            setSalarySource("grade");
          }
        })
        .catch(() => {
          if (cancelled) return;
          setBasicUsd(gradeInfo.salary_usd);
          setBasicZig(gradeInfo.salary_zig);
          setSalarySource("grade");
        });
    } else {
      setBasicUsd(gradeInfo.salary_usd);
      setBasicZig(gradeInfo.salary_zig);
      setSalarySource("grade");
    }
    return () => { cancelled = true; };
  }, [isNecLocked, gradeInfo, necIndustry, payGrade]);

  // After a failed submit, jump to the first tab that contains an errored
  // field — without this the user sees a generic banner and has no idea which
  // tab to open. Tracking the state object reference is enough; useFormState
  // hands us a fresh one on every server response. Same effect drives the
  // toast so a save success / failure is never silent.
  const lastSeenState = useRef(state);
  useEffect(() => {
    if (state === lastSeenState.current) return;
    lastSeenState.current = state;
    if (state.fieldErrors) {
      const errored = new Set(Object.keys(state.fieldErrors));
      const target = TABS.find((t) =>
        FIELDS_BY_TAB[t.id].some((f) => errored.has(f)),
      );
      if (target) setTab(target.id);
    }
    if (state.error) {
      toast.error(state.error, {
        description: state.fieldErrors
          ? "Check the highlighted fields."
          : undefined,
      });
    } else if (mode === "edit" && state !== EMPTY) {
      // updateEmployeeAction returns {} on success; distinguish from the
      // initial EMPTY reference so the toast doesn't fire on first render.
      toast.success("Employee saved.");
    }
  }, [state, mode]);

  // reports_to is a Link to Employee (value = employee ID). The three
  // *_approver fields are stored as Link to User (email) on the backend
  // but shown here as employees — the picker posts the employee id and
  // the server (lib/frappe/employee-write.ts) resolves it to user_id
  // before submitting to Frappe. Existing docs may have an email in
  // those fields; we reverse-look-up so the correct employee is
  // pre-selected, or prepend the raw email as a verbatim option for
  // values that don't match any employee (Administrator etc).
  const dir = options.employeeDirectory;
  const employeeOptionsBase = dir.map((e) => ({
    value: e.id,
    label: `${e.employee_name} (${e.id})`,
  }));
  const reportsToOptions = ensureOptionPresent(
    employeeOptionsBase,
    initial?.reportsTo ?? "",
  );
  const resolveInitialApprover = (val: string | null | undefined): string => {
    const s = (val ?? "").trim();
    if (!s) return "";
    // Already an employee id — leave as-is.
    if (employeeOptionsBase.some((o) => o.value === s)) return s;
    // Looks like an email — map to the employee that owns that user_id.
    const match = dir.find((e) => e.user_id === s);
    return match ? match.id : s;
  };
  const initialLeaveApprover = resolveInitialApprover(initial?.leaveApprover);
  const initialExpenseApprover = resolveInitialApprover(initial?.expenseApprover);
  const initialShiftApprover = resolveInitialApprover(initial?.shiftRequestApprover);
  const approverOptions = ensureOptionPresent(
    ensureOptionPresent(
      ensureOptionPresent(employeeOptionsBase, initialLeaveApprover),
      initialExpenseApprover,
    ),
    initialShiftApprover,
  );

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
    pay_grade: initial?.payGrade ?? "",
    date_of_joining: initial?.dateOfJoining ?? "",
    cell_number: initial?.mobile ?? "",
    company_email: initial?.email ?? "",
    personal_email: initial?.personalEmail ?? "",
    user_id: initial?.userId ?? "",
    current_address: initial?.currentAddress ?? "",
    permanent_address: initial?.permanentAddress ?? "",
    person_to_be_contacted: initial?.emergencyContactName ?? "",
    emergency_phone_number: initial?.emergencyContactNumber ?? "",
    reports_to: initial?.reportsTo ?? "",
    // Approver fields render as employee pickers; use the reverse-
    // mapped id so the correct row is pre-selected even when Frappe
    // stored a user_id (email).
    leave_approver: initialLeaveApprover,
    expense_approver: initialExpenseApprover,
    shift_request_approver: initialShiftApprover,
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
            error={
              fe.date_of_birth ||
              (ageBelowLimit && !ageWaiverGranted
                ? `Age below limit — ${ageYears} yrs; ${company || "this company"} requires ${minHireAge}. HR can grant a waiver below.`
                : undefined)
            }
            hint={
              !ageBelowLimit && ageYears !== null && minHireAge > 0
                ? `Age ${ageYears} · minimum for ${company} is ${minHireAge}.`
                : undefined
            }
          >
            <TextInput
              id="date_of_birth"
              name="date_of_birth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              invalid={Boolean(fe.date_of_birth) || ageBelowLimit}
            />
          </Field>
          {ageBelowLimit && (
            <Field
              label="Override minimum hire age"
              htmlFor="age_waiver_granted"
              hint="HR-only exception. Requires a documented reason (registered apprenticeship, court order, etc.)."
              wide
            >
              <SelectInput
                id="age_waiver_granted"
                name="age_waiver_granted_label"
                value={ageWaiverGranted ? "Yes" : "No"}
                onChange={(e) => setAgeWaiverGranted(e.target.value === "Yes")}
                options={["No", "Yes"]}
                placeholder="No"
              />
              <input
                type="hidden"
                name="age_waiver_granted"
                value={ageWaiverGranted ? "1" : "0"}
              />
            </Field>
          )}
          {ageBelowLimit && ageWaiverGranted && (
            <Field
              label="Waiver reason"
              htmlFor="age_waiver_reason"
              required
              error={fe.age_waiver_reason}
              wide
            >
              <TextArea
                id="age_waiver_reason"
                name="age_waiver_reason"
                value={ageWaiverReason}
                onChange={(e) => setAgeWaiverReason(e.target.value)}
                rows={3}
              />
            </Field>
          )}
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
              value={company}
              onChange={(e) => setCompany(e.target.value)}
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
          <Field label="Employment type" htmlFor="employment_type">
            <SelectInput
              id="employment_type"
              name="employment_type"
              defaultValue={v.employment_type}
              options={options.employmentTypes}
              placeholder="—"
            />
          </Field>
          <Field
            label="Pay grade"
            htmlFor="pay_grade"
            hint={
              payGrade
                ? isNecLocked
                  ? `${payGrade} is inside NEC — salary is inherited from the grade.`
                  : `${payGrade} is above the NEC ceiling — salary is editable per employee.`
                : undefined
            }
          >
            <SelectInput
              id="pay_grade"
              name="pay_grade"
              value={payGrade}
              onChange={(e) => setPayGrade(e.target.value)}
              options={options.payGrades}
              placeholder="—"
            />
          </Field>
          <Field
            label="NEC / industry"
            htmlFor="nec_industry"
            hint={
              isNecLocked
                ? "Sets which NEC's schedule the salary auto-fills from."
                : "Sectoral classification — used for statutory returns."
            }
          >
            <SelectInput
              id="nec_industry"
              name="nec_industry"
              value={necIndustry}
              onChange={(e) => setNecIndustry(e.target.value)}
              options={options.necIndustries}
              placeholder="—"
            />
          </Field>
          <Field
            label="Basic (USD)"
            htmlFor="basic_usd"
            hint={
              isNecLocked
                ? salarySource === "industry"
                  ? `Inherited from ${necIndustry} schedule.`
                  : "Inherited from the grade's flat salary (NEC hasn't published a figure for this grade)."
                : "Editable — this employee's basic in USD."
            }
          >
            <TextInput
              id="basic_usd"
              name="basic_usd"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              value={basicUsd || ""}
              onChange={(e) => setBasicUsd(Number(e.target.value) || 0)}
              readOnly={isNecLocked}
              aria-readonly={isNecLocked}
              className={cn(
                isNecLocked && "cursor-not-allowed bg-muted/40 text-muted-foreground",
              )}
            />
          </Field>
          <Field
            label="Basic (ZiG)"
            htmlFor="basic_zig"
            hint={
              isNecLocked
                ? salarySource === "industry"
                  ? `Inherited from ${necIndustry} schedule.`
                  : "Inherited from the grade's flat ZiG salary."
                : "Editable — this employee's basic in ZiG."
            }
          >
            <TextInput
              id="basic_zig"
              name="basic_zig"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              value={basicZig || ""}
              onChange={(e) => setBasicZig(Number(e.target.value) || 0)}
              readOnly={isNecLocked}
              aria-readonly={isNecLocked}
              className={cn(
                isNecLocked && "cursor-not-allowed bg-muted/40 text-muted-foreground",
              )}
            />
          </Field>
          <Field
            label="NEC dues source"
            htmlFor="nec_dues_override"
            hint={
              necDuesOverride
                ? "Override — amount below is used verbatim on every payslip."
                : necIndustry
                  ? `Auto — computed from ${necIndustry}'s published rate.`
                  : "Auto — pick an NEC industry above to inherit a rate."
            }
          >
            <SelectInput
              id="nec_dues_override"
              name="nec_dues_override_label"
              value={necDuesOverride ? "Override" : "Auto"}
              onChange={(e) => setNecDuesOverride(e.target.value === "Override")}
              options={["Auto", "Override"]}
              placeholder="Auto"
            />
            {/* Submit as 0/1 alongside the human-readable select. */}
            <input type="hidden" name="nec_dues_override" value={necDuesOverride ? "1" : "0"} />
          </Field>
          <Field
            label="NEC dues (USD, monthly)"
            htmlFor="nec_dues_usd"
            hint={
              necDuesOverride
                ? "Editable — the amount deducted from this employee's slip."
                : industryDues
                  ? industryDues.dues_amount_usd
                    ? `US$${industryDues.dues_amount_usd.toFixed(2)} fixed × ${100 - (industryDues.employer_share_pct || 0)}% employee share`
                    : industryDues.dues_pct
                      ? `${industryDues.dues_pct}% of basic × ${100 - (industryDues.employer_share_pct || 0)}% employee share`
                      : "Industry hasn't published a rate — fill in Override for now."
                  : "Pick an industry to auto-compute, or switch to Override."
            }
          >
            <TextInput
              id="nec_dues_usd"
              name="nec_dues_usd"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              value={necDuesUsd || ""}
              onChange={(e) => setNecDuesUsd(Number(e.target.value) || 0)}
              readOnly={!necDuesOverride}
              aria-readonly={!necDuesOverride}
              className={cn(
                !necDuesOverride && "cursor-not-allowed bg-muted/40 text-muted-foreground",
              )}
            />
          </Field>
          <Field
            label="Elderly (55+)"
            htmlFor="is_elderly"
            hint={
              isElderly
                ? "ZIMRA elderly credit applied to monthly PAYE."
                : "Set Yes for employees 55+ — engine subtracts the elderly credit before AIDS Levy."
            }
          >
            <SelectInput
              id="is_elderly"
              name="is_elderly_label"
              value={isElderly ? "Yes" : "No"}
              onChange={(e) => setIsElderly(e.target.value === "Yes")}
              options={["No", "Yes"]}
              placeholder="No"
            />
            <input type="hidden" name="is_elderly" value={isElderly ? "1" : "0"} />
          </Field>
          <Field
            label="Blind / disabled"
            htmlFor="is_disabled"
            hint={
              isDisabled
                ? "ZIMRA disabled-persons credit applied to monthly PAYE."
                : "Set Yes if the employee qualifies under ZIMRA's blind or disabled persons list."
            }
          >
            <SelectInput
              id="is_disabled"
              name="is_disabled_label"
              value={isDisabled ? "Yes" : "No"}
              onChange={(e) => setIsDisabled(e.target.value === "Yes")}
              options={["No", "Yes"]}
              placeholder="No"
            />
            <input type="hidden" name="is_disabled" value={isDisabled ? "1" : "0"} />
          </Field>
          <Field
            label="ZIMRA tax method"
            htmlFor="tax_method"
            hint={
              taxMethod === "FDS"
                ? "Final Deduction System — cumulative YTD calc, credits apply."
                : "Independent monthly calc, no YTD, credits DO NOT apply. Use for mid-year joiners/leavers, multi-employer cases, or pension recipients."
            }
          >
            <SelectInput
              id="tax_method"
              name="tax_method"
              value={taxMethod}
              onChange={(e) => setTaxMethod(e.target.value as "FDS" | "NON_FDS")}
              options={["FDS", "NON_FDS"]}
              placeholder="FDS"
            />
          </Field>
          <Field
            label="Salary currency mode"
            htmlFor="salary_currency_mode"
            hint={
              salaryCurrencyMode === "MIXED"
                ? "Both USD and ZiG income taxed together: combine to USD-equivalent, apply USD table, apportion back."
                : salaryCurrencyMode === "USD_ONLY"
                  ? "Only USD income is taxed. ZiG income is ignored for PAYE."
                  : "Only ZiG income is taxed. USD income is ignored for PAYE."
            }
          >
            <SelectInput
              id="salary_currency_mode"
              name="salary_currency_mode"
              value={salaryCurrencyMode}
              onChange={(e) =>
                setSalaryCurrencyMode(e.target.value as "USD_ONLY" | "ZIG_ONLY" | "MIXED")
              }
              options={["MIXED", "USD_ONLY", "ZIG_ONLY"]}
              placeholder="MIXED"
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
            hint="The user account this employee signs in as."
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
            required={mode === "create"}
            hint={
              mode === "create"
                ? "Required — we auto-create a login account for the employee at this address on save, and Frappe emails a set-your-password link so they can access their self-service dashboard. Personal email works as a fallback if there's no company address yet."
                : undefined
            }
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
            hint={
              mode === "create"
                ? "Used as the login address only when Company email is empty."
                : undefined
            }
          >
            <TextInput
              id="personal_email"
              name="personal_email"
              type="email"
              defaultValue={v.personal_email}
              invalid={Boolean(fe.personal_email)}
            />
          </Field>
          {mode === "create" && canAssignRoles && personaRoles && personaRoles.length > 0 && (
            <LoginRolesSection personaRoles={personaRoles} />
          )}
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
            hint="Manager (employee record)."
          >
            <SelectInput
              id="reports_to"
              name="reports_to"
              defaultValue={v.reports_to}
              options={reportsToOptions}
              placeholder="—"
            />
          </Field>
          <Field
            label="Leave approver"
            htmlFor="leave_approver"
            hint="Employee who approves this person's leave."
          >
            <SelectInput
              id="leave_approver"
              name="leave_approver"
              defaultValue={v.leave_approver}
              options={approverOptions}
              placeholder="—"
            />
          </Field>
          <Field
            label="Expense approver"
            htmlFor="expense_approver"
            hint="Employee who approves expense claims."
          >
            <SelectInput
              id="expense_approver"
              name="expense_approver"
              defaultValue={v.expense_approver}
              options={approverOptions}
              placeholder="—"
            />
          </Field>
          <Field
            label="Shift request approver"
            htmlFor="shift_request_approver"
            hint="Employee who approves shift-change requests."
          >
            <SelectInput
              id="shift_request_approver"
              name="shift_request_approver"
              defaultValue={v.shift_request_approver}
              options={approverOptions}
              placeholder="—"
            />
          </Field>
        </Grid>
        <Hint>
          Leave blank to inherit the approver configured on the department.
        </Hint>
      </TabPane>

      <TabPane active={tab} id="profile">
        <Field
          label="Profile image"
          htmlFor="image"
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

      <div className="-mx-1 mt-6 flex flex-wrap items-center justify-between gap-2 rounded-card border border-hairline bg-surface/95 p-3 shadow-rail backdrop-blur">
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
          <SubmitButton
            mode={mode}
            disabled={ageBelowLimit && !ageWaiverGranted}
          />
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

/**
 * Login roles picker for the Employee create wizard. Renders a
 * two-column checkbox grid of every persona role, plus an amber
 * "Employee (self-service) is always applied" hint so admins know the
 * base role isn't optional. Only visible on `mode="create"` and only
 * when the caller is an IT/HR Admin (gated at the callsite) — matches
 * the server-side gate on
 * `recruitment_app.api.me.set_login_roles_for_employee`.
 *
 * Posts each ticked role as a repeated `login_roles` FormData entry;
 * the Server Action reads them with `form.getAll("login_roles")`.
 */
function LoginRolesSection({
  personaRoles,
}: {
  personaRoles: string[];
}) {
  // Employee is auto-applied backend-side (set_login_roles_for_employee
  // forces it back in), so we don't offer it here — showing a checkbox
  // that can't actually be unchecked would be a lie.
  const roles = personaRoles.filter((r) => r !== "Employee");
  return (
    <div className="sm:col-span-2 flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Login roles (optional)
        </label>
        <p className="text-xs text-muted-foreground">
          Extra personas this employee gets on their login. Anything
          you skip can still be added later from Settings → Users.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-1.5 rounded-card border border-hairline bg-canvas/40 p-3 sm:grid-cols-2">
        {roles.map((role) => (
          <label
            key={role}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-muted/40"
          >
            <input
              type="checkbox"
              name="login_roles"
              value={role}
              className="h-4 w-4 rounded border-input"
            />
            <span>{role}</span>
          </label>
        ))}
      </div>
      <p className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-100/60 px-3 py-2 text-[11px] text-amber-900">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden />
        <span>
          <b>Employee</b> (self-service — attendance, leave, payslips,
          profile) is always applied so the hire can access their own
          dashboard. You don&apos;t need to tick anything if that&apos;s all
          they need.
        </span>
      </p>
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 flex items-start gap-2 rounded-card border border-amber-300 bg-amber-100/60 px-4 py-3 text-xs font-medium text-amber-900">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

function SubmitButton({
  mode,
  disabled,
}: {
  mode: "create" | "edit";
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
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

function ensureOptionPresent(
  options: Array<{ value: string; label: string }>,
  value: string,
): Array<{ value: string; label: string }> {
  if (!value) return options;
  if (options.some((o) => o.value === value)) return options;
  // Preserve the saved value verbatim so submitting the form doesn't drop
  // it. Label falls back to the raw value since we have no other info.
  return [{ value, label: value }, ...options];
}

function computeAgeYears(dob: string): number | null {
  if (!dob) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!m) return null;
  const [, y, mo, d] = m;
  const birth = new Date(Number(y), Number(mo) - 1, Number(d));
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) age--;
  return age;
}

function splitFirst(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return parts[0] ?? "";
}

function splitLast(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1]! : "";
}

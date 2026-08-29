import "server-only";
import { frappeCall } from "./client";

/** Trimmed projection for the directory table. */
export type EmployeeListRow = {
  /** Doc id (e.g. `HR-EMP-00001`). Stable URL identifier. */
  id: string;
  name: string;
  designation: string | null;
  department: string | null;
  status: EmployeeStatus;
  imageUrl: string | null;
  dateOfJoining: string | null;
  userId: string | null;
  mobile: string | null;
  email: string | null;
  company: string | null;
};

export type EmployeeStatus =
  | "Active"
  | "Left"
  | "Inactive"
  | "Suspended"
  | string;

export type ListResult = {
  rows: EmployeeListRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type DirectoryFacets = {
  departments: string[];
  statuses: EmployeeStatus[];
};

export type EmployeeFull = {
  id: string;
  name: string;
  designation: string | null;
  department: string | null;
  branch: string | null;
  company: string | null;
  status: EmployeeStatus;
  gender: string | null;
  dateOfBirth: string | null;
  dateOfJoining: string | null;
  dateOfRetirement: string | null;
  relievingDate: string | null;
  imageUrl: string | null;
  userId: string | null;
  email: string | null;
  personalEmail: string | null;
  mobile: string | null;
  emergencyContactName: string | null;
  emergencyContactNumber: string | null;
  currentAddress: string | null;
  permanentAddress: string | null;
  reportsTo: string | null;
  expenseApprover: string | null;
  leaveApprover: string | null;
  shiftRequestApprover: string | null;
  holidayList: string | null;
  defaultShift: string | null;
  bio: string | null;
  employmentType: string | null;
  grade: string | null;
  /** When true, attendance check-ins for this employee bypass geofence
   *  validation. Set by HR/Shift Manager only. */
  geofenceExempt: boolean;
  // ── Zimbabwe statutory + pay structure (Phase 5) ────────────────
  nationalId: string | null;
  taxNumber: string | null;        // ZIMRA / ITF
  nssaNumber: string | null;
  bankName: string | null;
  bankAccount: string | null;
  basicUsd: number;
  basicZig: number;
  pensionPct: number;              // percent — 5 = 5%
  medicalAidUsd: number;
  necDuesUsd: number;
  /** When true, `necDuesUsd` is authoritative. When false, dues are
   *  auto-computed from the industry rate at edit time. */
  necDuesOverride: boolean;
  /** ZIMRA elderly credit eligibility (55+). Engine applies the
   *  tenant's `elderly_credit_monthly_usd` when set. */
  isElderly: boolean;
  /** ZIMRA blind / disabled credit eligibility. */
  isDisabled: boolean;
  /** FDS = cumulative Final Deduction System. NON_FDS = independent
   *  monthly calc (no YTD, no credits). Defaults to FDS. */
  taxMethod: "FDS" | "NON_FDS";
  /** USD_ONLY / ZIG_ONLY / MIXED — drives which ZIMRA tax table(s)
   *  the engine uses. */
  salaryCurrencyMode: "USD_ONLY" | "ZIG_ONLY" | "MIXED";
  necIndustry: string | null;
  payGrade: string | null;
  payPoint: string | null;
  /** HR-only override of the company's minimum hire age policy. When
   *  true, the backend allowed the save despite age < min; a written
   *  reason is required. */
  ageWaiverGranted: boolean;
  ageWaiverReason: string | null;
  // Child tables (Frappe returns these inline with frappe.client.get).
  // Editable via recruitment_app.api.employee_child_tables.replace_child_tables.
  education: EmployeeEducationRow[];
  externalWorkHistory: EmployeeExternalWorkHistoryRow[];
  // Internal work history is written by transfer/promotion actions —
  // rendered read-only here.
  internalWorkHistory: EmployeeInternalWorkHistoryRow[];
  skills: EmployeeSkillRow[];
};

export type EmployeeEducationRow = {
  schoolUniversity: string | null;
  qualification: string | null;
  level: string | null;
  yearOfCompletion: number | null;
  classGrade: string | null;
};

export type EmployeeExternalWorkHistoryRow = {
  company: string | null;
  jobTitle: string | null;
  salary: number | null;
  address: string | null;
  contact: string | null;
  totalExperience: string | null;
};

export type EmployeeInternalWorkHistoryRow = {
  branch: string | null;
  department: string | null;
  jobTitle: string | null;
  fromDate: string | null;
  toDate: string | null;
};

export type EmployeeSkillRow = {
  skill: string;
  proficiency: number | null;
  evaluationDate: string | null;
};

export type EmployeeSkillMap = {
  employee: string;
  employeeSkills: EmployeeSkillRow[];
  trainings: Array<{
    training: string | null;
    fromDate: string | null;
    toDate: string | null;
    status: string | null;
  }>;
} | null;

type ListArgs = {
  doctype: string;
  fields?: string[];
  filters?: string;
  or_filters?: string;
  order_by?: string;
  limit_start?: number;
  limit_page_length?: number;
  group_by?: string;
};

/**
 * Fetches a single page of the employee directory. Search is OR-ed across the
 * three fields a user actually identifies someone by: doc id, full name, and
 * email/user id. Filters compose as AND on top.
 */
export async function listEmployees(opts: {
  q?: string;
  department?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<ListResult> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, opts.pageSize ?? 25));

  const filters: Array<[string, string, string | string[]]> = [];
  if (opts.department) filters.push(["department", "=", opts.department]);
  if (opts.status) filters.push(["status", "=", opts.status]);

  const orFilters = opts.q
    ? [
        ["employee_name", "like", `%${opts.q}%`],
        ["name", "like", `%${opts.q}%`],
        ["user_id", "like", `%${opts.q}%`],
      ]
    : undefined;

  // Frappe v15 only lets us pass fields it marks `in_list_view` here. Fields
  // like company_email / cell_number trip "Field not permitted in query"
  // and are still surfaced on the detail page (frappe.client.get). Anything
  // in this list must be in_list_view on the DocType.
  const args: ListArgs = {
    doctype: "Employee",
    fields: [
      "name",
      "employee_name",
      "department",
      "designation",
      "status",
      "image",
      "date_of_joining",
      "user_id",
      "company",
    ],
    filters: JSON.stringify(filters),
    or_filters: orFilters ? JSON.stringify(orFilters) : undefined,
    order_by: "employee_name asc",
    limit_start: (page - 1) * pageSize,
    limit_page_length: pageSize,
  };

  // Reads run as the signed-in user so Frappe's row-level perms decide what
  // they see (HR Manager → everyone; line manager → their team; etc.).
  const [rowsRaw, totalRaw] = await Promise.all([
    frappeCall<RawEmployeeRow[]>({
      method: "frappe.client.get_list",
      args,
      as: "user",
    }),
    frappeCall<number>({
      method: "frappe.client.get_count",
      args: {
        doctype: "Employee",
        filters: JSON.stringify(filters),
        or_filters: orFilters ? JSON.stringify(orFilters) : undefined,
      },
      as: "user",
    }),
  ]);

  return {
    rows: rowsRaw.map(toRow),
    total: Number(totalRaw ?? 0),
    page,
    pageSize,
  };
}

/** Departments and statuses for the directory filter chips. */
export async function fetchDirectoryFacets(): Promise<DirectoryFacets> {
  const [departmentsRaw] = await Promise.all([
    frappeCall<Array<{ name: string }>>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Department",
        fields: ["name"],
        order_by: "name asc",
        limit_page_length: 200,
      },
      as: "user",
    }).catch(() => []),
  ]);
  return {
    departments: departmentsRaw.map((d) => d.name).filter(Boolean),
    // Frappe Employee.status is a Select with these values. Hard-coding avoids
    // a metadata call and keeps the filter render synchronous.
    statuses: ["Active", "Inactive", "Suspended", "Left"],
  };
}

/** Full employee record for the detail page. */
export async function getEmployee(id: string): Promise<EmployeeFull | null> {
  try {
    const doc = await frappeCall<RawEmployeeDoc>({
      method: "frappe.client.get",
      args: { doctype: "Employee", name: id },
      as: "user",
    });
    return toFull(doc);
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

// --- internal ---------------------------------------------------------------

type RawEmployeeRow = {
  name: string;
  employee_name: string | null;
  department: string | null;
  designation: string | null;
  status: string | null;
  image: string | null;
  date_of_joining: string | null;
  user_id: string | null;
  company: string | null;
};

type RawEmployeeDoc = RawEmployeeRow & {
  designation: string | null;
  cell_number: string | null;
  company_email: string | null;
  personal_email: string | null;
  branch: string | null;
  gender: string | null;
  date_of_birth: string | null;
  date_of_retirement: string | null;
  relieving_date: string | null;
  current_address: string | null;
  permanent_address: string | null;
  emergency_phone_number: string | null;
  person_to_be_contacted: string | null;
  reports_to: string | null;
  expense_approver: string | null;
  leave_approver: string | null;
  shift_request_approver: string | null;
  holiday_list: string | null;
  default_shift: string | null;
  bio: string | null;
  employment_type: string | null;
  grade: string | null;
  geofence_exempt: 0 | 1 | boolean | null;
  // Phase 5 ZW Custom Fields
  national_id: string | null;
  tax_number: string | null;
  nssa_number: string | null;
  bank_name: string | null;
  bank_account: string | null;
  basic_usd: number | null;
  basic_zig: number | null;
  pension_pct: number | null;
  medical_aid_usd: number | null;
  nec_dues_usd: number | null;
  nec_dues_override: 0 | 1 | boolean | null;
  is_elderly: 0 | 1 | boolean | null;
  is_disabled: 0 | 1 | boolean | null;
  tax_method: string | null;
  salary_currency_mode: string | null;
  nec_industry: string | null;
  pay_grade: string | null;
  pay_point: string | null;
  // compliance
  age_waiver_granted: 0 | 1 | boolean | null;
  age_waiver_reason: string | null;
  // Child tables — `frappe.client.get` returns these inline as arrays.
  education?: RawEmployeeEducation[] | null;
  external_work_history?: RawEmployeeExternalWorkHistory[] | null;
  internal_work_history?: RawEmployeeInternalWorkHistory[] | null;
  skills?: RawEmployeeSkill[] | null;
};

type RawEmployeeEducation = {
  schooluniversity?: string | null;
  qualification?: string | null;
  level?: string | null;
  year_of_completion?: number | string | null;
  class_grade?: string | null;
};

type RawEmployeeExternalWorkHistory = {
  company?: string | null;
  designation?: string | null;      // some Frappe builds
  job_title?: string | null;         // this build
  salary?: number | string | null;
  address?: string | null;
  contact?: string | null;
  total_experience?: string | null;
};

type RawEmployeeInternalWorkHistory = {
  branch?: string | null;
  department?: string | null;
  job_title?: string | null;
  designation?: string | null;
  from_date?: string | null;
  to_date?: string | null;
};

type RawEmployeeSkill = {
  skill?: string | null;
  proficiency?: number | string | null;
  evaluation_date?: string | null;
};

function toRow(r: RawEmployeeRow): EmployeeListRow {
  return {
    id: r.name,
    name: r.employee_name ?? r.name,
    designation: r.designation,
    department: r.department,
    status: (r.status ?? "Active") as EmployeeStatus,
    imageUrl: r.image,
    dateOfJoining: r.date_of_joining,
    userId: r.user_id,
    mobile: null,
    email: r.user_id,
    company: r.company,
  };
}

function toFull(d: RawEmployeeDoc): EmployeeFull {
  return {
    ...toRow(d),
    designation: d.designation,
    mobile: d.cell_number,
    email: d.company_email ?? d.personal_email ?? d.user_id,
    branch: d.branch,
    gender: d.gender,
    dateOfBirth: d.date_of_birth,
    dateOfRetirement: d.date_of_retirement,
    relievingDate: d.relieving_date,
    currentAddress: d.current_address,
    permanentAddress: d.permanent_address,
    personalEmail: d.personal_email,
    emergencyContactName: d.person_to_be_contacted,
    emergencyContactNumber: d.emergency_phone_number,
    reportsTo: d.reports_to,
    expenseApprover: d.expense_approver,
    leaveApprover: d.leave_approver,
    shiftRequestApprover: d.shift_request_approver,
    holidayList: d.holiday_list,
    defaultShift: d.default_shift,
    bio: d.bio,
    employmentType: d.employment_type,
    grade: d.grade,
    geofenceExempt: Boolean(d.geofence_exempt),
    nationalId: d.national_id,
    taxNumber: d.tax_number,
    nssaNumber: d.nssa_number,
    bankName: d.bank_name,
    bankAccount: d.bank_account,
    basicUsd: Number(d.basic_usd ?? 0),
    basicZig: Number(d.basic_zig ?? 0),
    pensionPct: Number(d.pension_pct ?? 0),
    medicalAidUsd: Number(d.medical_aid_usd ?? 0),
    necDuesUsd: Number(d.nec_dues_usd ?? 0),
    necDuesOverride: Boolean(d.nec_dues_override),
    isElderly: Boolean(d.is_elderly),
    isDisabled: Boolean(d.is_disabled),
    taxMethod: (d.tax_method === "NON_FDS" ? "NON_FDS" : "FDS"),
    salaryCurrencyMode:
      d.salary_currency_mode === "USD_ONLY" ? "USD_ONLY"
      : d.salary_currency_mode === "ZIG_ONLY" ? "ZIG_ONLY"
      : "MIXED",
    necIndustry: d.nec_industry,
    payGrade: d.pay_grade,
    payPoint: d.pay_point,
    ageWaiverGranted: Boolean(d.age_waiver_granted),
    ageWaiverReason: d.age_waiver_reason,
    education: (d.education ?? []).map(mapEducation),
    externalWorkHistory: (d.external_work_history ?? []).map(mapExternal),
    internalWorkHistory: (d.internal_work_history ?? []).map(mapInternal),
    skills: (d.skills ?? []).map(mapSkill),
  };
}

function mapEducation(r: RawEmployeeEducation): EmployeeEducationRow {
  return {
    schoolUniversity: r.schooluniversity ?? null,
    qualification: r.qualification ?? null,
    level: r.level ?? null,
    yearOfCompletion: numOrNull(r.year_of_completion),
    classGrade: r.class_grade ?? null,
  };
}

function mapExternal(r: RawEmployeeExternalWorkHistory): EmployeeExternalWorkHistoryRow {
  return {
    company: r.company ?? null,
    jobTitle: r.job_title ?? r.designation ?? null,
    salary: numOrNull(r.salary),
    address: r.address ?? null,
    contact: r.contact ?? null,
    totalExperience: r.total_experience ?? null,
  };
}

function mapInternal(r: RawEmployeeInternalWorkHistory): EmployeeInternalWorkHistoryRow {
  return {
    branch: r.branch ?? null,
    department: r.department ?? null,
    jobTitle: r.job_title ?? r.designation ?? null,
    fromDate: r.from_date ?? null,
    toDate: r.to_date ?? null,
  };
}

function mapSkill(r: RawEmployeeSkill): EmployeeSkillRow {
  return {
    skill: r.skill ?? "",
    // Frappe's Rating field stores 0.0-1.0; UI displays / accepts 1-5.
    // Multiply by 5 on read, divide by 5 on write (see the Skills tab
    // serializer in employee-form.tsx). Round to 1 decimal so half-star
    // ratings survive the round-trip without floating-point noise.
    proficiency: fromRating(r.proficiency),
    evaluationDate: r.evaluation_date ?? null,
  };
}

function fromRating(v: number | string | null | undefined): number | null {
  const n = numOrNull(v);
  if (n === null) return null;
  return Math.round(n * 5 * 10) / 10;
}

function numOrNull(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function isNotFound(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const status = (err as { status?: number }).status;
  return status === 404;
}

/** Read-only fetch of the per-employee Skill Map (skills + trainings matrix
 *  written by the performance/training modules). Returns null when no map
 *  exists — HRMS auto-creates it on first save from the Skills tab. */
export async function getEmployeeSkillMap(
  employeeId: string,
): Promise<EmployeeSkillMap> {
  try {
    const doc = await frappeCall<{
      employee: string;
      employee_skills?: RawEmployeeSkill[] | null;
      trainings?: Array<{
        training?: string | null;
        from_date?: string | null;
        to_date?: string | null;
        status?: string | null;
      }> | null;
    }>({
      method: "frappe.client.get",
      args: { doctype: "Employee Skill Map", name: employeeId },
      as: "user",
    });
    return {
      employee: doc.employee,
      employeeSkills: (doc.employee_skills ?? []).map(mapSkill),
      trainings: (doc.trainings ?? []).map((t) => ({
        training: t.training ?? null,
        fromDate: t.from_date ?? null,
        toDate: t.to_date ?? null,
        status: t.status ?? null,
      })),
    };
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

/** Payload sent to `replace_child_tables`. Omit any field to leave the
 *  corresponding child table untouched; pass `[]` to clear it. */
export type ChildTableUpdate = {
  education?: Array<{
    schooluniversity?: string;
    qualification?: string;
    level?: string;
    year_of_completion?: number;
    class_grade?: string;
  }>;
  external_work_history?: Array<{
    company?: string;
    job_title?: string;
    salary?: number;
    address?: string;
    contact?: string;
    total_experience?: string;
  }>;
  skills?: Array<{
    skill: string;
    proficiency?: number;
    evaluation_date?: string;
  }>;
};

/** Whitelisted server call — replaces the specified child tables in-place
 *  without touching scalar Employee fields (so grade/salary invariants
 *  stay quiet). See recruitment_app/api/employee_child_tables.py. */
export async function replaceEmployeeChildTables(
  employeeId: string,
  update: ChildTableUpdate,
): Promise<void> {
  await frappeCall<{ ok: boolean }>({
    method: "recruitment_app.api.employee_child_tables.replace_child_tables",
    verb: "POST",
    args: {
      employee: employeeId,
      ...(update.education !== undefined && {
        education: JSON.stringify(update.education),
      }),
      ...(update.external_work_history !== undefined && {
        external_work_history: JSON.stringify(update.external_work_history),
      }),
      ...(update.skills !== undefined && {
        skills: JSON.stringify(update.skills),
      }),
    },
    as: "user",
  });
}

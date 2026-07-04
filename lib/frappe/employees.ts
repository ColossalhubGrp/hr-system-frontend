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
  employeeNumber: string | null;
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
};

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
  // like designation / company_email / cell_number trip "Field not permitted
  // in query" — we surface those on the detail page (frappe.client.get) and
  // keep the directory to the safe subset.
  const args: ListArgs = {
    doctype: "Employee",
    fields: [
      "name",
      "employee_name",
      "department",
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
  employee_number: string | null;
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
};

function toRow(r: RawEmployeeRow): EmployeeListRow {
  return {
    id: r.name,
    name: r.employee_name ?? r.name,
    designation: null,
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
    employeeNumber: d.employee_number,
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
  };
}

function isNotFound(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const status = (err as { status?: number }).status;
  return status === 404;
}

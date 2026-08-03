import "server-only";
import { frappeCall } from "./client";

/**
 * Form options pulled from Frappe link doctypes. Each is short enough to ship
 * as a `<select>` without pagination — when a tenant grows past these limits
 * we'll swap individual selects to a typeahead, not the whole form.
 */
export type EmployeeFormOptions = {
  companies: string[];
  /** Per-company minimum hire age (years). Read from
   *  `Company.minimum_hire_age_years`. Missing / 0 = policy not
   *  configured; frontend skips the below-limit check. Default seeded
   *  by the DocType is 16 for Zimbabwe general labour. */
  companyMinHireAge: Record<string, number>;
  departments: string[];
  designations: string[];
  branches: string[];
  employmentTypes: string[];
  holidayLists: string[];
  shifts: string[];
  /** Pay grades from Setup → Pay Grades (Payroll Pay Grade). Drives
   *  Employee.pay_grade AND the lifecycle sub-flows (Onboarding /
   *  Promotion) after patch 30 repointed their Link options here.
   *  Falls back to `DEFAULT_GRADES` when the tenant hasn't set up
   *  payroll yet, so basic HR still has a usable grade picker. */
  payGrades: string[];
  /** Per-grade metadata the edit form needs to enforce the NEC-
   *  ceiling rule. Keyed by grade code. Missing (or empty when the
   *  tenant hasn't loaded a grading system yet) → the form falls
   *  through to editable + zero. */
  payGradeInfo: Record<
    string,
    { salary_usd: number; salary_zig: number; is_nec_grade: boolean }
  >;
  /** NEC industries from Setup → NEC / industry. Drives the industry
   *  dropdown on the Employee edit form; picking one + an inside-NEC
   *  grade auto-fills basic salary from that industry's schedule. */
  necIndustries: string[];
  /** Per-industry dues rates for the auto-computed NEC dues field.
   *  Empty when the tenant hasn't published a rate yet. */
  necIndustryInfo: Record<
    string,
    { dues_amount_usd: number; dues_pct: number; employer_share_pct: number }
  >;
  /** Every Active employee in the tenant, used by the approver /
   *  reports-to / lifecycle pickers so HR selects a real record
   *  instead of typing a raw ID. Includes each employee's current
   *  department / designation / grade so lifecycle forms can
   *  auto-fill those fields on selection. Grows to a typeahead once
   *  tenants outgrow the 500-employee ceiling. */
  employeeDirectory: Array<{
    id: string;
    employee_name: string;
    user_id: string | null;
    department: string | null;
    designation: string | null;
    pay_grade: string | null;
    company: string | null;
    branch: string | null;
    reports_to: string | null;
    employment_type: string | null;
    default_shift: string | null;
  }>;
};

const EMPLOYMENT_FALLBACK = [
  "Full-time",
  "Part-time",
  "Probation",
  "Contract",
  "Commission",
  "Piecework",
  "Intern",
  "Apprentice",
];

/**
 * Baseline role-tier labels the grade picker falls back to when the
 * tenant hasn't populated Payroll Pay Grade yet (e.g. hasn't
 * subscribed to Payroll). Once the admin loads a real grading system
 * in /payroll/setup/pay-grades, those grades take over automatically.
 */
const DEFAULT_GRADES = [
  "Junior",
  "Officer",
  "Senior Officer",
  "Manager",
  "Senior Manager",
  "Director",
  "Executive Director",
];

export async function fetchEmployeeFormOptions(): Promise<EmployeeFormOptions> {
  const [
    companyRows,
    departments,
    designations,
    branches,
    employmentTypes,
    holidayLists,
    shifts,
    payGradeRows,
    necIndustryRows,
    employeeDirectory,
  ] = await Promise.all([
    listCompaniesWithMinAge(),
    listNames("Department"),
    listNames("Designation"),
    listNames("Branch"),
    listNames("Employment Type"),
    listNames("Holiday List"),
    listNames("Shift Type"),
    listPayGradesFull(),
    listNecIndustriesFull(),
    listEmployeeDirectory(),
  ] as const);
  const companies = companyRows.map((r) => r.name);
  const companyMinHireAge: Record<string, number> = {};
  for (const r of companyRows) {
    companyMinHireAge[r.name] = Number(r.minimum_hire_age_years ?? 0) || 0;
  }
  const necIndustries = necIndustryRows.map((r) => r.name);
  const necIndustryInfo: EmployeeFormOptions["necIndustryInfo"] = {};
  for (const r of necIndustryRows) {
    necIndustryInfo[r.name] = {
      dues_amount_usd: Number(r.dues_amount_usd ?? 0),
      dues_pct: Number(r.dues_pct ?? 0),
      employer_share_pct: Number(r.employer_share_pct ?? 50),
    };
  }

  const payGrades = payGradeRows.length > 0
    ? payGradeRows.map((r) => r.code)
    : DEFAULT_GRADES;
  const payGradeInfo: EmployeeFormOptions["payGradeInfo"] = {};
  for (const r of payGradeRows) {
    payGradeInfo[r.code] = {
      salary_usd: Number(r.salary_usd ?? 0),
      salary_zig: Number(r.salary_zig ?? 0),
      is_nec_grade: Boolean(r.is_nec_grade),
    };
  }

  return {
    companies,
    companyMinHireAge,
    departments,
    designations,
    branches,
    employmentTypes:
      employmentTypes.length > 0 ? employmentTypes : EMPLOYMENT_FALLBACK,
    holidayLists,
    shifts,
    payGrades,
    payGradeInfo,
    necIndustries,
    necIndustryInfo,
    employeeDirectory,
  };
}

async function listEmployeeDirectory(): Promise<
  EmployeeFormOptions["employeeDirectory"]
> {
  // Enriched fetch — needs the four "prefill" fields to exist on Employee.
  // designation and pay_grade are custom fields on some tenants; a missing
  // column here makes Frappe reject the entire get_list, which is why the
  // dropdown emptied out after f1f9393. Fall through to the minimal
  // guaranteed fields so the picker keeps working even without prefill.
  type EnrichedRow = {
    name: string;
    employee_name: string | null;
    user_id: string | null;
    department: string | null;
    designation: string | null;
    pay_grade: string | null;
    company: string | null;
    branch: string | null;
    reports_to: string | null;
    employment_type: string | null;
    default_shift: string | null;
  };
  try {
    const rows = await frappeCall<EnrichedRow[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Employee",
        fields: [
          "name",
          "employee_name",
          "user_id",
          "department",
          "designation",
          "pay_grade",
          "company",
          "branch",
          "reports_to",
          "employment_type",
          "default_shift",
        ],
        filters: JSON.stringify([["status", "=", "Active"]]),
        order_by: "employee_name asc",
        limit_page_length: 500,
      },
      as: "user",
    });
    return (rows ?? []).map((r) => ({
      id: r.name,
      employee_name: r.employee_name ?? r.name,
      user_id: r.user_id,
      department: r.department,
      designation: r.designation,
      pay_grade: r.pay_grade,
      company: r.company,
      branch: r.branch,
      reports_to: r.reports_to,
      employment_type: r.employment_type,
      default_shift: r.default_shift,
    }));
  } catch {
    // Minimal fallback — only the fields the native Employee JSON is
    // guaranteed to have. Prefill just won't happen for department /
    // designation / grade on this tenant until the custom fields ship.
    try {
      type MinRow = {
        name: string;
        employee_name: string | null;
        user_id: string | null;
      };
      const rows = await frappeCall<MinRow[]>({
        method: "frappe.client.get_list",
        args: {
          doctype: "Employee",
          fields: ["name", "employee_name", "user_id"],
          filters: JSON.stringify([["status", "=", "Active"]]),
          order_by: "employee_name asc",
          limit_page_length: 500,
        },
        as: "user",
      });
      return (rows ?? []).map((r) => ({
        id: r.name,
        employee_name: r.employee_name ?? r.name,
        user_id: r.user_id,
        department: null,
        designation: null,
        pay_grade: null,
        company: null,
        branch: null,
        reports_to: null,
        employment_type: null,
        default_shift: null,
      }));
    } catch {
      return [];
    }
  }
}

type NecIndustryFullRow = {
  name: string;
  dues_amount_usd: number | null;
  dues_pct: number | null;
  employer_share_pct: number | null;
};

async function listNecIndustriesFull(): Promise<NecIndustryFullRow[]> {
  try {
    const rows = await frappeCall<NecIndustryFullRow[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Payroll NEC Industry",
        fields: ["name", "dues_amount_usd", "dues_pct", "employer_share_pct"],
        order_by: "industry_name asc",
        limit_page_length: 200,
      },
      as: "user",
    });
    return rows ?? [];
  } catch {
    return [];
  }
}

type PayGradeRow = {
  code: string;
  salary_usd: number | null;
  salary_zig: number | null;
  is_nec_grade: 0 | 1 | boolean | null;
};

async function listPayGradesFull(): Promise<PayGradeRow[]> {
  try {
    const rows = await frappeCall<PayGradeRow[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Payroll Pay Grade",
        fields: ["code", "salary_usd", "salary_zig", "is_nec_grade"],
        order_by: "code asc",
        limit_page_length: 200,
      },
      as: "user",
    });
    return rows ?? [];
  } catch {
    return [];
  }
}

type CompanyMinAgeRow = { name: string; minimum_hire_age_years: number | null };

async function listCompaniesWithMinAge(): Promise<CompanyMinAgeRow[]> {
  try {
    const rows = await frappeCall<CompanyMinAgeRow[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Company",
        fields: ["name", "minimum_hire_age_years"],
        order_by: "name asc",
        limit_page_length: 200,
      },
      as: "user",
    });
    return rows ?? [];
  } catch {
    // The `minimum_hire_age_years` field ships with the DocType — a
    // fetch failure means the tenant simply hasn't run migrate yet.
    // Fall back to bare name-only listing so the form still renders.
    try {
      const rows = await frappeCall<Array<{ name: string }>>({
        method: "frappe.client.get_list",
        args: {
          doctype: "Company",
          fields: ["name"],
          order_by: "name asc",
          limit_page_length: 200,
        },
        as: "user",
      });
      return (rows ?? []).map((r) => ({ name: r.name, minimum_hire_age_years: null }));
    } catch {
      return [];
    }
  }
}

async function listNames(doctype: string): Promise<string[]> {
  try {
    const rows = await frappeCall<Array<{ name: string }>>({
      method: "frappe.client.get_list",
      args: {
        doctype,
        fields: ["name"],
        order_by: "name asc",
        limit_page_length: 200,
      },
      as: "user",
    });
    return rows.map((r) => r.name).filter(Boolean);
  } catch {
    // A missing-permission or missing-doctype error shouldn't blow up the
    // whole form; just drop that select to empty.
    return [];
  }
}

// --- write payload ---------------------------------------------------------

export type EmployeeFormInput = {
  // identity
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  image?: string;

  // job
  company: string;
  status: string;
  department?: string;
  designation?: string;
  branch?: string;
  employment_type?: string;
  /** Link → Payroll Pay Grade (Setup → Pay Grades). Replaces the
   *  legacy `grade` field which linked to ERPNext's Employment Grade. */
  pay_grade?: string;
  /** Basic monthly salary in USD. Read-only in the form when the
   *  chosen pay_grade is inside the tenant's NEC ceiling
   *  (`is_nec_grade=1`), editable when above. */
  basic_usd?: number;
  /** Basic monthly salary in ZiG. Same NEC-editability rule as
   *  basic_usd. */
  basic_zig?: number;
  /** Link → Payroll NEC Industry. When set together with an
   *  inside-NEC pay_grade, the salary auto-fills from that industry's
   *  grade_schedule (falling back to Payroll Pay Grade's flat salary
   *  if the NEC hasn't published a figure for that grade yet). */
  nec_industry?: string;
  /** Monthly NEC dues (employee side) — writes verbatim. When
   *  `nec_dues_override` is 0, the edit form computes this from the
   *  industry rate before submitting; when 1, admin-entered. */
  nec_dues_usd?: number;
  /** 1 = user-entered override; 0 = auto-computed from industry rate.
   *  FormData carries "0"/"1" strings via coerce. */
  nec_dues_override?: 0 | 1;
  /** ZIMRA elderly-persons credit eligibility (55+). Engine applies
   *  the tenant's `elderly_credit_monthly_usd` when set. */
  is_elderly?: 0 | 1;
  /** ZIMRA blind / disabled credit eligibility. */
  is_disabled?: 0 | 1;
  /** FDS (Final Deduction System — cumulative + credits) vs NON_FDS
   *  (independent per-period, no credits). */
  tax_method?: "FDS" | "NON_FDS";
  /** Which ZIMRA table(s) the engine applies for this employee. */
  salary_currency_mode?: "USD_ONLY" | "ZIG_ONLY" | "MIXED";
  date_of_joining: string;
  employee_number?: string;

  // contact
  cell_number?: string;
  company_email?: string;
  personal_email?: string;
  user_id?: string;
  current_address?: string;
  permanent_address?: string;
  person_to_be_contacted?: string;
  emergency_phone_number?: string;

  // approvers
  reports_to?: string;
  leave_approver?: string;
  expense_approver?: string;
  shift_request_approver?: string;

  // other
  holiday_list?: string;
  default_shift?: string;
  bio?: string;

  // compliance
  /** HR-only override for `Company.minimum_hire_age_years`. Backend
   *  rejects the save when age < min AND this flag is 0. */
  age_waiver_granted?: 0 | 1;
  /** Required when `age_waiver_granted` is 1. Free text explaining
   *  the exception (registered apprenticeship, court order, etc.). */
  age_waiver_reason?: string;
};

/** Strip empty strings — Frappe interprets `""` as "set to blank" on save. */
function compact<T extends Record<string, unknown>>(o: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/**
 * Creates a new Employee doc as the currently logged-in user. Frappe assigns
 * the doc id via the naming series and returns the saved document.
 */
export async function createEmployee(input: EmployeeFormInput): Promise<string> {
  const doc = {
    doctype: "Employee",
    ...compact(input),
  };
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    args: { doc },
    verb: "POST",
    as: "user",
  });
  return saved.name;
}

/**
 * Updates an existing Employee. We use `frappe.client.set_value` with a dict
 * payload so only the supplied fields are touched — passing the full doc back
 * via `save` would clobber child tables (addresses, education, etc.) we don't
 * surface in this form.
 */
/**
 * Toggle the native `geofence_exempt` field on an Employee. Restricted to
 * HR/Shift Admin — caller MUST check `MyAccess.isShiftAdmin` before invoking;
 * the matching Server Action re-checks for defense-in-depth.
 */
export async function setEmployeeGeofenceExempt(
  employeeId: string,
  exempt: boolean,
): Promise<void> {
  await frappeCall<{ name: string }>({
    method: "frappe.client.set_value",
    args: {
      doctype: "Employee",
      name: employeeId,
      fieldname: { geofence_exempt: exempt ? 1 : 0 },
    },
    verb: "POST",
    as: "user",
  });
}

export async function updateEmployee(
  id: string,
  input: EmployeeFormInput,
): Promise<void> {
  const payload = compact(input);
  await frappeCall<{ name: string }>({
    method: "frappe.client.set_value",
    args: {
      doctype: "Employee",
      name: id,
      fieldname: payload,
    },
    verb: "POST",
    as: "user",
  });
}


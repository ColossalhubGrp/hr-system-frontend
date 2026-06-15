import "server-only";
import { frappeCall } from "./client";

/**
 * Form options pulled from Frappe link doctypes. Each is short enough to ship
 * as a `<select>` without pagination — when a tenant grows past these limits
 * we'll swap individual selects to a typeahead, not the whole form.
 */
export type EmployeeFormOptions = {
  companies: string[];
  departments: string[];
  designations: string[];
  branches: string[];
  employmentTypes: string[];
  holidayLists: string[];
  shifts: string[];
  grades: string[];
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

export async function fetchEmployeeFormOptions(): Promise<EmployeeFormOptions> {
  const [
    companies,
    departments,
    designations,
    branches,
    employmentTypes,
    holidayLists,
    shifts,
    grades,
  ] = await Promise.all([
    listNames("Company"),
    listNames("Department"),
    listNames("Designation"),
    listNames("Branch"),
    listNames("Employment Type"),
    listNames("Holiday List"),
    listNames("Shift Type"),
    listNames("Employee Grade"),
  ] as const);

  return {
    companies,
    departments,
    designations,
    branches,
    employmentTypes:
      employmentTypes.length > 0 ? employmentTypes : EMPLOYMENT_FALLBACK,
    holidayLists,
    shifts,
    grades,
  };
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
  grade?: string;
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


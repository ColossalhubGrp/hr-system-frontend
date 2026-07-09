import "server-only";
import { frappeCall } from "./client";

/**
 * Company CRUD + the picker-doctype reads (Country / Currency / Holiday List)
 * the form needs.
 *
 * The Company `abbr` field is the prefix on every auto-named child record
 * (employees, leaves, attendance, payroll). Editing it post-create would
 * orphan everything that already uses the old prefix, so the edit form
 * exposes `abbr` as read-only.
 */

export type CompanyRow = {
  id: string;
  companyName: string;
  abbr: string | null;
  defaultCurrency: string | null;
  country: string | null;
  defaultHolidayList: string | null;
};

export type CompanyFull = CompanyRow & {
  taxId: string | null;
  dateOfEstablishment: string | null;
  phoneNo: string | null;
};

export type CompanyInput = {
  company_name: string;
  abbr: string;
  default_currency: string;
  country: string;
  default_holiday_list?: string;
  tax_id?: string;
  date_of_establishment?: string;
  phone_no?: string;
};

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * Returns the calling user's own tenant Company (via User Permission), or
 * null for cross-tenant admins (System Manager / Administrator). The
 * /settings/company page uses this to redirect non-admins straight to
 * their own company's edit form instead of exposing a list that could
 * leak other tenants' company names.
 */
export async function getMyCompany(): Promise<string | null> {
  try {
    const res = await frappeCall<{ company: string | null }>({
      method: "recruitment_app.api.me.my_company",
      as: "user",
    });
    return res?.company ?? null;
  } catch {
    return null;
  }
}


export async function listCompanies(): Promise<CompanyRow[]> {
  type Row = {
    name: string;
    company_name: string | null;
    abbr: string | null;
    default_currency: string | null;
    country: string | null;
    default_holiday_list: string | null;
  };
  const rows = await frappeCall<Row[]>({
    method: "frappe.client.get_list",
    args: {
      doctype: "Company",
      fields: [
        "name",
        "company_name",
        "default_currency",
        "country",
        "abbr",
        "default_holiday_list",
      ],
      order_by: "company_name asc",
      limit_page_length: 200,
    },
    as: "user",
  }).catch(() => [] as Row[]);
  return rows.map((r) => ({
    id: r.name,
    companyName: r.company_name ?? r.name,
    abbr: r.abbr,
    defaultCurrency: r.default_currency,
    country: r.country,
    defaultHolidayList: r.default_holiday_list,
  }));
}

export async function getCompany(id: string): Promise<CompanyFull | null> {
  try {
    type Raw = {
      name: string;
      company_name: string | null;
      abbr: string | null;
      default_currency: string | null;
      country: string | null;
      default_holiday_list: string | null;
      tax_id: string | null;
      date_of_establishment: string | null;
      phone_no: string | null;
    };
    const doc = await frappeCall<Raw>({
      method: "frappe.client.get",
      args: { doctype: "Company", name: id },
      as: "user",
    });
    return {
      id: doc.name,
      companyName: doc.company_name ?? doc.name,
      abbr: doc.abbr,
      defaultCurrency: doc.default_currency,
      country: doc.country,
      defaultHolidayList: doc.default_holiday_list,
      taxId: doc.tax_id,
      dateOfEstablishment: doc.date_of_establishment,
      phoneNo: doc.phone_no,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function createCompany(input: CompanyInput): Promise<string> {
  const doc = { doctype: "Company", ...compact(input) };
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    verb: "POST",
    args: { doc },
    as: "user",
  });
  return saved.name;
}

/**
 * Edit a Company. NOTE: `abbr` is excluded from the writable fields here —
 * even if the caller sends it, we strip it. Changing abbr would rename every
 * child record's auto-id and break historical references.
 */
export async function updateCompany(
  id: string,
  input: Omit<CompanyInput, "abbr">,
): Promise<void> {
  await frappeCall<unknown>({
    method: "frappe.client.set_value",
    verb: "POST",
    args: {
      doctype: "Company",
      name: id,
      fieldname: compact(input),
    },
    as: "user",
  });
}

// ---------------------------------------------------------------------------
// Picker reads — Country / Currency / Holiday List
// ---------------------------------------------------------------------------

export async function listCountries(): Promise<string[]> {
  return await listNames("Country", 300);
}

export async function listCurrencies(): Promise<string[]> {
  return await listNames("Currency", 300);
}

export async function listHolidayLists(): Promise<string[]> {
  return await listNames("Holiday List", 200);
}

async function listNames(doctype: string, limit: number): Promise<string[]> {
  type Row = { name: string };
  const rows = await frappeCall<Row[]>({
    method: "frappe.client.get_list",
    args: {
      doctype,
      fields: ["name"],
      order_by: "name asc",
      limit_page_length: limit,
    },
    as: "user",
  }).catch(() => [] as Row[]);
  return rows.map((r) => r.name).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function compact<T extends Record<string, unknown>>(o: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    out[k] = v;
  }
  return out;
}

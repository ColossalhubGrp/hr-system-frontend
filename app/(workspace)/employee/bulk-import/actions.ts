"use server";

import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { requireGroup } from "@/lib/frappe/require-role";
import { revalidatePath } from "next/cache";

/**
 * Columns HR fills in the template. `required: true` means the row is
 * rejected outright if this cell is blank; everything else is optional
 * and skipped when empty. Numbers are coerced from string, dates are
 * kept as YYYY-MM-DD.
 */
export const TEMPLATE_COLUMNS: Array<{
  key: string;
  label: string;
  required?: boolean;
  hint: string;
}> = [
  { key: "first_name",       label: "First name",        required: true,  hint: "e.g. Tinashe" },
  { key: "last_name",        label: "Last name",         required: true,  hint: "e.g. Moyo" },
  { key: "gender",           label: "Gender",            required: true,  hint: "Male / Female" },
  { key: "date_of_birth",    label: "Date of birth",     required: true,  hint: "YYYY-MM-DD (e.g. 1990-05-14)" },
  { key: "date_of_joining",  label: "Date of joining",   required: true,  hint: "YYYY-MM-DD" },
  { key: "company",          label: "Company",           required: true,  hint: "Exact name of an existing Company" },
  { key: "department",       label: "Department",        hint: "Exact name; created if missing" },
  { key: "job_title",        label: "Job title",         hint: "e.g. Payroll Officer" },
  { key: "employment_type",  label: "Employment type",   hint: "Permanent / Contract / Temporary" },
  { key: "branch",           label: "Branch",            hint: "e.g. Harare HQ" },
  { key: "marital_status",   label: "Marital status",    hint: "Single / Married / Divorced / Widowed" },
  { key: "blood_group",      label: "Blood group",       hint: "A+ / O- / …" },
  { key: "personal_email",   label: "Personal email",    hint: "used as login + payslip contact" },
  { key: "phone",            label: "Phone",             hint: "e.g. +263 77 123 4567" },
  { key: "current_address",  label: "Current address",   hint: "free-text" },
  { key: "national_id",      label: "National ID",       hint: "e.g. 63-1234567 K 63" },
  { key: "tax_number",       label: "ZIMRA tax no.",     hint: "e.g. BP2000123456" },
  { key: "nssa_number",      label: "NSSA no.",          hint: "e.g. NSSA-100000" },
  { key: "bank_name",        label: "Bank",              hint: "e.g. CBZ" },
  { key: "bank_account",     label: "Bank account",      hint: "digits only" },
  { key: "basic_usd",        label: "Basic USD",         hint: "monthly USD basic — number" },
  { key: "basic_zig",        label: "Basic ZiG",         hint: "monthly ZiG basic — number" },
  { key: "pension_pct",      label: "Pension %",         hint: "decimal (0.05 = 5%) OR percent (5 = 5%) — either works" },
  { key: "medical_aid_usd",  label: "Medical aid USD",   hint: "fixed monthly amount" },
  { key: "nec_dues_usd",     label: "NEC dues USD",      hint: "fixed monthly amount" },
];

export type ImportRowResult =
  | { row: number; ok: true;  employee: string; name: string }
  | { row: number; ok: false; error: string; input: Record<string, string> };

export type ImportSummary = {
  total: number;
  inserted: number;
  failed: number;
  results: ImportRowResult[];
};

/** Server-only CSV parser — handles quoted fields with commas + escaped
 *  quotes (`""`). Empty trailing lines are dropped. */
function parseCsv(text: string): string[][] {
  const clean = text.replace(/\r\n?/g, "\n");
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (inQuotes) {
      if (c === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else { field += c; }
    } else {
      if (c === '"')      { inQuotes = true; }
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n"){ row.push(field); field = ""; rows.push(row); row = []; }
      else                { field += c; }
    }
  }
  // trailing field
  if (field.length || row.length) { row.push(field); rows.push(row); }
  // drop blank trailing rows
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function num(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const s = v.trim();
  if (!s) return undefined;
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function normalizePensionPct(v: string | undefined): number | undefined {
  const n = num(v);
  if (n === undefined) return undefined;
  // Accept EITHER decimal (0.05) OR whole percent (5). Anything > 1 is
  // treated as whole percent and divided by 100 — matches the same
  // heuristic used to repair the seeded 500 employees.
  return n > 1 ? n / 100 : n;
}

function toIso(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const s = v.trim();
  if (!s) return undefined;
  // Accept ISO (2026-05-14) or common Excel formats (14/05/2026, 14-05-2026)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) {
    const d = m[1].padStart(2, "0");
    const mo = m[2].padStart(2, "0");
    return `${m[3]}-${mo}-${d}`;
  }
  return undefined;
}

function friendlyFrappe(err: unknown): string {
  if (err instanceof FrappeRequestError) {
    const detail = err.detail as { _server_messages?: string } | undefined;
    if (detail?._server_messages) {
      try {
        const arr = JSON.parse(detail._server_messages) as string[];
        const first = arr[0]
          ? (JSON.parse(arr[0]) as { message?: string })
          : undefined;
        if (first?.message) return first.message.replace(/<[^>]+>/g, "").trim();
      } catch { /* fall through */ }
    }
    return err.message || "Insert failed.";
  }
  return (err as { message?: string })?.message ?? "Unknown error.";
}

export async function bulkImportEmployeesAction(
  csvText: string,
): Promise<ImportSummary> {
  await requireGroup("HR_ANY");

  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    return { total: 0, inserted: 0, failed: 0, results: [] };
  }
  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const results: ImportRowResult[] = [];

  const seenEmails = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    const raw: Record<string, string> = {};
    header.forEach((h, idx) => { raw[h] = (cells[idx] ?? "").trim(); });

    // Required checks
    for (const req of ["first_name", "last_name", "gender", "date_of_birth", "date_of_joining", "company"]) {
      if (!raw[req]) {
        results.push({ row: i + 1, ok: false, error: `Missing required column: ${req}`, input: raw });
        break;
      }
    }
    if (results.length && results[results.length - 1].row === i + 1 && !results[results.length - 1].ok) continue;

    const dob = toIso(raw.date_of_birth);
    const doj = toIso(raw.date_of_joining);
    if (!dob) { results.push({ row: i + 1, ok: false, error: `Invalid date_of_birth: "${raw.date_of_birth}" — use YYYY-MM-DD`, input: raw }); continue; }
    if (!doj) { results.push({ row: i + 1, ok: false, error: `Invalid date_of_joining: "${raw.date_of_joining}" — use YYYY-MM-DD`, input: raw }); continue; }

    // Duplicate-in-batch guard on email
    const email = raw.personal_email?.toLowerCase();
    if (email) {
      if (seenEmails.has(email)) {
        results.push({ row: i + 1, ok: false, error: `Duplicate personal_email in this file: ${email}`, input: raw });
        continue;
      }
      seenEmails.add(email);
    }

    const doc: Record<string, unknown> = {
      doctype: "Employee",
      naming_series: "HR-EMP-",
      first_name: raw.first_name,
      last_name: raw.last_name,
      employee_name: `${raw.first_name} ${raw.last_name}`,
      gender: raw.gender,
      date_of_birth: dob,
      date_of_joining: doj,
      status: "Active",
      company: raw.company,
    };
    // Optional linked fields — skip empty
    if (raw.department)      doc.department = raw.department;
    if (raw.job_title)       doc.job_title = raw.job_title;
    if (raw.employment_type) doc.employment_type = raw.employment_type;
    if (raw.branch)          doc.branch = raw.branch;
    if (raw.marital_status)  doc.marital_status = raw.marital_status;
    if (raw.blood_group)     doc.blood_group = raw.blood_group;
    if (raw.personal_email) {
      doc.personal_email = raw.personal_email;
      doc.company_email  = raw.personal_email;
      doc.prefered_email = raw.personal_email;
      doc.prefered_contact_email = "Personal Email";
    }
    if (raw.phone) { doc.phone = raw.phone; doc.cell_number = raw.phone; }
    if (raw.current_address) doc.current_address = raw.current_address;
    if (raw.national_id)  doc.national_id = raw.national_id;
    if (raw.tax_number)   doc.tax_number = raw.tax_number;
    if (raw.nssa_number)  doc.nssa_number = raw.nssa_number;
    if (raw.bank_name)    doc.bank_name = raw.bank_name;
    if (raw.bank_account) doc.bank_account = raw.bank_account;
    const bUsd = num(raw.basic_usd);        if (bUsd !== undefined) doc.basic_usd = bUsd;
    const bZig = num(raw.basic_zig);        if (bZig !== undefined) doc.basic_zig = bZig;
    const pct  = normalizePensionPct(raw.pension_pct);
    if (pct !== undefined) doc.pension_pct = pct;
    const med  = num(raw.medical_aid_usd);  if (med !== undefined) doc.medical_aid_usd = med;
    const nec  = num(raw.nec_dues_usd);     if (nec !== undefined) doc.nec_dues_usd = nec;
    doc.payroll_currency = "USD";
    doc.create_user = 0;
    doc.create_user_permission = 0;

    try {
      const res = await frappeCall<{ name: string; employee_name?: string }>({
        method: "frappe.client.insert",
        verb: "POST",
        as: "user",
        args: { doc },
      });
      results.push({
        row: i + 1,
        ok: true,
        employee: res?.employee_name || String(doc.employee_name),
        name: res?.name ?? "",
      });
    } catch (err) {
      results.push({ row: i + 1, ok: false, error: friendlyFrappe(err), input: raw });
    }
  }

  const inserted = results.filter((r) => r.ok).length;
  const failed   = results.length - inserted;

  if (inserted > 0) {
    revalidatePath("/employee");
  }

  return { total: results.length, inserted, failed, results };
}

/** Serve a template CSV — header + one example row so HR sees the
 *  shape and can save-as CSV from Excel. Returned as plain text so the
 *  client can trigger a Blob download. */
export async function downloadEmployeeTemplateAction(): Promise<string> {
  await requireGroup("HR_ANY");
  const header = TEMPLATE_COLUMNS.map((c) => c.label).join(",");
  const example = [
    "Tinashe", "Moyo", "Male", "1990-05-14", "2026-01-15",
    "Rivers Inc", "Finance", "Payroll Officer", "Permanent",
    "Harare HQ", "Married", "O+",
    "tinashe.moyo@example.com", "+263 77 123 4567",
    "12 Samora Machel Ave, Belvedere, Harare",
    "63-1234567 K 63", "BP2000123456", "NSSA-100000",
    "CBZ", "110000012345", "1200", "3600", "0.05", "50", "5",
  ].map((v) => (v.includes(",") ? `"${v}"` : v)).join(",");
  return `${header}\n${example}\n`;
}

// Client-safe constants for the bulk-hire wizard. Kept out of actions.ts
// because "use server" files can only export async functions — importing
// a non-async const from a server-action module crashes at hydration.

export type TemplateColumn = {
  key: string;
  label: string;
  required?: boolean;
  hint: string;
};

export const TEMPLATE_COLUMNS: TemplateColumn[] = [
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

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createEmployee,
  updateEmployee,
  type EmployeeFormInput,
} from "@/lib/frappe/employee-write";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof EmployeeFormInput, string>>;
};

/**
 * Bare-minimum hard requirements. Most "you should fill X" rules live in
 * Frappe (notice period, contract end date, etc.) and surface through the
 * error message Frappe sends back — we only enforce what's needed to even
 * shape a valid Employee doc here.
 */
const baseSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required."),
  middle_name: z.string().trim().optional(),
  last_name: z.string().trim().min(1, "Last name is required."),
  gender: z.string().trim().min(1, "Select a gender."),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
  image: z.string().trim().optional(),

  company: z.string().trim().min(1, "Pick a company."),
  status: z.string().trim().min(1),
  department: z.string().trim().optional(),
  designation: z.string().trim().optional(),
  branch: z.string().trim().optional(),
  employment_type: z.string().trim().optional(),
  pay_grade: z.string().trim().optional(),
  // FormData delivers strings — coerce. NEC-locked inputs still send
  // their (grade-inherited) values because we use readOnly, not
  // disabled, on the form side.
  basic_usd: z.coerce.number().nonnegative().optional(),
  basic_zig: z.coerce.number().nonnegative().optional(),
  nec_industry: z.string().trim().optional(),
  nec_dues_usd: z.coerce.number().nonnegative().optional(),
  // Boolean travels through FormData as "0"/"1"; coerce → number → cast.
  nec_dues_override: z
    .union([z.literal("0"), z.literal("1")])
    .transform((v) => (v === "1" ? 1 : 0) as 0 | 1)
    .optional(),
  // ZIMRA tax credits — same "0"/"1" wire shape as nec_dues_override.
  is_elderly: z
    .union([z.literal("0"), z.literal("1")])
    .transform((v) => (v === "1" ? 1 : 0) as 0 | 1)
    .optional(),
  is_disabled: z
    .union([z.literal("0"), z.literal("1")])
    .transform((v) => (v === "1" ? 1 : 0) as 0 | 1)
    .optional(),
  date_of_joining: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
  employee_number: z.string().trim().optional(),

  cell_number: z.string().trim().optional(),
  company_email: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /.+@.+\..+/.test(v), "Use a valid email."),
  personal_email: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /.+@.+\..+/.test(v), "Use a valid email."),
  user_id: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /.+@.+\..+/.test(v), "User accounts are email-based."),
  current_address: z.string().trim().optional(),
  permanent_address: z.string().trim().optional(),
  person_to_be_contacted: z.string().trim().optional(),
  emergency_phone_number: z.string().trim().optional(),

  reports_to: z.string().trim().optional(),
  leave_approver: z.string().trim().optional(),
  expense_approver: z.string().trim().optional(),
  shift_request_approver: z.string().trim().optional(),

  holiday_list: z.string().trim().optional(),
  default_shift: z.string().trim().optional(),
  bio: z.string().trim().optional(),
});

function parseForm(form: FormData): {
  ok: true;
  data: EmployeeFormInput;
} | { ok: false; state: FormState } {
  const raw: Record<string, string> = {};
  for (const [k, v] of form.entries()) {
    if (typeof v === "string") raw[k] = v;
  }
  const parsed = baseSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: FormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof EmployeeFormInput | undefined;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      ok: false,
      state: { error: "Check the highlighted fields.", fieldErrors },
    };
  }
  return { ok: true, data: parsed.data as EmployeeFormInput };
}

function toFormState(err: unknown): FormState {
  if (err instanceof FrappeRequestError) {
    const detail = err.detail as { _server_messages?: string; message?: string } | undefined;
    // Frappe surfaces validation errors through `_server_messages` — a
    // double-JSON-encoded list of `{message, title}` objects. Surface the
    // first one verbatim; it's already user-friendly.
    if (detail?._server_messages) {
      try {
        const arr = JSON.parse(detail._server_messages) as string[];
        const first = arr[0] ? (JSON.parse(arr[0]) as { message?: string }) : undefined;
        if (first?.message) {
          return { error: stripHtml(first.message) };
        }
      } catch {
        /* fall through */
      }
    }
    if (typeof detail?.message === "string") return { error: detail.message };
    return { error: err.message };
  }
  return { error: "Something went wrong. Try again." };
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim();
}

export async function createEmployeeAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = parseForm(form);
  if (!parsed.ok) return parsed.state;

  // A profile image is mandatory on create — the picker is upload-only, so an
  // empty value here means the user hit Save before completing the upload.
  if (!parsed.data.image) {
    return {
      error: "Upload a profile image before creating the employee.",
      fieldErrors: { image: "Profile image is required." },
    };
  }

  let newId: string;
  try {
    newId = await createEmployee(parsed.data);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/employee");
  redirect(`/employee/${encodeURIComponent(newId)}`);
}

export async function updateEmployeeAction(
  id: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = parseForm(form);
  if (!parsed.ok) return parsed.state;

  try {
    await updateEmployee(id, parsed.data);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/employee");
  revalidatePath(`/employee/${encodeURIComponent(id)}`);
  redirect(`/employee/${encodeURIComponent(id)}`);
}

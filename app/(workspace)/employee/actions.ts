"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createEmployee,
  updateEmployee,
  type EmployeeFormInput,
} from "@/lib/frappe/employee-write";
import { FrappeRequestError, frappeCall } from "@/lib/frappe/client";
import {
  replaceEmployeeChildTables,
  type ChildTableUpdate,
} from "@/lib/frappe/employees";
import { getMyAccess, PERSONA_ROLES } from "@/lib/frappe/roles";

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
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please pick a valid date."),
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
  tax_method: z.enum(["FDS", "NON_FDS"]).optional(),
  salary_currency_mode: z.enum(["USD_ONLY", "ZIG_ONLY", "MIXED"]).optional(),
  date_of_joining: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please pick a valid date."),

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

  // compliance — age waiver. Same "0"/"1" wire shape as the ZIMRA
  // flags above. Zod validates the reason is present when the flag is
  // set so the frontend gets a targeted field error instead of a
  // generic Frappe throw.
  age_waiver_granted: z
    .union([z.literal("0"), z.literal("1")])
    .transform((v) => (v === "1" ? 1 : 0) as 0 | 1)
    .optional(),
  age_waiver_reason: z.string().trim().optional(),
}).superRefine((data, ctx) => {
  if (data.age_waiver_granted === 1 && !data.age_waiver_reason) {
    ctx.addIssue({
      code: "custom",
      path: ["age_waiver_reason"],
      message: "Reason is required when overriding the minimum hire age.",
    });
  }
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
  // Never swallow Next.js redirect/notFound throws — the framework relies on
  // them to bubble up from a Server Action. Catching without re-throwing
  // turns a successful create into a "Something went wrong" toast.
  if (typeof err === "object" && err !== null) {
    const digest = (err as { digest?: unknown }).digest;
    if (
      typeof digest === "string" &&
      (digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND")
    ) {
      throw err;
    }
  }
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

  // Login-account provisioning is non-optional: every new employee
  // gets a User created on save (see recruitment_app's
  // employee_login_provisioning after_insert hook), and that needs
  // an email address to send the welcome / set-password link to.
  // We also mirror this check on the backend (validate hook), so
  // this is really just to keep the error tight next to the field
  // instead of round-tripping a Frappe throw.
  if (!parsed.data.company_email && !parsed.data.personal_email) {
    return {
      error: "Check the highlighted fields.",
      fieldErrors: {
        company_email:
          "Required — we auto-create a login account for the employee at this address so they can access their self-service dashboard.",
      },
    };
  }

  // Persona roles are picked from the Login-roles checkbox section
  // on the Contact Details tab (see LoginRolesSection in employee-
  // form.tsx). Filter against the canonical PERSONA_ROLES list so a
  // client that tampered with the form can't inject arbitrary role
  // names into the User doc.
  const rawRoles = form.getAll("login_roles").filter(
    (v): v is string => typeof v === "string" && v.length > 0,
  );
  const validRoles = Array.from(new Set(rawRoles)).filter((r) =>
    PERSONA_ROLES.includes(r),
  );

  let employeeId: string;
  try {
    employeeId = await createEmployee(parsed.data);
  } catch (err) {
    return toFormState(err);
  }

  // Best-effort role application. If it fails we still succeed the
  // whole create — the Employee is real, they have Employee (self-
  // service) via the after_insert hook, and HR can retry the persona
  // assignment from Settings → Users. Rolling back a valid Employee
  // over a role-assignment error would confuse the user.
  if (validRoles.length > 0) {
    const access = await getMyAccess();
    if (access?.isItAdmin || access?.isHrAdmin) {
      try {
        await frappeCall<{ ok: boolean; roles: string[] }>({
          method: "recruitment_app.api.me.set_login_roles_for_employee",
          verb: "POST",
          args: {
            employee: employeeId,
            roles: JSON.stringify(validRoles),
          },
          as: "user",
        });
      } catch (err) {
        console.error(
          `[createEmployeeAction] set_login_roles_for_employee failed for ${employeeId}:`,
          err,
        );
      }
    }
  }

  revalidatePath("/employee");
  redirect("/employee");
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
    // Child-table tabs (Education, Work Experience, Skills) serialize their
    // rows into hidden inputs — pull them out and forward to the whitelisted
    // Python endpoint if any are present. The endpoint leaves other child
    // tables (addresses, internal_work_history, …) untouched.
    const childUpdate = parseChildTables(form);
    if (childUpdate) {
      await replaceEmployeeChildTables(id, childUpdate);
    }
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/employee");
  revalidatePath(`/employee/${encodeURIComponent(id)}`);
  redirect(`/employee/${encodeURIComponent(id)}`);
}

function parseChildTables(form: FormData): ChildTableUpdate | null {
  const upd: ChildTableUpdate = {};
  const eduRaw = form.get("_child_education");
  const extRaw = form.get("_child_external_work_history");
  const skRaw = form.get("_child_skills");
  if (typeof eduRaw === "string") upd.education = safeJson(eduRaw);
  if (typeof extRaw === "string") upd.external_work_history = safeJson(extRaw);
  if (typeof skRaw === "string") upd.skills = safeJson(skRaw);
  return Object.keys(upd).length ? upd : null;
}

function safeJson<T>(s: string): T | never[] {
  try {
    const v = JSON.parse(s) as unknown;
    return Array.isArray(v) ? (v as T) : ([] as never[]);
  } catch {
    return [] as never[];
  }
}

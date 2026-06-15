"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createCompany,
  updateCompany,
  type CompanyInput,
} from "@/lib/frappe/companies";
import { getMyAccess } from "@/lib/frappe/roles";
import {
  formToRecord,
  toFormState,
  type StdFormState,
} from "@/lib/frappe/form-errors";

export type FormState = StdFormState;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");

const createSchema = z.object({
  company_name: z.string().trim().min(1, "Required."),
  abbr: z
    .string()
    .trim()
    .min(2, "At least 2 characters.")
    .max(8, "Max 8 characters.")
    .regex(/^[A-Z0-9-]+$/, "Uppercase letters / digits / hyphen only."),
  default_currency: z.string().trim().min(1, "Required."),
  country: z.string().trim().min(1, "Required."),
  default_holiday_list: z.string().trim().optional(),
  tax_id: z.string().trim().optional(),
  date_of_establishment: z
    .union([isoDate, z.literal("")])
    .optional(),
  phone_no: z.string().trim().optional(),
});

// Edit form differs only in that `abbr` isn't writable (see lib comment).
const editSchema = createSchema.omit({ abbr: true });

function fieldErrors(parsed: z.SafeParseError<unknown>): FormState {
  const out: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const k = String(issue.path[0] ?? "");
    if (k && !out[k]) out[k] = issue.message;
  }
  return { error: "Check the highlighted fields.", fieldErrors: out };
}

async function requireWrite(): Promise<string | null> {
  const access = await getMyAccess();
  // Same set that holds RW on Company per the DocPerm grant.
  if (!access.isHrAdmin && !access.isItAdmin) {
    return "Only HR Director / System Manager / IT Admin can create or edit companies.";
  }
  return null;
}

function toInput(
  d: z.infer<typeof createSchema> | z.infer<typeof editSchema>,
): CompanyInput {
  return {
    company_name: d.company_name,
    abbr: "abbr" in d ? d.abbr : "", // ignored by updateCompany
    default_currency: d.default_currency,
    country: d.country,
    default_holiday_list: d.default_holiday_list || undefined,
    tax_id: d.tax_id || undefined,
    date_of_establishment: d.date_of_establishment || undefined,
    phone_no: d.phone_no || undefined,
  };
}

export async function createCompanyAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const blocked = await requireWrite();
  if (blocked) return { error: blocked };
  const parsed = createSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  let name: string;
  try {
    name = await createCompany(toInput(parsed.data));
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/settings/company");
  redirect(`/settings/company/${encodeURIComponent(name)}`);
}

export async function updateCompanyAction(
  id: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const blocked = await requireWrite();
  if (blocked) return { error: blocked };
  const parsed = editSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  const { abbr: _abbr, ...rest } = toInput(parsed.data);
  void _abbr;
  try {
    await updateCompany(id, rest);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/settings/company");
  revalidatePath(`/settings/company/${encodeURIComponent(id)}`);
  return {};
}

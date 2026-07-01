"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createMaster,
  upsertValue,
  deactivate,
} from "@/lib/references/server";
import { getMyAccess } from "@/lib/frappe/roles";
import {
  formToRecord,
  toFormState,
  type StdFormState,
} from "@/lib/frappe/form-errors";

export type FormState = StdFormState;

async function requireMasterAdmin(): Promise<string | null> {
  const access = await getMyAccess();
  if (!access.isHrAdmin && !access.isItAdmin) {
    return "Only HR Manager or IT Admin can edit reference data.";
  }
  return null;
}

const valueSchema = z.object({
  title: z.string().trim().min(1, "Required."),
  code: z.string().trim().optional(),
  description: z.string().trim().optional(),
  sort_order: z.coerce.number().int().optional(),
  is_active: z.coerce.boolean().optional(),
  // Hidden field, auto-set by ValueForm when the master is company-scoped
  // and the user has a default company. Empty string means "shared".
  company: z.string().trim().optional(),
});

export async function upsertValueAction(
  master: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const blocked = await requireMasterAdmin();
  if (blocked) return { error: blocked };
  const parsed = valueSchema.safeParse(formToRecord(form));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = String(issue.path[0] ?? "");
      if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { error: "Check the highlighted fields.", fieldErrors };
  }
  try {
    await upsertValue(master, parsed.data.title, {
      code: parsed.data.code,
      description: parsed.data.description,
      sort_order: parsed.data.sort_order,
      is_active:
        parsed.data.is_active === undefined ? 1 : parsed.data.is_active ? 1 : 0,
      // Only forward `company` when ValueForm actually sent one.
      ...(parsed.data.company ? { company: parsed.data.company } : {}),
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath(`/admin/references/${encodeURIComponent(master)}`);
  redirect(`/admin/references/${encodeURIComponent(master)}`);
}

/**
 * Create a brand-new reference master at runtime. The backend only allows
 * users with DocType.create perm (System Manager) so the form is only
 * usable by sysadmins — but we double-check here too.
 */
const newMasterSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Required.")
    .max(60, "Max 60 characters.")
    .regex(/^[A-Z][A-Za-z0-9 ]*$/, "Start with a capital letter; letters, numbers, and spaces only."),
  module: z.string().trim().min(1, "Pick a module."),
  description: z.string().trim().optional(),
});

export async function createMasterAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const access = await getMyAccess();
  if (!access.isItAdmin && !access.isHrAdmin) {
    return { error: "Only IT Admin or HR Manager / System Manager can create new masters." };
  }
  const parsed = newMasterSchema.safeParse(formToRecord(form));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = String(issue.path[0] ?? "");
      if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { error: "Check the highlighted fields.", fieldErrors };
  }
  let createdName: string;
  try {
    createdName = await createMaster({
      name: parsed.data.name,
      module: parsed.data.module,
      // Always company-scoped — multi-tenant setup, every row belongs to
      // a specific company. No opt-out for safety.
      companyScoped: true,
      description: parsed.data.description,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/admin/references");
  redirect(`/admin/references/${encodeURIComponent(createdName)}`);
}

export async function deactivateValueAction(
  master: string,
  name: string,
): Promise<FormState> {
  const blocked = await requireMasterAdmin();
  if (blocked) return { error: blocked };
  try {
    await deactivate(master, name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath(`/admin/references/${encodeURIComponent(master)}`);
  return {};
}

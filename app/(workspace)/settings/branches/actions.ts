"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createBranch,
  deleteBranch,
  updateBranch,
} from "@/lib/frappe/branches";
import { getMyAccess } from "@/lib/frappe/roles";
import {
  formToRecord,
  toFormState,
  type StdFormState,
} from "@/lib/frappe/form-errors";

export type BranchRowLike = {
  name: string;
  weeklyLaborBudget: number;
};

export type FormState = StdFormState & {
  created?: BranchRowLike;
  updated?: BranchRowLike;
  /** For update: the name BEFORE the rename so the client can splice
   *  the right row. */
  originalName?: string;
};

const nameSchema = z
  .string()
  .trim()
  .min(1, "Required.")
  .max(140, "Keep it short.")
  .refine(
    (v) => !v.includes("/"),
    "Slashes aren't allowed in the name — Frappe uses them internally.",
  );

const budgetSchema = z
  .union([z.coerce.number().nonnegative(), z.literal("")])
  .optional()
  .transform((v) => (typeof v === "number" ? v : undefined));

const createSchema = z.object({
  branch: nameSchema,
  weekly_labor_budget: budgetSchema,
});

const updateSchema = z.object({
  original_name: z.string().trim().min(1),
  branch: nameSchema,
  weekly_labor_budget: budgetSchema,
});

function fieldErrors(parsed: z.SafeParseError<unknown>): FormState {
  const out: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const k = String(issue.path[0] ?? "");
    if (k && !out[k]) out[k] = issue.message;
  }
  return { error: "Check the highlighted fields.", fieldErrors: out };
}

async function requireHrAdmin(): Promise<string | null> {
  const access = await getMyAccess();
  if (!access.isHrAdmin && !access.isItAdmin) {
    return "Only HR admins can manage branches.";
  }
  return null;
}

export async function createBranchAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const blocked = await requireHrAdmin();
  if (blocked) return { error: blocked };
  const parsed = createSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  let savedName: string;
  try {
    savedName = await createBranch({
      branch: parsed.data.branch,
      weekly_labor_budget: parsed.data.weekly_labor_budget,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/settings/branches");
  return {
    created: {
      name: savedName,
      weeklyLaborBudget: parsed.data.weekly_labor_budget ?? 0,
    },
  };
}

export async function updateBranchAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const blocked = await requireHrAdmin();
  if (blocked) return { error: blocked };
  const parsed = updateSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  let finalName: string;
  try {
    finalName = await updateBranch({
      originalName: parsed.data.original_name,
      branch: parsed.data.branch,
      weekly_labor_budget: parsed.data.weekly_labor_budget,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/settings/branches");
  return {
    updated: {
      name: finalName,
      weeklyLaborBudget: parsed.data.weekly_labor_budget ?? 0,
    },
    originalName: parsed.data.original_name,
  };
}

export async function deleteBranchAction(
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const blocked = await requireHrAdmin();
  if (blocked) return { ok: false, error: blocked };
  try {
    await deleteBranch(name);
  } catch (err) {
    const state = toFormState(err);
    return { ok: false, error: state.error ?? "Failed to delete." };
  }
  revalidatePath("/settings/branches");
  return { ok: true };
}

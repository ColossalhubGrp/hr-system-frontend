"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createGrievanceType,
  deleteGrievanceType,
  updateGrievanceType,
} from "@/lib/frappe/grievance-types";
import { getMyAccess } from "@/lib/frappe/roles";
import {
  formToRecord,
  toFormState,
  type StdFormState,
} from "@/lib/frappe/form-errors";

export type GrievanceTypeRowLike = {
  name: string;
  description: string | null;
};

export type FormState = StdFormState & {
  created?: GrievanceTypeRowLike;
  updated?: GrievanceTypeRowLike;
  /** For update: the name BEFORE the rename so the client can splice
   *  the right row. Undefined when the update was a description-only
   *  edit that kept the same name. */
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

const createSchema = z.object({
  name: nameSchema,
  description: z.string().trim().optional(),
});

const updateSchema = z.object({
  original_name: z.string().trim().min(1),
  name: nameSchema,
  description: z.string().trim().optional(),
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
  // Create + edit is HR Director / Manager (HR_ADMIN group). HR User
  // gets read via DocPerm but can't manage the registry through this
  // page — matches the DocType's no-delete-for-HR-User grant.
  if (!access.isHrAdmin && !access.isItAdmin) {
    return "Only HR admins can manage grievance types.";
  }
  return null;
}

export async function createGrievanceTypeAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const blocked = await requireHrAdmin();
  if (blocked) return { error: blocked };
  const parsed = createSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  let savedName: string;
  try {
    savedName = await createGrievanceType({
      name: parsed.data.name,
      description: parsed.data.description || undefined,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/settings/grievance-types");
  return {
    created: {
      name: savedName,
      description: parsed.data.description || null,
    },
  };
}

export async function updateGrievanceTypeAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const blocked = await requireHrAdmin();
  if (blocked) return { error: blocked };
  const parsed = updateSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  let finalName: string;
  try {
    finalName = await updateGrievanceType({
      originalName: parsed.data.original_name,
      name: parsed.data.name,
      description: parsed.data.description ?? "",
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/settings/grievance-types");
  return {
    updated: {
      name: finalName,
      description: parsed.data.description ? parsed.data.description : null,
    },
    originalName: parsed.data.original_name,
  };
}

export async function deleteGrievanceTypeAction(
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const blocked = await requireHrAdmin();
  if (blocked) return { ok: false, error: blocked };
  try {
    await deleteGrievanceType(name);
  } catch (err) {
    const state = toFormState(err);
    return { ok: false, error: state.error ?? "Failed to delete." };
  }
  revalidatePath("/settings/grievance-types");
  return { ok: true };
}

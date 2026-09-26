"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createAccountingDimension,
  updateAccountingDimension,
  deleteAccountingDimension,
} from "@/lib/frappe/masters/accounting-dimension";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };

const schema = z.object({
  label: z.string().trim().min(1, "Label is required."),
  document_type: z.string().trim().min(1, "Backing record type is required."),
  fieldname: z.string().trim().min(1, "Fieldname is required."),
  disabled: z.union([z.literal("on"), z.literal("")]).optional().transform((v) => v === "on"),
});

function toFormState(err: unknown): FormState {
  if (typeof err === "object" && err !== null) {
    const digest = (err as { digest?: unknown }).digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw err;
    if (digest === "NEXT_NOT_FOUND") throw err;
  }
  if (err instanceof FrappeRequestError) return { error: err.message || `Backend error (${err.status}).` };
  return { error: err instanceof Error ? err.message : "Something went wrong." };
}

export async function createAccountingDimensionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors, error: "Please fix the highlighted fields." };
  }
  let created: { name: string };
  try {
    created = await createAccountingDimension({
      label: parsed.data.label,
      documentType: parsed.data.document_type,
      fieldname: parsed.data.fieldname,
      disabled: parsed.data.disabled,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/masters/dimensions");
  redirect(`/accounting/masters/dimensions/${encodeURIComponent(created.name)}`);
}

export async function updateAccountingDimensionAction(name: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors, error: "Please fix the highlighted fields." };
  }
  try {
    await updateAccountingDimension(name, {
      label: parsed.data.label,
      documentType: parsed.data.document_type,
      fieldname: parsed.data.fieldname,
      disabled: parsed.data.disabled,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/masters/dimensions");
  revalidatePath(`/accounting/masters/dimensions/${name}`);
  return {};
}

export async function deleteAccountingDimensionAction(name: string): Promise<FormState> {
  try {
    await deleteAccountingDimension(name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/masters/dimensions");
  redirect("/accounting/masters/dimensions");
}

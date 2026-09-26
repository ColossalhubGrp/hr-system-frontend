"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createTerms,
  updateTerms,
  deleteTerms,
} from "@/lib/frappe/masters/terms-and-conditions";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const schema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  disabled: z.union([z.literal("on"), z.literal("")]).optional().transform((v) => v === "on"),
  terms: z.string().default(""),
});

function toFormState(err: unknown): FormState {
  if (typeof err === "object" && err !== null) {
    const digest = (err as { digest?: unknown }).digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw err;
    if (digest === "NEXT_NOT_FOUND") throw err;
  }
  if (err instanceof FrappeRequestError) {
    return { error: err.message || `Backend error (${err.status}).` };
  }
  return { error: err instanceof Error ? err.message : "Something went wrong." };
}

export async function createTermsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
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
    created = await createTerms({
      title: parsed.data.title,
      disabled: parsed.data.disabled,
      terms: parsed.data.terms,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/masters/terms");
  redirect(`/accounting/masters/terms/${encodeURIComponent(created.name)}`);
}

export async function updateTermsAction(
  name: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
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
    await updateTerms(name, {
      title: parsed.data.title,
      disabled: parsed.data.disabled,
      terms: parsed.data.terms,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/masters/terms");
  revalidatePath(`/accounting/masters/terms/${name}`);
  return {};
}

export async function deleteTermsAction(name: string): Promise<FormState> {
  try {
    await deleteTerms(name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/masters/terms");
  redirect("/accounting/masters/terms");
}

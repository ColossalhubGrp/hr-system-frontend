"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createShareholder,
  updateShareholder,
  deleteShareholder,
} from "@/lib/frappe/shares/shareholder";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };
const schema = z.object({
  title: z.string().trim().min(1, "Name is required."),
  folio_no: z.string().trim().optional(),
  company: z.string().trim().min(1, "Company is required."),
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

export async function createShareholderAction(_prev: FormState, formData: FormData): Promise<FormState> {
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
    created = await createShareholder({ title: parsed.data.title, folioNo: parsed.data.folio_no, company: parsed.data.company });
  } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/shares/shareholders");
  redirect(`/accounting/shares/shareholders/${encodeURIComponent(created.name)}`);
}

export async function updateShareholderAction(name: string, _prev: FormState, formData: FormData): Promise<FormState> {
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
    await updateShareholder(name, { title: parsed.data.title, folioNo: parsed.data.folio_no, company: parsed.data.company });
  } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/shares/shareholders");
  revalidatePath(`/accounting/shares/shareholders/${name}`);
  return {};
}

export async function deleteShareholderAction(name: string): Promise<FormState> {
  try { await deleteShareholder(name); } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/shares/shareholders");
  redirect("/accounting/shares/shareholders");
}

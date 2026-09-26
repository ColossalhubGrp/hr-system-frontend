"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createTaxCategory,
  updateTaxCategory,
  deleteTaxCategory,
} from "@/lib/frappe/tax/category";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };

const schema = z.object({
  title: z.string().trim().min(1, "Title is required."),
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

export async function createTaxCategoryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: { title: parsed.error.issues[0]?.message ?? "" }, error: "Please fix the highlighted fields." };
  }
  let created: { name: string };
  try {
    created = await createTaxCategory({ title: parsed.data.title, disabled: parsed.data.disabled });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/tax/categories");
  redirect(`/accounting/tax/categories/${encodeURIComponent(created.name)}`);
}

export async function updateTaxCategoryAction(name: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: { title: parsed.error.issues[0]?.message ?? "" }, error: "Please fix the highlighted fields." };
  }
  try {
    await updateTaxCategory(name, { title: parsed.data.title, disabled: parsed.data.disabled });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/tax/categories");
  revalidatePath(`/accounting/tax/categories/${name}`);
  return {};
}

export async function deleteTaxCategoryAction(name: string): Promise<FormState> {
  try {
    await deleteTaxCategory(name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/tax/categories");
  redirect("/accounting/tax/categories");
}

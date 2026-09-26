"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createBank, updateBank, deleteBank } from "@/lib/frappe/banking/bank";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };

const schema = z.object({
  bank_name: z.string().trim().min(1, "Bank name is required."),
  swift_number: z.string().trim().optional(),
  website: z.string().trim().optional(),
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

export async function createBankAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: { bank_name: parsed.error.issues[0]?.message ?? "" }, error: "Please fix the highlighted fields." };
  let created: { name: string };
  try {
    created = await createBank({ bankName: parsed.data.bank_name, swiftNumber: parsed.data.swift_number, website: parsed.data.website });
  } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/banking/banks");
  redirect(`/accounting/banking/banks/${encodeURIComponent(created.name)}`);
}

export async function updateBankAction(name: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: { bank_name: parsed.error.issues[0]?.message ?? "" }, error: "Please fix the highlighted fields." };
  try {
    await updateBank(name, { bankName: parsed.data.bank_name, swiftNumber: parsed.data.swift_number, website: parsed.data.website });
  } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/banking/banks");
  revalidatePath(`/accounting/banking/banks/${name}`);
  return {};
}

export async function deleteBankAction(name: string): Promise<FormState> {
  try { await deleteBank(name); } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/banking/banks");
  redirect("/accounting/banking/banks");
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createFinanceBook,
  updateFinanceBook,
  deleteFinanceBook,
} from "@/lib/frappe/masters/finance-book";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };

const schema = z.object({
  finance_book_name: z.string().trim().min(1, "Name is required."),
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

export async function createFinanceBookAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: { finance_book_name: parsed.error.issues[0]?.message ?? "" }, error: "Please fix the highlighted fields." };
  }
  let created: { name: string };
  try {
    created = await createFinanceBook({ financeBookName: parsed.data.finance_book_name });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/masters/finance-books");
  redirect(`/accounting/masters/finance-books/${encodeURIComponent(created.name)}`);
}

export async function updateFinanceBookAction(name: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: { finance_book_name: parsed.error.issues[0]?.message ?? "" }, error: "Please fix the highlighted fields." };
  }
  try {
    await updateFinanceBook(name, { financeBookName: parsed.data.finance_book_name });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/masters/finance-books");
  revalidatePath(`/accounting/masters/finance-books/${name}`);
  return {};
}

export async function deleteFinanceBookAction(name: string): Promise<FormState> {
  try {
    await deleteFinanceBook(name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/masters/finance-books");
  redirect("/accounting/masters/finance-books");
}

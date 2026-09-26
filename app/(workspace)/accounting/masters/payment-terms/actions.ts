"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createPaymentTerm,
  updatePaymentTerm,
  deletePaymentTerm,
  DUE_BASIS,
  DISCOUNT_TYPES,
} from "@/lib/frappe/masters/payment-term";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const schema = z.object({
  payment_term_name: z.string().trim().min(1, "Name is required."),
  description: z.string().trim().optional(),
  invoice_portion: z.coerce.number().min(0).max(100).default(100),
  credit_days: z.coerce.number().int().min(0).default(0),
  credit_months: z.coerce.number().int().min(0).default(0),
  due_date_based_on: z.enum(DUE_BASIS as unknown as [string, ...string[]]),
  discount: z.coerce.number().min(0).default(0),
  discount_type: z.enum(DISCOUNT_TYPES as unknown as [string, ...string[]]),
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
  const msg = err instanceof Error ? err.message : "Something went wrong.";
  return { error: msg };
}

export async function createPaymentTermAction(
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
    created = await createPaymentTerm({
      paymentTermName: parsed.data.payment_term_name,
      description: parsed.data.description,
      invoicePortion: parsed.data.invoice_portion,
      creditDays: parsed.data.credit_days,
      creditMonths: parsed.data.credit_months,
      dueDateBasedOn: parsed.data.due_date_based_on,
      discount: parsed.data.discount,
      discountType: parsed.data.discount_type,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/masters/payment-terms");
  redirect(`/accounting/masters/payment-terms/${encodeURIComponent(created.name)}`);
}

export async function updatePaymentTermAction(
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
    await updatePaymentTerm(name, {
      paymentTermName: parsed.data.payment_term_name,
      description: parsed.data.description,
      invoicePortion: parsed.data.invoice_portion,
      creditDays: parsed.data.credit_days,
      creditMonths: parsed.data.credit_months,
      dueDateBasedOn: parsed.data.due_date_based_on,
      discount: parsed.data.discount,
      discountType: parsed.data.discount_type,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/masters/payment-terms");
  revalidatePath(`/accounting/masters/payment-terms/${name}`);
  return {};
}

export async function deletePaymentTermAction(name: string): Promise<FormState> {
  try {
    await deletePaymentTerm(name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/masters/payment-terms");
  redirect("/accounting/masters/payment-terms");
}

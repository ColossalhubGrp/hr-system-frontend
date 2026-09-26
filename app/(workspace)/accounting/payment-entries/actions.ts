"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createPaymentEntry,
  submitPaymentEntry,
  cancelPaymentEntry,
  PAYMENT_TYPES,
  type PaymentType,
} from "@/lib/frappe/accounting";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");

const createSchema = z
  .object({
    payment_type: z.enum(PAYMENT_TYPES as [PaymentType, ...PaymentType[]]),
    posting_date: isoDate,
    company: z.string().trim().min(1, "Company is required."),
    party_type: z.string().trim().optional(),
    party: z.string().trim().optional(),
    paid_from: z.string().trim().optional(),
    paid_to: z.string().trim().optional(),
    paid_amount: z.coerce.number().gt(0, "Amount must be greater than zero."),
    received_amount: z.coerce.number().optional(),
    mode_of_payment: z.string().trim().optional(),
    reference_no: z.string().trim().optional(),
    reference_date: z.string().trim().optional(),
    remarks: z.string().trim().optional(),
  })
  .refine(
    (v) => v.payment_type === "Internal Transfer" || (v.party_type && v.party),
    { message: "Party is required for Receive and Pay entries.", path: ["party"] },
  )
  .refine(
    (v) => v.paid_from || v.paid_to,
    { message: "At least one of paid-from or paid-to accounts is required.", path: ["paid_from"] },
  );

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

export async function createPaymentEntryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
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
    created = await createPaymentEntry({
      paymentType: parsed.data.payment_type,
      postingDate: parsed.data.posting_date,
      company: parsed.data.company,
      partyType: parsed.data.party_type,
      party: parsed.data.party,
      paidFrom: parsed.data.paid_from,
      paidTo: parsed.data.paid_to,
      paidAmount: parsed.data.paid_amount,
      receivedAmount: parsed.data.received_amount ?? parsed.data.paid_amount,
      modeOfPayment: parsed.data.mode_of_payment,
      referenceNo: parsed.data.reference_no,
      referenceDate: parsed.data.reference_date,
      remarks: parsed.data.remarks,
    });
  } catch (err) {
    return toFormState(err);
  }

  revalidatePath("/accounting/payment-entries");
  redirect(`/accounting/payment-entries/${encodeURIComponent(created.name)}`);
}

export async function submitPaymentEntryAction(name: string): Promise<FormState> {
  try {
    await submitPaymentEntry(name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/payment-entries");
  revalidatePath(`/accounting/payment-entries/${name}`);
  return {};
}

export async function cancelPaymentEntryAction(name: string): Promise<FormState> {
  try {
    await cancelPaymentEntry(name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/payment-entries");
  revalidatePath(`/accounting/payment-entries/${name}`);
  return {};
}

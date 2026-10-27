"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createPaymentEntry,
  updatePaymentEntry,
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
  .refine((v) => !!v.paid_from, {
    message: "Paid From account is required.",
    path: ["paid_from"],
  })
  .refine((v) => !!v.paid_to, {
    message: "Paid To account is required.",
    path: ["paid_to"],
  });

function toFormState(err: unknown): FormState {
  if (typeof err === "object" && err !== null) {
    const digest = (err as { digest?: unknown }).digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw err;
    if (digest === "NEXT_NOT_FOUND") throw err;
  }
  if (err instanceof Error && !(err instanceof FrappeRequestError)) {
    return { error: err.message };
  }
  const raw = err instanceof Error ? err.message : "";
  const status = err instanceof FrappeRequestError ? err.status : undefined;
  const detail = err instanceof FrappeRequestError ? err.detail : undefined;
  const real = extractFrappeMessage(detail);
  if (real) return { error: real };
  const s = raw.toLowerCase();
  if (s.includes("403") || s.includes("forbidden") || s.includes("permission")) {
    return { error: "You don't have permission to save this payment." };
  }
  if (s.includes("401") || s.includes("unauthorized") || s.includes("login")) {
    return { error: "Your session has expired — refresh the page and sign in again." };
  }
  if (status && status >= 500) {
    return { error: "The server couldn't save this payment. Try again in a moment." };
  }
  return { error: "Couldn't save this payment. Please try again." };
}

function extractFrappeMessage(detail: unknown): string | null {
  if (!detail || typeof detail !== "object") return null;
  const obj = detail as Record<string, unknown>;
  const exc = obj.exception;
  if (typeof exc === "string" && exc.trim()) {
    const stripped = stripHtml(exc.replace(/^[\w.]+:\s*/, "")).trim();
    if (stripped) return stripped;
  }
  const sm = obj._server_messages;
  if (typeof sm === "string") {
    try {
      const arr = JSON.parse(sm) as unknown;
      if (!Array.isArray(arr) || arr.length === 0) return null;
      const parsed = arr.map((e) => (typeof e === "string" ? JSON.parse(e) : e)) as Array<{
        message?: string;
        indicator?: string;
      }>;
      const err = parsed.find((e) => e?.indicator === "red" || e?.indicator === "orange");
      const pick = err ?? parsed[0];
      const msg = pick?.message;
      if (msg) return stripHtml(String(msg)).trim();
    } catch { /* fall through */ }
  }
  return null;
}

function stripHtml(input: string): string {
  return input
    .replace(/<\s*(br|\/li|\/p|\/div|\/ul|\/ol)\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
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

export async function updatePaymentEntryAction(
  name: string,
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

  try {
    await updatePaymentEntry(name, {
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
  revalidatePath(`/accounting/payment-entries/${name}`);
  redirect(`/accounting/payment-entries/${encodeURIComponent(name)}`);
}

export async function submitPaymentEntryAction(name: string): Promise<FormState> {
  try {
    await submitPaymentEntry(name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/payment-entries");
  revalidatePath(`/accounting/payment-entries/${name}`);
  redirect("/accounting/payment-entries");
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

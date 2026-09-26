"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createShareTransfer,
  updateShareTransfer,
  submitShareTransfer,
  cancelShareTransfer,
  deleteShareTransfer,
  TRANSFER_TYPES,
} from "@/lib/frappe/shares/share-transfer";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };
const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
const opt = z.string().trim().optional().transform((v) => v || undefined);

const schema = z.object({
  transfer_type: z.enum(TRANSFER_TYPES as unknown as [string, ...string[]]),
  date: iso,
  from_shareholder: opt,
  to_shareholder: opt,
  share_type: z.enum(["Equity", "Preference"]),
  no_of_shares: z.coerce.number().gt(0, "Must be > 0."),
  rate: z.coerce.number().min(0),
  company: z.string().trim().min(1, "Company is required."),
  from_folio_no: opt,
  to_folio_no: opt,
  asset_account: opt,
  equity_or_liability_account: opt,
  remarks: opt,
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

function toInput(data: z.infer<typeof schema>) {
  return {
    transferType: data.transfer_type,
    date: data.date,
    fromShareholder: data.from_shareholder,
    toShareholder: data.to_shareholder,
    shareType: data.share_type,
    noOfShares: data.no_of_shares,
    rate: data.rate,
    company: data.company,
    fromFolioNo: data.from_folio_no,
    toFolioNo: data.to_folio_no,
    assetAccount: data.asset_account,
    equityOrLiabilityAccount: data.equity_or_liability_account,
    remarks: data.remarks,
  };
}

export async function createTransferAction(_prev: FormState, formData: FormData): Promise<FormState> {
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
    created = await createShareTransfer(toInput(parsed.data));
  } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/shares/transfers");
  redirect(`/accounting/shares/transfers/${encodeURIComponent(created.name)}`);
}

export async function updateTransferAction(name: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors, error: "Please fix the highlighted fields." };
  }
  try { await updateShareTransfer(name, toInput(parsed.data)); } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/shares/transfers");
  revalidatePath(`/accounting/shares/transfers/${name}`);
  return {};
}

export async function submitTransferAction(name: string): Promise<FormState> {
  try { await submitShareTransfer(name); } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/shares/transfers");
  revalidatePath(`/accounting/shares/transfers/${name}`);
  return {};
}

export async function cancelTransferAction(name: string): Promise<FormState> {
  try { await cancelShareTransfer(name); } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/shares/transfers");
  revalidatePath(`/accounting/shares/transfers/${name}`);
  return {};
}

export async function deleteTransferAction(name: string): Promise<FormState> {
  try { await deleteShareTransfer(name); } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/shares/transfers");
  redirect("/accounting/shares/transfers");
}

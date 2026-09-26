"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createModeOfPayment,
  updateModeOfPayment,
  deleteModeOfPayment,
  MODE_TYPES,
  type ModeOfPaymentType,
} from "@/lib/frappe/masters/mode-of-payment";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const accountSchema = z.object({
  company: z.string().trim().min(1),
  default_account: z.string().trim().min(1),
});

const baseSchema = z.object({
  mode_of_payment: z.string().trim().min(1, "Name is required."),
  type: z.enum(MODE_TYPES as [ModeOfPaymentType, ...ModeOfPaymentType[]]),
  enabled: z
    .union([z.literal("on"), z.literal("off"), z.literal("true"), z.literal("false"), z.literal("")])
    .optional()
    .transform((v) => v === "on" || v === "true"),
  accounts_json: z
    .string()
    .trim()
    .default("[]")
    .transform((s) => {
      try {
        return JSON.parse(s);
      } catch {
        return [];
      }
    })
    .pipe(z.array(accountSchema)),
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

export async function createModeOfPaymentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = baseSchema.safeParse(Object.fromEntries(formData));
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
    created = await createModeOfPayment({
      modeOfPayment: parsed.data.mode_of_payment,
      type: parsed.data.type,
      enabled: parsed.data.enabled,
      accounts: parsed.data.accounts_json.map((a: { company: string; default_account: string }) => ({
        company: a.company,
        defaultAccount: a.default_account,
      })),
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/masters/modes-of-payment");
  redirect(`/accounting/masters/modes-of-payment/${encodeURIComponent(created.name)}`);
}

export async function updateModeOfPaymentAction(
  name: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = baseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors, error: "Please fix the highlighted fields." };
  }
  try {
    await updateModeOfPayment(name, {
      modeOfPayment: parsed.data.mode_of_payment,
      type: parsed.data.type,
      enabled: parsed.data.enabled,
      accounts: parsed.data.accounts_json.map((a: { company: string; default_account: string }) => ({
        company: a.company,
        defaultAccount: a.default_account,
      })),
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/masters/modes-of-payment");
  revalidatePath(`/accounting/masters/modes-of-payment/${name}`);
  return {};
}

export async function deleteModeOfPaymentAction(name: string): Promise<FormState> {
  try {
    await deleteModeOfPayment(name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/masters/modes-of-payment");
  redirect("/accounting/masters/modes-of-payment");
}

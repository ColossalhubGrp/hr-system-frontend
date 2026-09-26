"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createFiscalYear,
  updateFiscalYear,
  deleteFiscalYear,
} from "@/lib/frappe/masters/fiscal-year";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required (e.g. 2026 or 2026-2027)."),
  year_start_date: isoDate,
  year_end_date: isoDate,
  disabled: z.union([z.literal("on"), z.literal("")]).optional().transform((v) => v === "on"),
  companies_json: z
    .string()
    .trim()
    .default("[]")
    .transform((s) => {
      try {
        const arr = JSON.parse(s);
        return Array.isArray(arr) ? arr.filter((v) => typeof v === "string" && v.trim()).map((v) => String(v)) : [];
      } catch {
        return [] as string[];
      }
    }),
});

const editSchema = createSchema.omit({ name: true });

function toFormState(err: unknown): FormState {
  if (typeof err === "object" && err !== null) {
    const digest = (err as { digest?: unknown }).digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw err;
    if (digest === "NEXT_NOT_FOUND") throw err;
  }
  if (err instanceof FrappeRequestError) return { error: err.message || `Backend error (${err.status}).` };
  return { error: err instanceof Error ? err.message : "Something went wrong." };
}

export async function createFiscalYearAction(_prev: FormState, formData: FormData): Promise<FormState> {
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
    created = await createFiscalYear({
      name: parsed.data.name,
      yearStartDate: parsed.data.year_start_date,
      yearEndDate: parsed.data.year_end_date,
      disabled: parsed.data.disabled,
      companies: parsed.data.companies_json,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/masters/fiscal-year");
  redirect(`/accounting/masters/fiscal-year/${encodeURIComponent(created.name)}`);
}

export async function updateFiscalYearAction(name: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = editSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors, error: "Please fix the highlighted fields." };
  }
  try {
    await updateFiscalYear(name, {
      yearStartDate: parsed.data.year_start_date,
      yearEndDate: parsed.data.year_end_date,
      disabled: parsed.data.disabled,
      companies: parsed.data.companies_json,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/masters/fiscal-year");
  revalidatePath(`/accounting/masters/fiscal-year/${name}`);
  return {};
}

export async function deleteFiscalYearAction(name: string): Promise<FormState> {
  try {
    await deleteFiscalYear(name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/masters/fiscal-year");
  redirect("/accounting/masters/fiscal-year");
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  cancelLifecycle,
  createGrievance,
  createOnboarding,
  createPromotion,
  createSeparation,
  createTransfer,
  setBoardingStatus,
  setGrievanceStatus,
  submitLifecycle,
  type GrievanceInput,
  type OnboardingInput,
  type PromotionInput,
  type SeparationInput,
  type TransferInput,
} from "@/lib/frappe/lifecycle-write";
import type { LifecycleKind } from "@/lib/frappe/lifecycle";
import {
  formToRecord,
  toFormState,
  type StdFormState,
} from "@/lib/frappe/form-errors";

export type FormState = StdFormState;
export type DecisionState = { error?: string };

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");

function fieldErrors(parsed: z.SafeParseError<unknown>): FormState {
  const out: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const k = String(issue.path[0] ?? "");
    if (k && !out[k]) out[k] = issue.message;
  }
  return { error: "Check the highlighted fields.", fieldErrors: out };
}

function detailHref(kind: LifecycleKind, id: string): string {
  return `/employee/lifecycle/${kind}/${encodeURIComponent(id)}`;
}

function listHref(kind: LifecycleKind): string {
  return `/employee/lifecycle/${kind}`;
}

// --- Onboarding ----------------------------------------------------------

const onboardingSchema = z.object({
  employee: z.string().trim().min(1, "Employee is required."),
  boarding_begins_on: isoDate,
  company: z.string().trim().min(1, "Company is required."),
  department: z.string().trim().optional(),
  designation: z.string().trim().optional(),
  employee_grade: z.string().trim().optional(),
});

export async function createOnboardingAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = onboardingSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  try {
    const input: OnboardingInput = parsed.data;
    const id = await createOnboarding(input);
    revalidatePath(listHref("onboarding"));
    redirect(detailHref("onboarding", id));
  } catch (err) {
    return toFormState(err);
  }
}

// --- Separation ----------------------------------------------------------

const separationSchema = z.object({
  employee: z.string().trim().min(1, "Employee is required."),
  boarding_begins_on: isoDate,
  company: z.string().trim().min(1, "Company is required."),
  department: z.string().trim().optional(),
  designation: z.string().trim().optional(),
  resignation_letter_date: z.string().trim().optional(),
  exit_interview_summary: z.string().trim().optional(),
});

export async function createSeparationAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = separationSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  try {
    const input: SeparationInput = parsed.data;
    const id = await createSeparation(input);
    revalidatePath(listHref("separation"));
    redirect(detailHref("separation", id));
  } catch (err) {
    return toFormState(err);
  }
}

// --- Transfer ------------------------------------------------------------

const transferSchema = z.object({
  employee: z.string().trim().min(1, "Employee is required."),
  transfer_date: isoDate,
  company: z.string().trim().min(1, "Company is required."),
  new_company: z.string().trim().optional(),
  new_department: z.string().trim().optional(),
  new_designation: z.string().trim().optional(),
  reason: z.string().trim().optional(),
});

export async function createTransferAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = transferSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  try {
    const input: TransferInput = parsed.data;
    const id = await createTransfer(input);
    revalidatePath(listHref("transfer"));
    redirect(detailHref("transfer", id));
  } catch (err) {
    return toFormState(err);
  }
}

// --- Promotion -----------------------------------------------------------

const promotionSchema = z.object({
  employee: z.string().trim().min(1, "Employee is required."),
  promotion_date: isoDate,
  company: z.string().trim().min(1, "Company is required."),
  new_designation: z.string().trim().optional(),
  new_grade: z.string().trim().optional(),
  reason: z.string().trim().optional(),
});

export async function createPromotionAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = promotionSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  try {
    const input: PromotionInput = parsed.data;
    const id = await createPromotion(input);
    revalidatePath(listHref("promotion"));
    redirect(detailHref("promotion", id));
  } catch (err) {
    return toFormState(err);
  }
}

// --- Grievance -----------------------------------------------------------

const grievanceSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required."),
  raised_by: z.string().trim().min(1, "Raised by (employee) is required."),
  grievance_against_type: z.enum(["Employee", "Department", "Company"]),
  grievance_against: z.string().trim().min(1, "Pick who/what this is against."),
  // Frappe HR's Employee Grievance keeps both `grievance_type` and
  // `description` mandatory.
  grievance_type: z.string().trim().min(1, "Pick or name a grievance type."),
  grievance_raised_date: z.string().trim().optional(),
  cause_of_grievance: z.string().trim().optional(),
  description: z.string().trim().min(1, "A description is required."),
});

export async function createGrievanceAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = grievanceSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  try {
    const input: GrievanceInput = parsed.data;
    const id = await createGrievance(input);
    revalidatePath(listHref("grievance"));
    redirect(detailHref("grievance", id));
  } catch (err) {
    return toFormState(err);
  }
}

// --- Boarding transitions (Onboarding + Separation) ----------------------

function boardingDecide(
  kind: "onboarding" | "separation",
  status: "In Process" | "Completed" | "Pending",
) {
  return async (id: string, _prev: DecisionState): Promise<DecisionState> => {
    try {
      await setBoardingStatus(kind, id, status);
      revalidatePath(listHref(kind));
      revalidatePath(detailHref(kind, id));
      redirect(detailHref(kind, id));
    } catch (err) {
      return toFormState(err) as DecisionState;
    }
  };
}

export const startOnboardingAction = boardingDecide("onboarding", "In Process");
export const completeOnboardingAction = boardingDecide("onboarding", "Completed");
export const startSeparationAction = boardingDecide("separation", "In Process");
export const completeSeparationAction = boardingDecide("separation", "Completed");

// --- Grievance transitions ----------------------------------------------

function grievanceDecide(status: "Investigated" | "Resolved" | "Invalid") {
  return async (id: string, _prev: DecisionState): Promise<DecisionState> => {
    try {
      await setGrievanceStatus(id, status);
      revalidatePath(listHref("grievance"));
      revalidatePath(detailHref("grievance", id));
      redirect(detailHref("grievance", id));
    } catch (err) {
      return toFormState(err) as DecisionState;
    }
  };
}

export const investigateGrievanceAction = grievanceDecide("Investigated");
export const resolveGrievanceAction = grievanceDecide("Resolved");
export const invalidateGrievanceAction = grievanceDecide("Invalid");

// --- Submit / Cancel (Transfer + Promotion) -----------------------------

function submitOrCancel(
  kind: "transfer" | "promotion",
  op: "submit" | "cancel",
) {
  return async (id: string, _prev: DecisionState): Promise<DecisionState> => {
    try {
      if (op === "submit") await submitLifecycle(kind, id);
      else await cancelLifecycle(kind, id);
      revalidatePath(listHref(kind));
      revalidatePath(detailHref(kind, id));
      redirect(detailHref(kind, id));
    } catch (err) {
      return toFormState(err) as DecisionState;
    }
  };
}

export const submitTransferAction = submitOrCancel("transfer", "submit");
export const cancelTransferAction = submitOrCancel("transfer", "cancel");
export const submitPromotionAction = submitOrCancel("promotion", "submit");
export const cancelPromotionAction = submitOrCancel("promotion", "cancel");

"use server";

import { revalidatePath } from "next/cache";
import {
  createFeedbackCriterion,
  deleteFeedbackCriterion,
} from "@/lib/frappe/setup-criteria";
import { toFormState, type StdFormState } from "@/lib/frappe/form-errors";
import { getMyAccess } from "@/lib/frappe/roles";

async function requireHrAdmin(): Promise<StdFormState | null> {
  const access = await getMyAccess();
  if (!(access?.isHrAdmin || access?.isItAdmin)) {
    return { error: "Only HR admins can change setup." };
  }
  return null;
}

export async function createFeedbackCriterionAction(
  _prev: StdFormState,
  form: FormData,
): Promise<StdFormState> {
  const blocked = await requireHrAdmin();
  if (blocked) return blocked;
  const name = String(form.get("criteria") ?? "").trim();
  if (!name) return { error: "Give the criterion a name." };
  try {
    await createFeedbackCriterion(name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/settings/feedback-criteria");
  return {};
}

export async function deleteFeedbackCriterionAction(
  _prev: StdFormState,
  form: FormData,
): Promise<StdFormState> {
  const blocked = await requireHrAdmin();
  if (blocked) return blocked;
  // Criterion name arrives as a hidden input in the per-row delete
  // form. Can't bind it via .bind on the server side — Next.js refuses
  // to serialize partially-applied functions across the server → client
  // boundary. Reading from form keeps this a plain server action the
  // client can call for any row.
  const criteria = String(form.get("criteria") ?? "").trim();
  if (!criteria) return { error: "Missing criterion name." };
  try {
    await deleteFeedbackCriterion(criteria);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/settings/feedback-criteria");
  return {};
}

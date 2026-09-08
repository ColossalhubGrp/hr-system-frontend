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
  revalidatePath("/hr/setup/feedback-criteria");
  return {};
}

export async function deleteFeedbackCriterionAction(
  criteria: string,
  _prev: StdFormState,
  // useFormState always calls actions with (prev, form). Required (not
  // optional) so React's dispatch inference includes the form arg,
  // otherwise the client-side <form action={dispatch}> callsite is a
  // type error ("expected 0 args, got 1").
  _form: FormData,
): Promise<StdFormState> {
  const blocked = await requireHrAdmin();
  if (blocked) return blocked;
  if (!criteria.trim()) return { error: "Missing criterion name." };
  try {
    await deleteFeedbackCriterion(criteria);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/hr/setup/feedback-criteria");
  return {};
}

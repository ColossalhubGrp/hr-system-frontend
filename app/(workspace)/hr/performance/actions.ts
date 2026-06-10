"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  cancelAppraisal,
  createAppraisal,
  createAppraisalCycle,
  createAppraisalTemplate,
  createFeedback,
  createGoal,
  createPip,
  submitAppraisal,
  submitFeedback,
  updateGoal,
  type AppraisalInput,
  type CycleInput,
  type FeedbackInput,
  type GoalInput,
  type PipInput,
  type TemplateInput,
  GOAL_STATUSES,
  PIP_STATUSES,
} from "@/lib/frappe/performance";
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

// --- Goal ----------------------------------------------------------------

const goalSchema = z.object({
  goal_name: z.string().trim().min(1, "Name is required."),
  description: z.string().trim().optional(),
  employee: z.string().trim().optional(),
  status: z.enum(GOAL_STATUSES as [string, ...string[]]),
  progress: z.string().trim().optional(),
  start_date: z.string().trim().optional(),
  end_date: z.string().trim().optional(),
  appraisal_cycle: z.string().trim().optional(),
});

function toGoalInput(d: z.infer<typeof goalSchema>): GoalInput {
  const progress = d.progress ? Number(d.progress) : undefined;
  return {
    goal_name: d.goal_name,
    description: d.description,
    employee: d.employee,
    status: d.status,
    progress:
      progress !== undefined && Number.isFinite(progress) ? progress : undefined,
    start_date: d.start_date,
    end_date: d.end_date,
    appraisal_cycle: d.appraisal_cycle,
  };
}

export async function createGoalAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = goalSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  try {
    const id = await createGoal(toGoalInput(parsed.data));
    revalidatePath("/hr/performance?tab=goals");
    redirect(`/hr/performance/goals/${encodeURIComponent(id)}`);
  } catch (err) {
    return toFormState(err);
  }
}

export async function updateGoalAction(
  id: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = goalSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  try {
    await updateGoal(id, toGoalInput(parsed.data));
    revalidatePath("/hr/performance?tab=goals");
    revalidatePath(`/hr/performance/goals/${encodeURIComponent(id)}`);
    redirect(`/hr/performance/goals/${encodeURIComponent(id)}`);
  } catch (err) {
    return toFormState(err);
  }
}

// --- Appraisal -----------------------------------------------------------

const appraisalSchema = z.object({
  employee: z.string().trim().min(1, "Employee is required."),
  appraisal_cycle: z.string().trim().optional(),
  appraisal_template: z.string().trim().optional(),
  start_date: z.string().trim().optional(),
  end_date: z.string().trim().optional(),
  reviewer: z.string().trim().optional(),
});

export async function createAppraisalAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = appraisalSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  try {
    const input: AppraisalInput = {
      employee: parsed.data.employee,
      appraisal_cycle: parsed.data.appraisal_cycle,
      appraisal_template: parsed.data.appraisal_template,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      reviewer: parsed.data.reviewer,
    };
    const id = await createAppraisal(input);
    revalidatePath("/hr/performance");
    redirect(`/hr/performance/appraisals/${encodeURIComponent(id)}`);
  } catch (err) {
    return toFormState(err);
  }
}

export async function submitAppraisalAction(
  id: string,
  _prev: DecisionState,
): Promise<DecisionState> {
  try {
    await submitAppraisal(id);
    revalidatePath("/hr/performance");
    revalidatePath(`/hr/performance/appraisals/${encodeURIComponent(id)}`);
    redirect(`/hr/performance/appraisals/${encodeURIComponent(id)}`);
  } catch (err) {
    return toFormState(err) as DecisionState;
  }
}

export async function cancelAppraisalAction(
  id: string,
  _prev: DecisionState,
): Promise<DecisionState> {
  try {
    await cancelAppraisal(id);
    revalidatePath("/hr/performance");
    revalidatePath(`/hr/performance/appraisals/${encodeURIComponent(id)}`);
    redirect(`/hr/performance/appraisals/${encodeURIComponent(id)}`);
  } catch (err) {
    return toFormState(err) as DecisionState;
  }
}

// --- Feedback ------------------------------------------------------------

const feedbackSchema = z.object({
  employee: z.string().trim().min(1, "Employee is required."),
  reviewer: z.string().trim().min(1, "Reviewer is required."),
  feedback: z.string().trim().min(1, "Feedback text is required."),
  appraisal_cycle: z.string().trim().optional(),
  feedback_date: z.string().trim().optional(),
});

export async function createFeedbackAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = feedbackSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  try {
    const input: FeedbackInput = {
      employee: parsed.data.employee,
      reviewer: parsed.data.reviewer,
      feedback: parsed.data.feedback,
      appraisal_cycle: parsed.data.appraisal_cycle,
      feedback_date: parsed.data.feedback_date,
    };
    const id = await createFeedback(input);
    revalidatePath("/hr/performance?tab=feedback");
    redirect(`/hr/performance/feedback/${encodeURIComponent(id)}`);
  } catch (err) {
    return toFormState(err);
  }
}

export async function submitFeedbackAction(
  id: string,
  _prev: DecisionState,
): Promise<DecisionState> {
  try {
    await submitFeedback(id);
    revalidatePath("/hr/performance?tab=feedback");
    revalidatePath(`/hr/performance/feedback/${encodeURIComponent(id)}`);
    redirect(`/hr/performance/feedback/${encodeURIComponent(id)}`);
  } catch (err) {
    return toFormState(err) as DecisionState;
  }
}

// --- PIP -----------------------------------------------------------------

const pipSchema = z
  .object({
    employee: z.string().trim().min(1, "Employee is required."),
    from_date: isoDate,
    to_date: isoDate,
    reviewer: z.string().trim().optional(),
    appraisal_cycle: z.string().trim().optional(),
    reason_for_pip: z.string().trim().optional(),
    improvement_plan: z.string().trim().optional(),
    status: z.enum(PIP_STATUSES as [string, ...string[]]).optional(),
  })
  .refine((d) => d.to_date >= d.from_date, {
    message: "End must be on or after start.",
    path: ["to_date"],
  });

export async function createPipAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = pipSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  try {
    const input: PipInput = {
      employee: parsed.data.employee,
      from_date: parsed.data.from_date,
      to_date: parsed.data.to_date,
      reviewer: parsed.data.reviewer,
      appraisal_cycle: parsed.data.appraisal_cycle,
      reason_for_pip: parsed.data.reason_for_pip,
      improvement_plan: parsed.data.improvement_plan,
    };
    const id = await createPip(input);
    revalidatePath("/hr/performance?tab=pip");
    redirect(`/hr/performance/pip/${encodeURIComponent(id)}`);
  } catch (err) {
    return toFormState(err);
  }
}

// --- Appraisal Cycle -----------------------------------------------------

const cycleSchema = z
  .object({
    cycle_name: z.string().trim().min(1, "Name is required."),
    start_date: isoDate,
    end_date: isoDate,
    company: z.string().trim().optional(),
    kra_evaluation_method: z.enum(["Manual", "Automated"]).optional(),
  })
  .refine((d) => d.end_date >= d.start_date, {
    message: "End must be on or after start.",
    path: ["end_date"],
  });

export async function createCycleAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = cycleSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  try {
    const input: CycleInput = {
      cycle_name: parsed.data.cycle_name,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      company: parsed.data.company,
      kra_evaluation_method: parsed.data.kra_evaluation_method,
    };
    const id = await createAppraisalCycle(input);
    revalidatePath("/hr/performance");
    redirect(`/hr/performance?cycle=${encodeURIComponent(id)}`);
  } catch (err) {
    return toFormState(err);
  }
}

// --- Appraisal Template --------------------------------------------------

const templateSchema = z.object({
  template_title: z.string().trim().min(1, "Title is required."),
  description: z.string().trim().optional(),
});

export async function createTemplateAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = templateSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  try {
    const input: TemplateInput = parsed.data;
    await createAppraisalTemplate(input);
    revalidatePath("/hr/performance");
    redirect("/hr/performance");
  } catch (err) {
    return toFormState(err);
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createOvertimeRule,
  updateOvertimeRule,
  deleteOvertimeRule,
  createOvertimeAssignment,
  deleteOvertimeAssignment,
  type OvertimeRuleInput,
  type OvertimeAssignmentInput,
} from "@/lib/frappe/overtime";
import { getMyAccess } from "@/lib/frappe/roles";
import {
  formToRecord,
  toFormState,
  type StdFormState,
} from "@/lib/frappe/form-errors";

export type FormState = StdFormState;

function fieldErrors(parsed: z.SafeParseError<unknown>): FormState {
  const out: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const k = String(issue.path[0] ?? "");
    if (k && !out[k]) out[k] = issue.message;
  }
  return { error: "Check the highlighted fields.", fieldErrors: out };
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");

const ruleSchema = z
  .object({
    rule_name: z.string().trim().min(1, "Required."),
    is_active: z.string().optional(),
    description: z.string().trim().optional(),
    valid_from: isoDate,
    valid_to: z
      .union([isoDate, z.literal("")])
      .optional(),
    threshold_type: z.enum([
      "Daily Hours",
      "Weekly Hours",
      "Consecutive Days",
      "Shift Based",
    ]),
    threshold_value: z.string().trim().min(1, "Required."),
    grace_minutes: z.string().trim().optional(),
    day_type: z.enum(["All Days", "Weekday", "Weekend", "Holiday Only"]),
    calculation_method: z.enum(["Multiplier", "Fixed Amount", "Tiered"]),
    multiplier_rate: z.string().trim().optional(),
    fixed_amount: z.string().trim().optional(),
    weekend_multiplier: z.string().trim().optional(),
    holiday_multiplier: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    /**
     * Tier rows posted as a JSON string from the client component. Empty
     * string OK — interpreted as "no tiers".
     */
    tiered_rates: z.string().trim().optional(),
  })
  .refine(
    (d) => !d.valid_to || d.valid_to >= d.valid_from,
    { message: "Valid-to must be on or after valid-from.", path: ["valid_to"] },
  );

function parseTiers(raw: string | undefined): OvertimeRuleInput["tiered_rates"] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((t: { from?: unknown; to?: unknown; mult?: unknown; note?: unknown }) => ({
        from_minute: Number(t.from ?? 0),
        to_minute: t.to === null || t.to === "" || t.to === undefined
          ? undefined
          : Number(t.to),
        rate_multiplier: Number(t.mult ?? 1),
        description: typeof t.note === "string" ? t.note : undefined,
      }))
      .filter((t) => Number.isFinite(t.from_minute) && Number.isFinite(t.rate_multiplier));
  } catch {
    return [];
  }
}

function toInput(d: z.infer<typeof ruleSchema>): OvertimeRuleInput {
  return {
    rule_name: d.rule_name,
    is_active: d.is_active === "on" || d.is_active === "1" || d.is_active === "true",
    description: d.description,
    valid_from: d.valid_from,
    valid_to: d.valid_to || undefined,
    threshold_type: d.threshold_type,
    threshold_value: Number(d.threshold_value),
    grace_minutes: Number(d.grace_minutes ?? 0) || 0,
    day_type: d.day_type,
    calculation_method: d.calculation_method,
    multiplier_rate: d.multiplier_rate ? Number(d.multiplier_rate) : undefined,
    fixed_amount: d.fixed_amount ? Number(d.fixed_amount) : undefined,
    weekend_multiplier: Number(d.weekend_multiplier ?? 1) || 1,
    holiday_multiplier: Number(d.holiday_multiplier ?? 1) || 1,
    tiered_rates: parseTiers(d.tiered_rates),
    notes: d.notes,
  };
}

async function requireHrAdmin(): Promise<string | null> {
  const access = await getMyAccess();
  if (!access.isHrAdmin) {
    return "Only HR Director / HR Manager / IT Admin can manage overtime rules.";
  }
  return null;
}

export async function createOvertimeRuleAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const blocked = await requireHrAdmin();
  if (blocked) return { error: blocked };
  const parsed = ruleSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  let id: string;
  try {
    id = await createOvertimeRule(toInput(parsed.data));
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/settings/overtime");
  redirect(`/settings/overtime/${encodeURIComponent(id)}`);
}

export async function updateOvertimeRuleAction(
  id: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const blocked = await requireHrAdmin();
  if (blocked) return { error: blocked };
  const parsed = ruleSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  try {
    await updateOvertimeRule(id, toInput(parsed.data));
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/settings/overtime");
  revalidatePath(`/settings/overtime/${encodeURIComponent(id)}`);
  return {};
}

export async function deleteOvertimeRuleAction(id: string): Promise<FormState> {
  const blocked = await requireHrAdmin();
  if (blocked) return { error: blocked };
  try {
    await deleteOvertimeRule(id);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/settings/overtime");
  redirect("/settings/overtime");
}

// ---------- Assignment actions ----------

const assignmentSchema = z.object({
  rule: z.string().trim().min(1),
  applies_to: z.enum([
    "Global",
    "Country",
    "Department",
    "Employment Type",
    "Employee",
  ]),
  country: z.string().trim().optional(),
  department: z.string().trim().optional(),
  employment_type: z.string().trim().optional(),
  employee: z.string().trim().optional(),
  priority: z.string().trim().optional(),
  valid_from: z.union([isoDate, z.literal("")]).optional(),
  valid_to: z.union([isoDate, z.literal("")]).optional(),
  notes: z.string().trim().optional(),
});

export async function createAssignmentAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const blocked = await requireHrAdmin();
  if (blocked) return { error: blocked };
  const parsed = assignmentSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  const d = parsed.data;
  // Validate the scope target is present when applies_to isn't Global.
  const scopeField: Record<typeof d.applies_to, keyof typeof d | null> = {
    Global: null,
    Country: "country",
    Department: "department",
    "Employment Type": "employment_type",
    Employee: "employee",
  };
  const key = scopeField[d.applies_to];
  if (key && !d[key]) {
    return {
      error: "Pick a target for the chosen scope.",
      fieldErrors: { [key]: "Required for this scope." },
    };
  }
  const input: OvertimeAssignmentInput = {
    rule: d.rule,
    applies_to: d.applies_to,
    country: d.country || undefined,
    department: d.department || undefined,
    employment_type: d.employment_type || undefined,
    employee: d.employee || undefined,
    priority: Number(d.priority ?? 0) || 0,
    valid_from: d.valid_from || undefined,
    valid_to: d.valid_to || undefined,
    notes: d.notes || undefined,
  };
  try {
    await createOvertimeAssignment(input);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath(`/settings/overtime/${encodeURIComponent(d.rule)}`);
  return {};
}

export async function deleteAssignmentAction(
  assignmentId: string,
  ruleId: string,
): Promise<FormState> {
  const blocked = await requireHrAdmin();
  if (blocked) return { error: blocked };
  try {
    await deleteOvertimeAssignment(assignmentId);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath(`/settings/overtime/${encodeURIComponent(ruleId)}`);
  return {};
}

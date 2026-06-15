"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  cancelShiftAssignment,
  createShiftAssignment,
  createShiftRequest,
  createShiftType,
  decideShiftRequest,
  deleteShiftAssignment,
  deleteShiftRequest,
  deleteShiftType,
  setShiftTypeAllowedLocations,
  submitShiftAssignment,
  updateShiftType,
  type ShiftAssignmentInput,
  type ShiftRequestInput,
  type ShiftTypeInput,
} from "@/lib/frappe/shifts";
import {
  createShiftLocation,
  deleteShiftLocation,
  updateShiftLocation,
  type ShiftLocationInput,
} from "@/lib/frappe/shift-locations";
import {
  createShiftSchedule,
  createShiftScheduleAssignment,
  deleteShiftSchedule,
  deleteShiftScheduleAssignment,
  materialiseScheduleRange,
  updateShiftSchedule,
  updateShiftScheduleAssignment,
  type ShiftScheduleAssignmentInput,
  type ShiftScheduleInput,
} from "@/lib/frappe/shift-schedules";
import {
  formToRecord,
  toFormState,
  type StdFormState,
} from "@/lib/frappe/form-errors";

export type FormState = StdFormState;
export type DecisionState = { error?: string };

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
const hhmm = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Use HH:MM (24h).");

const shiftTypeSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  start_time: hhmm,
  end_time: hhmm,
  color: z.string().trim().optional(),
  enable_auto_attendance: z.union([z.literal("on"), z.literal("")]).optional(),
  allow_check_out_after_shift_end_time: z
    .union([z.literal("on"), z.literal("")])
    .optional(),
  holiday_list: z.string().trim().optional(),
  working_hours_threshold_for_half_day: z.string().trim().optional(),
  working_hours_threshold_for_absent: z.string().trim().optional(),
  regular_day_multiplier: z.string().trim().optional(),
  saturday_day_multiplier: z.string().trim().optional(),
  sunday_day_multiplier: z.string().trim().optional(),
  holiday_day_multiplier: z.string().trim().optional(),
  overtime_multiplier: z.string().trim().optional(),
});

function parseShiftType(form: FormData) {
  return shiftTypeSchema.safeParse(formToRecord(form));
}

function toInput(
  data: z.infer<typeof shiftTypeSchema>,
): ShiftTypeInput & { name: string } {
  return {
    name: data.name,
    start_time: data.start_time,
    end_time: data.end_time,
    color: data.color,
    enable_auto_attendance: data.enable_auto_attendance === "on",
    allow_check_out_after_shift_end_time:
      data.allow_check_out_after_shift_end_time === "on",
    holiday_list: data.holiday_list,
    working_hours_threshold_for_half_day: numOrUndef(
      data.working_hours_threshold_for_half_day,
    ),
    working_hours_threshold_for_absent: numOrUndef(
      data.working_hours_threshold_for_absent,
    ),
    regular_day_multiplier: numOrUndef(data.regular_day_multiplier),
    saturday_day_multiplier: numOrUndef(data.saturday_day_multiplier),
    sunday_day_multiplier: numOrUndef(data.sunday_day_multiplier),
    holiday_day_multiplier: numOrUndef(data.holiday_day_multiplier),
    overtime_multiplier: numOrUndef(data.overtime_multiplier),
  };
}

function numOrUndef(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function fieldErrors(parsed: z.SafeParseError<unknown>): FormState {
  const out: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const k = String(issue.path[0] ?? "");
    if (k && !out[k]) out[k] = issue.message;
  }
  return { error: "Check the highlighted fields.", fieldErrors: out };
}

/** Pull the multi-select `allowed_locations[]` form entries into a string list. */
function pickAllowedLocations(form: FormData): string[] {
  const list = form
    .getAll("allowed_locations")
    .filter((v): v is string => typeof v === "string" && v.trim() !== "");
  return Array.from(new Set(list));
}

export async function createShiftTypeAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = parseShiftType(form);
  if (!parsed.success) return fieldErrors(parsed);
  const locations = pickAllowedLocations(form);
  try {
    const id = await createShiftType(toInput(parsed.data));
    if (locations.length) {
      await setShiftTypeAllowedLocations(id, locations);
    }
    revalidatePath("/hr/shift-management");
    redirect(`/hr/shift-management/types/${encodeURIComponent(id)}`);
  } catch (err) {
    return toFormState(err);
  }
}

export async function updateShiftTypeAction(
  id: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = parseShiftType(form);
  if (!parsed.success) return fieldErrors(parsed);
  const locations = pickAllowedLocations(form);
  try {
    await updateShiftType(id, toInput(parsed.data));
    // Always overwrite — checked items become the new set, unchecked vanish.
    await setShiftTypeAllowedLocations(id, locations);
    revalidatePath("/hr/shift-management");
    revalidatePath(`/hr/shift-management/types/${encodeURIComponent(id)}`);
    redirect(`/hr/shift-management/types/${encodeURIComponent(id)}`);
  } catch (err) {
    return toFormState(err);
  }
}

// --- Shift Assignment ----------------------------------------------------

const shiftAssignmentSchema = z
  .object({
    employee: z.string().trim().min(1, "Employee is required."),
    shift_type: z.string().trim().min(1, "Shift type is required."),
    start_date: isoDate,
    end_date: z.string().trim().optional(),
    company: z.string().trim().optional(),
  })
  .refine((d) => !d.end_date || d.end_date >= d.start_date, {
    message: "End date must be on or after start date.",
    path: ["end_date"],
  });

export async function createShiftAssignmentAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = shiftAssignmentSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  try {
    const input: ShiftAssignmentInput = {
      employee: parsed.data.employee,
      shift_type: parsed.data.shift_type,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date || undefined,
      company: parsed.data.company || undefined,
    };
    const id = await createShiftAssignment(input);
    revalidatePath("/hr/shift-management");
    redirect(`/hr/shift-management/assignments/${encodeURIComponent(id)}`);
  } catch (err) {
    return toFormState(err);
  }
}

// --- Bulk Shift Assignment ----------------------------------------------

const bulkAssignSchema = z
  .object({
    shift_type: z.string().trim().min(1, "Shift type is required."),
    start_date: isoDate,
    end_date: z.string().trim().optional(),
    company: z.string().trim().optional(),
  })
  .refine((d) => !d.end_date || d.end_date >= d.start_date, {
    message: "End date must be on or after start date.",
    path: ["end_date"],
  });

export type BulkAssignState = StdFormState & {
  /** Number of assignments successfully created. */
  created?: number;
  /** Per-employee errors so the UI can highlight the failures. */
  failures?: Array<{ employee: string; error: string }>;
};

/**
 * Bulk-assigns the given shift to every checked employee for the given date
 * range. The action runs as the signed-in user, so any per-row failure
 * (overlapping shift, missing perm, …) is captured and shown to the user
 * without aborting the rest of the batch.
 */
export async function bulkAssignShiftAction(
  _prev: BulkAssignState,
  form: FormData,
): Promise<BulkAssignState> {
  const parsed = bulkAssignSchema.safeParse(formToRecord(form));
  if (!parsed.success) {
    return fieldErrors(parsed) as BulkAssignState;
  }
  const employees = form
    .getAll("employees")
    .filter((v): v is string => typeof v === "string" && v.trim() !== "");

  if (employees.length === 0) {
    return { error: "Pick at least one employee." };
  }

  const input = {
    shift_type: parsed.data.shift_type,
    start_date: parsed.data.start_date,
    end_date: parsed.data.end_date || undefined,
    company: parsed.data.company || undefined,
  };

  let created = 0;
  const failures: Array<{ employee: string; error: string }> = [];
  for (const employee of employees) {
    try {
      await createShiftAssignment({ ...input, employee });
      created++;
    } catch (err) {
      const detail = toFormState(err);
      failures.push({ employee, error: detail.error ?? "Unknown error" });
    }
  }

  if (created === 0) {
    return { error: "No assignments could be created.", failures };
  }
  revalidatePath("/hr/shift-management");
  if (failures.length === 0) {
    redirect("/hr/shift-management?tab=assignments");
  }
  return { created, failures };
}

export async function submitShiftAssignmentAction(
  id: string,
  _prev: DecisionState,
): Promise<DecisionState> {
  try {
    await submitShiftAssignment(id);
    revalidatePath("/hr/shift-management");
    revalidatePath(`/hr/shift-management/assignments/${encodeURIComponent(id)}`);
    redirect(`/hr/shift-management/assignments/${encodeURIComponent(id)}`);
  } catch (err) {
    return toFormState(err) as DecisionState;
  }
}

export async function cancelShiftAssignmentAction(
  id: string,
  _prev: DecisionState,
): Promise<DecisionState> {
  try {
    await cancelShiftAssignment(id);
    revalidatePath("/hr/shift-management");
    revalidatePath(`/hr/shift-management/assignments/${encodeURIComponent(id)}`);
    redirect(`/hr/shift-management/assignments/${encodeURIComponent(id)}`);
  } catch (err) {
    return toFormState(err) as DecisionState;
  }
}

// --- Shift Request -------------------------------------------------------

const shiftRequestSchema = z
  .object({
    employee: z.string().trim().min(1, "Employee is required."),
    shift_type: z.string().trim().min(1, "Shift type is required."),
    from_date: isoDate,
    to_date: z.string().trim().optional(),
    approver: z
      .string()
      .trim()
      .optional()
      .refine(
        (v) => !v || /.+@.+\..+/.test(v),
        "Approver must be a user email.",
      ),
  })
  .refine((d) => !d.to_date || d.to_date >= d.from_date, {
    message: "End date must be on or after start date.",
    path: ["to_date"],
  });

export async function createShiftRequestAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = shiftRequestSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  try {
    const input: ShiftRequestInput = {
      employee: parsed.data.employee,
      shift_type: parsed.data.shift_type,
      from_date: parsed.data.from_date,
      to_date: parsed.data.to_date || undefined,
      approver: parsed.data.approver || undefined,
    };
    const id = await createShiftRequest(input);
    revalidatePath("/hr/shift-management");
    redirect(`/hr/shift-management/requests/${encodeURIComponent(id)}`);
  } catch (err) {
    return toFormState(err);
  }
}

export async function approveShiftRequestAction(
  id: string,
  _prev: DecisionState,
): Promise<DecisionState> {
  try {
    await decideShiftRequest(id, "Approved");
    revalidatePath("/hr/shift-management");
    revalidatePath(`/hr/shift-management/requests/${encodeURIComponent(id)}`);
    redirect(`/hr/shift-management/requests/${encodeURIComponent(id)}`);
  } catch (err) {
    return toFormState(err) as DecisionState;
  }
}

export async function rejectShiftRequestAction(
  id: string,
  _prev: DecisionState,
): Promise<DecisionState> {
  try {
    await decideShiftRequest(id, "Rejected");
    revalidatePath("/hr/shift-management");
    revalidatePath(`/hr/shift-management/requests/${encodeURIComponent(id)}`);
    redirect(`/hr/shift-management/requests/${encodeURIComponent(id)}`);
  } catch (err) {
    return toFormState(err) as DecisionState;
  }
}

// --- Delete actions ------------------------------------------------------

export async function deleteShiftTypeAction(
  id: string,
  _prev: DecisionState,
): Promise<DecisionState> {
  try {
    await deleteShiftType(id);
  } catch (err) {
    return toFormState(err) as DecisionState;
  }
  revalidatePath("/hr/shift-management");
  redirect("/hr/shift-management");
}

export async function deleteShiftAssignmentAction(
  id: string,
  _prev: DecisionState,
): Promise<DecisionState> {
  try {
    await deleteShiftAssignment(id);
  } catch (err) {
    return toFormState(err) as DecisionState;
  }
  revalidatePath("/hr/shift-management");
  redirect("/hr/shift-management?tab=assignments");
}

export async function deleteShiftRequestAction(
  id: string,
  _prev: DecisionState,
): Promise<DecisionState> {
  try {
    await deleteShiftRequest(id);
  } catch (err) {
    return toFormState(err) as DecisionState;
  }
  revalidatePath("/hr/shift-management");
  redirect("/hr/shift-management?tab=requests");
}

// --- Shift Location ------------------------------------------------------

const latLng = z
  .string()
  .trim()
  .regex(/^-?\d{1,3}(\.\d+)?$/, "Use a decimal number, e.g. -17.829.");

const shiftLocationSchema = z.object({
  location_name: z.string().trim().min(1, "Location name is required."),
  latitude: latLng,
  longitude: latLng,
  radius_meters: z.string().trim().optional(),
  address: z.string().trim().optional(),
  company: z.string().trim().optional(),
  is_active: z.union([z.literal("on"), z.literal("")]).optional(),
});

function toLocationInput(
  data: z.infer<typeof shiftLocationSchema>,
): ShiftLocationInput {
  return {
    location_name: data.location_name,
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
    radius_meters: numOrUndef(data.radius_meters),
    address: data.address,
    company: data.company,
    is_active: data.is_active === "on",
  };
}

export async function createShiftLocationAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = shiftLocationSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  try {
    const id = await createShiftLocation(toLocationInput(parsed.data));
    revalidatePath("/hr/shift-management");
    redirect(`/hr/shift-management/locations/${encodeURIComponent(id)}`);
  } catch (err) {
    return toFormState(err);
  }
}

export async function updateShiftLocationAction(
  id: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = shiftLocationSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  try {
    await updateShiftLocation(id, toLocationInput(parsed.data));
    revalidatePath("/hr/shift-management");
    revalidatePath(`/hr/shift-management/locations/${encodeURIComponent(id)}`);
    redirect(`/hr/shift-management/locations/${encodeURIComponent(id)}`);
  } catch (err) {
    return toFormState(err);
  }
}

export async function deleteShiftLocationAction(
  id: string,
  _prev: DecisionState,
): Promise<DecisionState> {
  try {
    await deleteShiftLocation(id);
  } catch (err) {
    return toFormState(err) as DecisionState;
  }
  revalidatePath("/hr/shift-management");
  redirect("/hr/shift-management?tab=locations");
}

// --- Shift Schedule -----------------------------------------------------

const dowFlag = z.union([z.literal("on"), z.literal("")]).optional();

const shiftScheduleSchema = z.object({
  schedule_name: z.string().trim().min(1, "Schedule name is required."),
  shift_type: z.string().trim().min(1, "Shift type is required."),
  company: z.string().trim().optional(),
  holiday_list: z.string().trim().optional(),
  enabled: dowFlag,
  monday: dowFlag,
  tuesday: dowFlag,
  wednesday: dowFlag,
  thursday: dowFlag,
  friday: dowFlag,
  saturday: dowFlag,
  sunday: dowFlag,
  notes: z.string().trim().optional(),
});

function toScheduleInput(
  d: z.infer<typeof shiftScheduleSchema>,
): ShiftScheduleInput {
  return {
    schedule_name: d.schedule_name,
    shift_type: d.shift_type,
    company: d.company,
    holiday_list: d.holiday_list,
    enabled: d.enabled === "on",
    monday: d.monday === "on",
    tuesday: d.tuesday === "on",
    wednesday: d.wednesday === "on",
    thursday: d.thursday === "on",
    friday: d.friday === "on",
    saturday: d.saturday === "on",
    sunday: d.sunday === "on",
    notes: d.notes,
  };
}

export async function createShiftScheduleAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = shiftScheduleSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  try {
    const id = await createShiftSchedule(toScheduleInput(parsed.data));
    revalidatePath("/hr/shift-management");
    redirect(`/hr/shift-management/schedules/${encodeURIComponent(id)}`);
  } catch (err) {
    return toFormState(err);
  }
}

export async function updateShiftScheduleAction(
  id: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = shiftScheduleSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  try {
    await updateShiftSchedule(id, toScheduleInput(parsed.data));
    revalidatePath("/hr/shift-management");
    revalidatePath(`/hr/shift-management/schedules/${encodeURIComponent(id)}`);
    redirect(`/hr/shift-management/schedules/${encodeURIComponent(id)}`);
  } catch (err) {
    return toFormState(err);
  }
}

export async function deleteShiftScheduleAction(
  id: string,
  _prev: DecisionState,
): Promise<DecisionState> {
  try {
    await deleteShiftSchedule(id);
  } catch (err) {
    return toFormState(err) as DecisionState;
  }
  revalidatePath("/hr/shift-management");
  redirect("/hr/shift-management?tab=schedules");
}

// --- Shift Schedule Assignment -----------------------------------------

const scheduleAssignmentSchema = z
  .object({
    shift_schedule: z.string().trim().min(1, "Schedule is required."),
    employee: z.string().trim().min(1, "Employee is required."),
    start_date: isoDate,
    end_date: z.string().trim().optional(),
    status: z.enum(["Active", "Inactive"]).optional(),
    company: z.string().trim().optional(),
    notes: z.string().trim().optional(),
  })
  .refine((d) => !d.end_date || d.end_date >= d.start_date, {
    message: "End date must be on or after start date.",
    path: ["end_date"],
  });

function toScheduleAssignmentInput(
  d: z.infer<typeof scheduleAssignmentSchema>,
): ShiftScheduleAssignmentInput {
  return {
    shift_schedule: d.shift_schedule,
    employee: d.employee,
    start_date: d.start_date,
    end_date: d.end_date || undefined,
    status: d.status,
    company: d.company,
    notes: d.notes,
  };
}

export async function createShiftScheduleAssignmentAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = scheduleAssignmentSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  try {
    const id = await createShiftScheduleAssignment(
      toScheduleAssignmentInput(parsed.data),
    );
    revalidatePath("/hr/shift-management");
    redirect(`/hr/shift-management/schedule-assignments/${encodeURIComponent(id)}`);
  } catch (err) {
    return toFormState(err);
  }
}

export async function updateShiftScheduleAssignmentAction(
  id: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = scheduleAssignmentSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  try {
    await updateShiftScheduleAssignment(id, toScheduleAssignmentInput(parsed.data));
    revalidatePath("/hr/shift-management");
    revalidatePath(
      `/hr/shift-management/schedule-assignments/${encodeURIComponent(id)}`,
    );
    redirect(`/hr/shift-management/schedule-assignments/${encodeURIComponent(id)}`);
  } catch (err) {
    return toFormState(err);
  }
}

export async function deleteShiftScheduleAssignmentAction(
  id: string,
  _prev: DecisionState,
): Promise<DecisionState> {
  try {
    await deleteShiftScheduleAssignment(id);
  } catch (err) {
    return toFormState(err) as DecisionState;
  }
  revalidatePath("/hr/shift-management");
  redirect("/hr/shift-management?tab=schedule-assignments");
}

// --- Materialise --------------------------------------------------------

const materialiseSchema = z
  .object({
    from: isoDate,
    to: isoDate,
  })
  .refine((d) => d.to >= d.from, {
    message: "End date must be on or after start date.",
    path: ["to"],
  });

export type MaterialiseState = StdFormState & {
  created?: number;
  skipped?: number;
  failures?: Array<{ date: string; error: string }>;
};

export async function materialiseScheduleAction(
  args: { scheduleId: string; employee: string; company?: string },
  _prev: MaterialiseState,
  form: FormData,
): Promise<MaterialiseState> {
  const parsed = materialiseSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed) as MaterialiseState;
  try {
    const result = await materialiseScheduleRange({
      scheduleId: args.scheduleId,
      employee: args.employee,
      from: parsed.data.from,
      to: parsed.data.to,
      company: args.company,
    });
    revalidatePath("/hr/shift-management");
    revalidatePath("/hr/shift-management?tab=roster");
    return {
      created: result.created,
      skipped: result.skipped,
      failures: result.failures,
    };
  } catch (err) {
    return toFormState(err) as MaterialiseState;
  }
}

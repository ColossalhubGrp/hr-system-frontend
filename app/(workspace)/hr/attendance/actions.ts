"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  cancelAttendance,
  createAttendance,
  createAttendanceRequest,
  createCheckin,
  decideAttendanceRequest,
  submitAttendance,
  type AttendanceInput,
  type AttendanceRequestInput,
  type CheckinInput,
  ATTENDANCE_STATUSES,
  ATTENDANCE_REQUEST_REASONS,
} from "@/lib/frappe/attendance-list";
import {
  formToRecord,
  toFormState,
  type StdFormState,
} from "@/lib/frappe/form-errors";

export type FormState = StdFormState;
export type DecisionState = { error?: string };

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
const dateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/, "Use a date + time.");

function fieldErrors(parsed: z.SafeParseError<unknown>): FormState {
  const out: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const k = String(issue.path[0] ?? "");
    if (k && !out[k]) out[k] = issue.message;
  }
  return { error: "Check the highlighted fields.", fieldErrors: out };
}

// --- Attendance ----------------------------------------------------------

const attendanceSchema = z.object({
  employee: z.string().trim().min(1, "Employee is required."),
  attendance_date: isoDate,
  status: z.enum(ATTENDANCE_STATUSES as [string, ...string[]]),
  shift: z.string().trim().optional(),
  in_time: z.string().trim().optional(),
  out_time: z.string().trim().optional(),
  company: z.string().trim().optional(),
});

export async function createAttendanceAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = attendanceSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  try {
    const input: AttendanceInput = {
      ...parsed.data,
      in_time: parsed.data.in_time
        ? toFrappeDateTime(parsed.data.in_time)
        : undefined,
      out_time: parsed.data.out_time
        ? toFrappeDateTime(parsed.data.out_time)
        : undefined,
    };
    const id = await createAttendance(input);
    revalidatePath("/hr/attendance");
    redirect(`/hr/attendance/${encodeURIComponent(id)}`);
  } catch (err) {
    return toFormState(err);
  }
}

export async function submitAttendanceAction(
  id: string,
  _prev: DecisionState,
): Promise<DecisionState> {
  try {
    await submitAttendance(id);
    revalidatePath("/hr/attendance");
    revalidatePath(`/hr/attendance/${encodeURIComponent(id)}`);
    redirect(`/hr/attendance/${encodeURIComponent(id)}`);
  } catch (err) {
    return toFormState(err) as DecisionState;
  }
}

export async function cancelAttendanceAction(
  id: string,
  _prev: DecisionState,
): Promise<DecisionState> {
  try {
    await cancelAttendance(id);
    revalidatePath("/hr/attendance");
    revalidatePath(`/hr/attendance/${encodeURIComponent(id)}`);
    redirect(`/hr/attendance/${encodeURIComponent(id)}`);
  } catch (err) {
    return toFormState(err) as DecisionState;
  }
}

// --- Employee Checkin ----------------------------------------------------

const checkinSchema = z.object({
  employee: z.string().trim().min(1, "Employee is required."),
  log_type: z.enum(["IN", "OUT"]),
  time: dateTime,
  device_id: z.string().trim().optional(),
  skip_auto_attendance: z.union([z.literal("on"), z.literal("")]).optional(),
});

export async function createCheckinAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = checkinSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  try {
    const input: CheckinInput = {
      employee: parsed.data.employee,
      log_type: parsed.data.log_type,
      time: toFrappeDateTime(parsed.data.time),
      device_id: parsed.data.device_id,
      skip_auto_attendance: parsed.data.skip_auto_attendance === "on",
    };
    const id = await createCheckin(input);
    revalidatePath("/hr/attendance?tab=checkins");
    redirect(`/hr/attendance/checkins/${encodeURIComponent(id)}`);
  } catch (err) {
    return toFormState(err);
  }
}

// --- Attendance Request --------------------------------------------------

const attendanceRequestSchema = z
  .object({
    employee: z.string().trim().min(1, "Employee is required."),
    from_date: isoDate,
    to_date: isoDate,
    reason: z.enum(ATTENDANCE_REQUEST_REASONS as [string, ...string[]]),
    explanation: z.string().trim().optional(),
    half_day: z.union([z.literal("on"), z.literal("")]).optional(),
    half_day_date: z.string().trim().optional(),
    include_holidays: z.union([z.literal("on"), z.literal("")]).optional(),
    company: z.string().trim().optional(),
  })
  .refine((d) => d.to_date >= d.from_date, {
    message: "End date must be on or after start date.",
    path: ["to_date"],
  });

export async function createAttendanceRequestAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = attendanceRequestSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  try {
    const input: AttendanceRequestInput = {
      employee: parsed.data.employee,
      from_date: parsed.data.from_date,
      to_date: parsed.data.to_date,
      reason: parsed.data.reason,
      explanation: parsed.data.explanation,
      half_day: parsed.data.half_day === "on",
      half_day_date: parsed.data.half_day_date,
      include_holidays: parsed.data.include_holidays === "on",
      company: parsed.data.company,
    };
    const id = await createAttendanceRequest(input);
    revalidatePath("/hr/attendance?tab=requests");
    redirect(`/hr/attendance/requests/${encodeURIComponent(id)}`);
  } catch (err) {
    return toFormState(err);
  }
}

export async function approveAttendanceRequestAction(
  id: string,
  _prev: DecisionState,
): Promise<DecisionState> {
  try {
    await decideAttendanceRequest(id, "Approved");
    revalidatePath("/hr/attendance?tab=requests");
    revalidatePath(`/hr/attendance/requests/${encodeURIComponent(id)}`);
    redirect(`/hr/attendance/requests/${encodeURIComponent(id)}`);
  } catch (err) {
    return toFormState(err) as DecisionState;
  }
}

export async function rejectAttendanceRequestAction(
  id: string,
  _prev: DecisionState,
): Promise<DecisionState> {
  try {
    await decideAttendanceRequest(id, "Rejected");
    revalidatePath("/hr/attendance?tab=requests");
    revalidatePath(`/hr/attendance/requests/${encodeURIComponent(id)}`);
    redirect(`/hr/attendance/requests/${encodeURIComponent(id)}`);
  } catch (err) {
    return toFormState(err) as DecisionState;
  }
}

function toFrappeDateTime(s: string): string {
  // <input type="datetime-local"> yields "YYYY-MM-DDTHH:MM" (and maybe :SS).
  // Frappe wants "YYYY-MM-DD HH:MM:SS".
  const [d, t] = s.split("T");
  const time = (t ?? "00:00:00").length === 5 ? `${t}:00` : t;
  return `${d} ${time}`;
}

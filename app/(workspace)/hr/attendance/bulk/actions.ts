"use server";

import { revalidatePath } from "next/cache";
import {
  bulkMarkAttendance,
  type BulkMarkResult,
} from "@/lib/frappe/attendance-bulk";
import { toFormState, type StdFormState } from "@/lib/frappe/form-errors";
import { getMyAccess } from "@/lib/frappe/roles";

export type BulkMarkState = StdFormState & {
  result?: BulkMarkResult;
};

const ATTENDANCE_STATUSES = new Set([
  "Present",
  "Absent",
  "On Leave",
  "Half Day",
  "Work From Home",
]);

export async function bulkMarkAttendanceAction(
  _prev: BulkMarkState,
  form: FormData,
): Promise<BulkMarkState> {
  const access = await getMyAccess();
  if (!access.isHrAdmin) {
    return { error: "Only HR admins can bulk-mark attendance." };
  }
  const date = String(form.get("date") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return {
      error: "Pick a valid date.",
      fieldErrors: { date: "Use YYYY-MM-DD." },
    };
  }
  const skipHolidays = form.get("skip_holidays") === "on";
  const skipOnLeave = form.get("skip_on_leave") === "on";

  let rows: Array<{ employee: string; status: string; shift?: string }> = [];
  try {
    const raw = String(form.get("rows_json") ?? "[]");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      rows = parsed
        .map((r) => ({
          employee: String(r?.employee ?? "").trim(),
          status: String(r?.status ?? "").trim(),
          shift: r?.shift ? String(r.shift) : undefined,
        }))
        .filter(
          (r) => r.employee && ATTENDANCE_STATUSES.has(r.status),
        );
    }
  } catch {
    return { error: "Rows payload is corrupt." };
  }
  if (rows.length === 0) {
    return { error: "Pick a status for at least one employee." };
  }

  try {
    const result = await bulkMarkAttendance({
      rows: rows.map((r) => ({
        employee: r.employee,
        date,
        status: r.status,
        shift: r.shift,
      })),
      skipHolidays,
      skipOnLeave,
    });
    revalidatePath("/hr/attendance");
    return { result };
  } catch (err) {
    return toFormState(err);
  }
}

import "server-only";
import { frappeCall } from "./client";

export type AttendanceStatus =
  | "Present"
  | "Absent"
  | "On Leave"
  | "Half Day"
  | "Work From Home";

export type AttendanceDay = {
  date: string; // YYYY-MM-DD
  status: AttendanceStatus | null;
};

export type AttendanceSummary = {
  windowDays: number;
  fromDate: string;
  toDate: string;
  counts: Record<AttendanceStatus, number>;
  totalMarked: number;
  attendanceRate: number; // 0..1 of (Present + WFH + Half Day*0.5) / windowDays
  days: AttendanceDay[];
};

const STATUS_VALUES: AttendanceStatus[] = [
  "Present",
  "Absent",
  "On Leave",
  "Half Day",
  "Work From Home",
];

/**
 * Pulls the trailing-window of Attendance records for one employee and folds
 * them into a day-by-day strip. Unmarked days come back as `status: null` so
 * the UI can render them as "no record" rather than guessing.
 */
export async function fetchEmployeeAttendance(
  employee: string,
  windowDays = 28,
): Promise<AttendanceSummary> {
  const today = new Date();
  const to = isoDate(today);
  const fromDate = new Date(today);
  fromDate.setDate(fromDate.getDate() - (windowDays - 1));
  const from = isoDate(fromDate);

  type Row = {
    name: string;
    attendance_date: string;
    status: AttendanceStatus | null;
  };

  let rows: Row[] = [];
  try {
    rows = await frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Attendance",
        fields: ["name", "attendance_date", "status"],
        filters: JSON.stringify([
          ["employee", "=", employee],
          ["attendance_date", ">=", from],
          ["attendance_date", "<=", to],
          ["docstatus", "!=", 2],
        ]),
        order_by: "attendance_date asc",
        limit_page_length: windowDays + 10,
      },
      as: "user",
    });
  } catch {
    // Employee may not have any records yet, or the user lacks read perms.
    rows = [];
  }

  const byDate = new Map<string, AttendanceStatus | null>();
  for (const r of rows) {
    byDate.set(r.attendance_date.slice(0, 10), r.status ?? null);
  }

  const counts: Record<AttendanceStatus, number> = {
    Present: 0,
    Absent: 0,
    "On Leave": 0,
    "Half Day": 0,
    "Work From Home": 0,
  };
  const days: AttendanceDay[] = [];
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(fromDate);
    d.setDate(d.getDate() + i);
    const iso = isoDate(d);
    const status = byDate.get(iso) ?? null;
    days.push({ date: iso, status });
    if (status && STATUS_VALUES.includes(status)) counts[status]++;
  }

  const effective = counts.Present + counts["Work From Home"] + counts["Half Day"] * 0.5;
  const totalMarked =
    counts.Present +
    counts.Absent +
    counts["On Leave"] +
    counts["Half Day"] +
    counts["Work From Home"];

  return {
    windowDays,
    fromDate: from,
    toDate: to,
    counts,
    totalMarked,
    attendanceRate: windowDays > 0 ? effective / windowDays : 0,
    days,
  };
}

function isoDate(d: Date): string {
  // Local-clock date — Attendance is bookkeeping, not a timestamp; aligning to
  // calendar days matters more than UTC.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

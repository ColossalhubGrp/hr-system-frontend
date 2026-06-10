import "server-only";
import { FrappeRequestError, frappeCall } from "./client";

export type AttendanceRow = {
  id: string;
  employee: string;
  employeeName: string | null;
  attendanceDate: string;
  status: string;
  shift: string | null;
  docstatus: 0 | 1 | 2;
};

export type AttendanceListResult = {
  rows: AttendanceRow[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<string, number>;
};

const STATUSES = [
  "Present",
  "Absent",
  "On Leave",
  "Half Day",
  "Work From Home",
];

export async function listAttendance(opts: {
  employee?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}): Promise<AttendanceListResult> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, opts.pageSize ?? 25));

  const filters: Array<[string, string, string | string[]]> = [];
  if (opts.employee) filters.push(["employee", "=", opts.employee]);
  if (opts.status) filters.push(["status", "=", opts.status]);
  if (opts.from) filters.push(["attendance_date", ">=", opts.from]);
  if (opts.to) filters.push(["attendance_date", "<=", opts.to]);

  type Row = {
    name: string;
    employee: string;
    employee_name: string | null;
    attendance_date: string;
    status: string;
    shift: string | null;
    docstatus: 0 | 1 | 2;
  };

  const [rowsRaw, totalRaw, byStatus] = await Promise.all([
    frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Attendance",
        fields: [
          "name",
          "employee",
          "employee_name",
          "attendance_date",
          "status",
          "shift",
          "docstatus",
        ],
        filters: JSON.stringify(filters),
        order_by: "attendance_date desc",
        limit_start: (page - 1) * pageSize,
        limit_page_length: pageSize,
      },
      as: "user",
    }).catch(() => [] as Row[]),
    frappeCall<number>({
      method: "frappe.client.get_count",
      args: {
        doctype: "Attendance",
        filters: JSON.stringify(filters),
      },
      as: "user",
    }).catch(() => 0),
    Promise.all(
      STATUSES.map(async (s) => {
        const c = await frappeCall<number>({
          method: "frappe.client.get_count",
          args: {
            doctype: "Attendance",
            filters: JSON.stringify([...filters, ["status", "=", s]]),
          },
          as: "user",
        }).catch(() => 0);
        return [s, Number(c ?? 0)] as const;
      }),
    ),
  ]);

  return {
    rows: rowsRaw.map((r) => ({
      id: r.name,
      employee: r.employee,
      employeeName: r.employee_name,
      attendanceDate: r.attendance_date,
      status: r.status,
      shift: r.shift,
      docstatus: r.docstatus,
    })),
    total: Number(totalRaw ?? 0),
    page,
    pageSize,
    counts: Object.fromEntries(byStatus),
  };
}

export const ATTENDANCE_STATUSES = STATUSES;

// --- Employee Check-ins ---------------------------------------------------

export type CheckinRow = {
  id: string;
  employee: string;
  employeeName: string | null;
  logType: string;
  time: string;
  shift: string | null;
  attendance: string | null;
  device: string | null;
};

export async function listCheckins(opts: {
  employee?: string;
  logType?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  rows: CheckinRow[];
  total: number;
  page: number;
  pageSize: number;
  counts: { in: number; out: number };
}> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, opts.pageSize ?? 25));

  const filters: Array<[string, string, string]> = [];
  if (opts.employee) filters.push(["employee", "=", opts.employee]);
  if (opts.logType) filters.push(["log_type", "=", opts.logType]);

  type Row = {
    name: string;
    employee: string;
    employee_name: string | null;
    log_type: string;
    time: string;
    shift: string | null;
    attendance: string | null;
    device_id: string | null;
  };

  const [rowsRaw, totalRaw, ins, outs] = await Promise.all([
    frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Employee Checkin",
        fields: [
          "name",
          "employee",
          "employee_name",
          "log_type",
          "time",
          "shift",
          "attendance",
          "device_id",
        ],
        filters: JSON.stringify(filters),
        order_by: "time desc",
        limit_start: (page - 1) * pageSize,
        limit_page_length: pageSize,
      },
      as: "user",
    }).catch(() => [] as Row[]),
    frappeCall<number>({
      method: "frappe.client.get_count",
      args: { doctype: "Employee Checkin", filters: JSON.stringify(filters) },
      as: "user",
    }).catch(() => 0),
    frappeCall<number>({
      method: "frappe.client.get_count",
      args: {
        doctype: "Employee Checkin",
        filters: JSON.stringify([["log_type", "=", "IN"]]),
      },
      as: "user",
    }).catch(() => 0),
    frappeCall<number>({
      method: "frappe.client.get_count",
      args: {
        doctype: "Employee Checkin",
        filters: JSON.stringify([["log_type", "=", "OUT"]]),
      },
      as: "user",
    }).catch(() => 0),
  ]);

  return {
    rows: rowsRaw.map((r) => ({
      id: r.name,
      employee: r.employee,
      employeeName: r.employee_name,
      logType: r.log_type,
      time: r.time,
      shift: r.shift,
      attendance: r.attendance,
      device: r.device_id,
    })),
    total: Number(totalRaw ?? 0),
    page,
    pageSize,
    counts: { in: Number(ins ?? 0), out: Number(outs ?? 0) },
  };
}

// --- Attendance Requests --------------------------------------------------

export type AttendanceRequestRow = {
  id: string;
  employee: string;
  employeeName: string | null;
  fromDate: string;
  toDate: string;
  reason: string | null;
  explanation: string | null;
  docstatus: 0 | 1 | 2;
};

export async function listAttendanceRequests(opts: {
  employee?: string;
  reason?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  rows: AttendanceRequestRow[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, opts.pageSize ?? 25));

  const filters: Array<[string, string, string]> = [];
  if (opts.employee) filters.push(["employee", "=", opts.employee]);
  if (opts.reason) filters.push(["reason", "=", opts.reason]);

  type Row = {
    name: string;
    employee: string;
    employee_name: string | null;
    from_date: string;
    to_date: string;
    reason: string | null;
    explanation: string | null;
    docstatus: 0 | 1 | 2;
  };

  const [rowsRaw, totalRaw] = await Promise.all([
    frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Attendance Request",
        fields: [
          "name",
          "employee",
          "employee_name",
          "from_date",
          "to_date",
          "reason",
          "explanation",
          "docstatus",
        ],
        filters: JSON.stringify(filters),
        order_by: "from_date desc",
        limit_start: (page - 1) * pageSize,
        limit_page_length: pageSize,
      },
      as: "user",
    }).catch(() => [] as Row[]),
    frappeCall<number>({
      method: "frappe.client.get_count",
      args: {
        doctype: "Attendance Request",
        filters: JSON.stringify(filters),
      },
      as: "user",
    }).catch(() => 0),
  ]);

  return {
    rows: rowsRaw.map((r) => ({
      id: r.name,
      employee: r.employee,
      employeeName: r.employee_name,
      fromDate: r.from_date,
      toDate: r.to_date,
      reason: r.reason,
      explanation: r.explanation,
      docstatus: r.docstatus,
    })),
    total: Number(totalRaw ?? 0),
    page,
    pageSize,
  };
}

export const ATTENDANCE_REQUEST_REASONS = [
  "Work From Home",
  "On Duty",
  "Forgot to Punch In",
  "Forgot to Punch Out",
];

// --- single docs + writes --------------------------------------------------

function compact<T extends Record<string, unknown>>(
  o: T,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    out[k] = v;
  }
  return out;
}

// Attendance ---------------------------------------------------------------

export type AttendanceFull = AttendanceRow & {
  company: string | null;
  department: string | null;
  workingHours: number | null;
  inTime: string | null;
  outTime: string | null;
  lateEntry: boolean;
  earlyExit: boolean;
};

export async function getAttendance(
  id: string,
): Promise<AttendanceFull | null> {
  try {
    type Raw = {
      name: string;
      employee: string;
      employee_name: string | null;
      attendance_date: string;
      status: string;
      shift: string | null;
      company: string | null;
      department: string | null;
      working_hours: number | null;
      in_time: string | null;
      out_time: string | null;
      late_entry: 0 | 1 | boolean | null;
      early_exit: 0 | 1 | boolean | null;
      docstatus: 0 | 1 | 2;
    };
    const doc = await frappeCall<Raw>({
      method: "frappe.client.get",
      args: { doctype: "Attendance", name: id },
      as: "user",
    });
    return {
      id: doc.name,
      employee: doc.employee,
      employeeName: doc.employee_name,
      attendanceDate: doc.attendance_date,
      status: doc.status,
      shift: doc.shift,
      docstatus: doc.docstatus,
      company: doc.company,
      department: doc.department,
      workingHours: doc.working_hours,
      inTime: doc.in_time,
      outTime: doc.out_time,
      lateEntry: Boolean(doc.late_entry),
      earlyExit: Boolean(doc.early_exit),
    };
  } catch (err) {
    if (err instanceof FrappeRequestError && err.status === 404) return null;
    throw err;
  }
}

export type AttendanceInput = {
  employee: string;
  attendance_date: string;
  status: string;
  shift?: string;
  in_time?: string;
  out_time?: string;
  company?: string;
};

export async function createAttendance(
  input: AttendanceInput,
): Promise<string> {
  const doc = {
    doctype: "Attendance",
    ...compact(input),
  };
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    args: { doc },
    verb: "POST",
    as: "user",
  });
  return saved.name;
}

export async function submitAttendance(id: string): Promise<void> {
  const full = await frappeCall<Record<string, unknown>>({
    method: "frappe.client.get",
    args: { doctype: "Attendance", name: id },
    as: "user",
  });
  await frappeCall<unknown>({
    method: "frappe.client.submit",
    args: { doc: full },
    verb: "POST",
    as: "user",
  });
}

export async function cancelAttendance(id: string): Promise<void> {
  await frappeCall<unknown>({
    method: "frappe.client.cancel",
    args: { doctype: "Attendance", name: id },
    verb: "POST",
    as: "user",
  });
}

// Employee Checkin ---------------------------------------------------------

export type CheckinFull = CheckinRow & {
  skipAutoAttendance: boolean;
  latitude: number | null;
  longitude: number | null;
};

export async function getCheckin(id: string): Promise<CheckinFull | null> {
  try {
    type Raw = {
      name: string;
      employee: string;
      employee_name: string | null;
      log_type: string;
      time: string;
      shift: string | null;
      attendance: string | null;
      device_id: string | null;
      skip_auto_attendance: 0 | 1 | boolean | null;
      latitude: number | null;
      longitude: number | null;
    };
    const doc = await frappeCall<Raw>({
      method: "frappe.client.get",
      args: { doctype: "Employee Checkin", name: id },
      as: "user",
    });
    return {
      id: doc.name,
      employee: doc.employee,
      employeeName: doc.employee_name,
      logType: doc.log_type,
      time: doc.time,
      shift: doc.shift,
      attendance: doc.attendance,
      device: doc.device_id,
      skipAutoAttendance: Boolean(doc.skip_auto_attendance),
      latitude: doc.latitude,
      longitude: doc.longitude,
    };
  } catch (err) {
    if (err instanceof FrappeRequestError && err.status === 404) return null;
    throw err;
  }
}

export type CheckinInput = {
  employee: string;
  log_type: "IN" | "OUT";
  time: string; // "YYYY-MM-DD HH:MM:SS"
  device_id?: string;
  skip_auto_attendance?: boolean;
};

export async function createCheckin(input: CheckinInput): Promise<string> {
  const doc = {
    doctype: "Employee Checkin",
    ...compact({
      employee: input.employee,
      log_type: input.log_type,
      time: input.time,
      device_id: input.device_id,
      skip_auto_attendance: input.skip_auto_attendance ? 1 : 0,
    }),
  };
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    args: { doc },
    verb: "POST",
    as: "user",
  });
  return saved.name;
}

// Attendance Request -------------------------------------------------------

export type AttendanceRequestFull = AttendanceRequestRow & {
  halfDay: boolean;
  halfDayDate: string | null;
  includeHolidays: boolean;
  company: string | null;
  department: string | null;
};

export async function getAttendanceRequest(
  id: string,
): Promise<AttendanceRequestFull | null> {
  try {
    type Raw = {
      name: string;
      employee: string;
      employee_name: string | null;
      from_date: string;
      to_date: string;
      reason: string | null;
      explanation: string | null;
      half_day: 0 | 1 | boolean | null;
      half_day_date: string | null;
      include_holidays: 0 | 1 | boolean | null;
      company: string | null;
      department: string | null;
      docstatus: 0 | 1 | 2;
    };
    const doc = await frappeCall<Raw>({
      method: "frappe.client.get",
      args: { doctype: "Attendance Request", name: id },
      as: "user",
    });
    return {
      id: doc.name,
      employee: doc.employee,
      employeeName: doc.employee_name,
      fromDate: doc.from_date,
      toDate: doc.to_date,
      reason: doc.reason,
      explanation: doc.explanation,
      docstatus: doc.docstatus,
      halfDay: Boolean(doc.half_day),
      halfDayDate: doc.half_day_date,
      includeHolidays: Boolean(doc.include_holidays),
      company: doc.company,
      department: doc.department,
    };
  } catch (err) {
    if (err instanceof FrappeRequestError && err.status === 404) return null;
    throw err;
  }
}

export type AttendanceRequestInput = {
  employee: string;
  from_date: string;
  to_date: string;
  reason: string;
  explanation?: string;
  half_day?: boolean;
  half_day_date?: string;
  include_holidays?: boolean;
  company?: string;
};

export async function createAttendanceRequest(
  input: AttendanceRequestInput,
): Promise<string> {
  const doc = {
    doctype: "Attendance Request",
    ...compact({
      employee: input.employee,
      from_date: input.from_date,
      to_date: input.to_date,
      reason: input.reason,
      explanation: input.explanation,
      half_day: input.half_day ? 1 : 0,
      half_day_date: input.half_day_date,
      include_holidays: input.include_holidays ? 1 : 0,
      company: input.company,
    }),
  };
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    args: { doc },
    verb: "POST",
    as: "user",
  });
  return saved.name;
}

/**
 * Frappe doesn't have an explicit "approve" on Attendance Request — the
 * workflow is submit (docstatus 1) = approved, cancel (docstatus 2) = rejected.
 */
export async function decideAttendanceRequest(
  id: string,
  decision: "Approved" | "Rejected",
): Promise<void> {
  if (decision === "Rejected") {
    await frappeCall<unknown>({
      method: "frappe.client.cancel",
      args: { doctype: "Attendance Request", name: id },
      verb: "POST",
      as: "user",
    });
    return;
  }
  const full = await frappeCall<Record<string, unknown>>({
    method: "frappe.client.get",
    args: { doctype: "Attendance Request", name: id },
    as: "user",
  });
  await frappeCall<unknown>({
    method: "frappe.client.submit",
    args: { doc: full },
    verb: "POST",
    as: "user",
  });
}

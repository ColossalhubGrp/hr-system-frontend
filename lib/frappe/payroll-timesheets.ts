import "server-only";
import { frappeCall } from "./client";

/**
 * One row per (payroll_run, employee) — the payroll engine's
 * source of truth for hours worked when Attendance is running or a
 * CSV was uploaded. Feeds the /payroll/[id]/timesheets review page
 * and, once approved, the wizard's Hourly step + salaried OT
 * auto-earning.
 */
export type PayrollTimesheetSource = "MANUAL" | "ATTENDANCE" | "UPLOAD";

export type TimesheetFlagSeverity = "info" | "warn" | "error";

export type TimesheetFlag = {
  code: string;
  severity: TimesheetFlagSeverity;
  message: string;
};

export type PayrollTimesheetRow = {
  name: string;
  employee: string;
  employee_name?: string;
  payroll_class: "SALARIED" | "HOURLY" | "CONTRACTOR";
  regular_hours: number;
  overtime_hours: number;
  weekend_hours: number;
  holiday_hours: number;
  expected_hours: number;
  attendance_days: number;
  source: PayrollTimesheetSource;
  is_manually_overridden: boolean;
  approved: boolean;
  flags: TimesheetFlag[];
  notes: string | null;
};

function parseFlags(raw: unknown): TimesheetFlag[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((f) => {
      const sev = String((f as { severity?: unknown }).severity ?? "warn");
      return {
        code: String((f as { code?: unknown }).code ?? "UNKNOWN"),
        severity: (sev === "error" || sev === "info" ? sev : "warn") as TimesheetFlagSeverity,
        message: String((f as { message?: unknown }).message ?? ""),
      };
    });
  } catch {
    return [];
  }
}

export async function listTimesheetsForRun(payrollRun: string): Promise<{
  rows: PayrollTimesheetRow[];
  approved: number;
  with_flags: number;
  total: number;
}> {
  try {
    const raw = await frappeCall<
      | {
          rows: Array<Record<string, unknown>>;
          approved: number;
          with_flags: number;
          total: number;
        }
      | { message?: unknown }
    >({
      method: "recruitment_app.api.approvals.admin_list_timesheets",
      args: { payroll_run: payrollRun },
      as: "user",
    });
    const inner =
      (raw as { message?: unknown }).message !== undefined
        ? (raw as { message: unknown }).message
        : raw;
    const outer = inner as {
      rows?: Array<Record<string, unknown>>;
      approved?: number;
      with_flags?: number;
      total?: number;
    };
    const rawRows = outer.rows ?? [];
    if (rawRows.length === 0) {
      return { rows: [], approved: 0, with_flags: 0, total: 0 };
    }

    // Enrich with employee_name in one query.
    const empIds = Array.from(new Set(rawRows.map((r) => String(r.employee))));
    let nameMap = new Map<string, string>();
    if (empIds.length > 0) {
      const empRows = await frappeCall<
        Array<{ name: string; employee_name: string | null }>
      >({
        method: "frappe.client.get_list",
        args: {
          doctype: "Employee",
          fields: ["name", "employee_name"],
          filters: JSON.stringify([["name", "in", empIds]]),
          limit_page_length: 5000,
        },
        as: "user",
      });
      nameMap = new Map(
        (empRows ?? []).map((e) => [e.name, e.employee_name ?? e.name] as const),
      );
    }

    const rows: PayrollTimesheetRow[] = rawRows.map((r) => ({
      name: String(r.name),
      employee: String(r.employee),
      employee_name: nameMap.get(String(r.employee)),
      payroll_class:
        String(r.payroll_class ?? "SALARIED").toUpperCase() === "HOURLY"
          ? "HOURLY"
          : String(r.payroll_class ?? "SALARIED").toUpperCase() === "CONTRACTOR"
          ? "CONTRACTOR"
          : "SALARIED",
      regular_hours: Number(r.regular_hours ?? 0),
      overtime_hours: Number(r.overtime_hours ?? 0),
      weekend_hours: Number(r.weekend_hours ?? 0),
      holiday_hours: Number(r.holiday_hours ?? 0),
      expected_hours: Number(r.expected_hours ?? 0),
      attendance_days: Number(r.attendance_days ?? 0),
      source: (["MANUAL", "ATTENDANCE", "UPLOAD"].includes(String(r.source ?? "MANUAL"))
        ? String(r.source ?? "MANUAL")
        : "MANUAL") as PayrollTimesheetSource,
      is_manually_overridden: Boolean(r.is_manually_overridden),
      approved: Boolean(r.approved),
      flags: parseFlags(r.flags_json),
      notes: (r.notes as string | null) ?? null,
    }));

    return {
      rows,
      approved: Number(outer.approved ?? 0),
      with_flags: Number(outer.with_flags ?? 0),
      total: Number(outer.total ?? rows.length),
    };
  } catch {
    return { rows: [], approved: 0, with_flags: 0, total: 0 };
  }
}

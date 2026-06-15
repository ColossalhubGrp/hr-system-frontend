import "server-only";
import { frappeCall } from "./client";

/**
 * Data Steward workspace data layer.
 *
 * Three reads, in parallel: the metric catalog (named org metrics with
 * definitions + live values), reference-data counts (taxonomy doctypes),
 * and data-quality checks (orphan / integrity probes).
 *
 * The metric catalog is defined here in TypeScript for v1 — each entry has
 * its own `query` that returns a `value` + `count`. Later, this can be
 * lifted into a Frappe `Metric Definition` doctype managed via Desk; the
 * shape of `MetricRow` is forward-compatible with that schema.
 */

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type MetricRow = {
  /** Stable kebab-case id, e.g. `headcount-active`. */
  id: string;
  /** Display label, e.g. "Active headcount". */
  label: string;
  /** What this metric measures, in one sentence. */
  description: string;
  /** Source DocType the value derives from. */
  sourceDoctype: string;
  /** Human-readable filter description, e.g. "status = Active". */
  filterSummary: string;
  /** Optional click-through to the corresponding list view. */
  drilldown?: string;
  /** Computed value at render time. */
  value: number;
  /** Display formatting hint. */
  format: "count" | "percent" | "currency";
};

export type ReferenceDataRow = {
  doctype: string;
  label: string;
  count: number;
  drilldown: string;
};

export type DataQualityIssue = {
  id: string;
  label: string;
  description: string;
  count: number;
  /** Click-through to the records that match this issue, if available. */
  drilldown?: string;
  /** "info" (informational), "warn" (worth addressing), "crit" (must fix). */
  severity: "info" | "warn" | "crit";
};

export type DataStewardBoard = {
  metrics: MetricRow[];
  referenceData: ReferenceDataRow[];
  quality: DataQualityIssue[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function countOf(
  doctype: string,
  filters?: Array<[string, string, string | number | string[]]>,
): Promise<number> {
  try {
    const args: Record<string, unknown> = { doctype };
    if (filters && filters.length > 0) args.filters = JSON.stringify(filters);
    const result = await frappeCall<number>({
      method: "frappe.client.get_count",
      args,
      as: "user",
    });
    return Number(result ?? 0);
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Public board fetcher
// ---------------------------------------------------------------------------

export async function fetchDataStewardBoard(): Promise<DataStewardBoard> {
  // Run every probe in parallel — these are all read-only counts so there's
  // no ordering constraint. Each failure degrades to 0 (countOf already
  // swallows errors).
  const [
    headcountActive,
    headcountLeft,
    employeesWithUser,
    leaveOpen,
    leaveApproved,
    attendancePresent,
    attendanceTotal,
    payrollSubmitted,
    payrollDraft,
    salarySlipsSubmitted,
    goalsInProgress,
    goalsCompleted,
    appraisalsTotal,
    departmentCount,
    designationCount,
    employmentTypeCount,
    branchCount,
    holidayListCount,
    leaveTypeCount,
    shiftTypeCount,
    qEmpNoDept,
    qEmpNoDesignation,
    qEmpNoUser,
    qGoalNoOwner,
    qSlipZeroNet,
    qActiveNoDoj,
    qLeftNoRelieving,
  ] = await Promise.all([
    // metric catalog
    countOf("Employee", [["status", "=", "Active"]]),
    countOf("Employee", [["status", "=", "Left"]]),
    countOf("Employee", [
      ["status", "=", "Active"],
      ["user_id", "is", "set"],
    ]),
    countOf("Leave Application", [["status", "=", "Open"]]),
    countOf("Leave Application", [["status", "=", "Approved"]]),
    countOf("Attendance", [["status", "=", "Present"]]),
    countOf("Attendance", []),
    countOf("Payroll Entry", [["docstatus", "=", 1]]),
    countOf("Payroll Entry", [["docstatus", "=", 0]]),
    countOf("Salary Slip", [["docstatus", "=", 1]]),
    countOf("Goal", [["status", "=", "In Progress"]]),
    countOf("Goal", [["status", "=", "Completed"]]),
    countOf("Appraisal", []),
    // reference data
    countOf("Department", []),
    countOf("Designation", []),
    countOf("Employment Type", []),
    countOf("Branch", []),
    countOf("Holiday List", []),
    countOf("Leave Type", []),
    countOf("Shift Type", []),
    // data quality probes
    countOf("Employee", [
      ["status", "=", "Active"],
      ["department", "is", "not set"],
    ]),
    countOf("Employee", [
      ["status", "=", "Active"],
      ["designation", "is", "not set"],
    ]),
    countOf("Employee", [
      ["status", "=", "Active"],
      ["user_id", "is", "not set"],
    ]),
    countOf("Goal", [["employee", "is", "not set"]]),
    countOf("Salary Slip", [
      ["docstatus", "=", 1],
      ["net_pay", "<=", "0" as unknown as string],
    ]),
    countOf("Employee", [
      ["status", "=", "Active"],
      ["date_of_joining", "is", "not set"],
    ]),
    countOf("Employee", [
      ["status", "=", "Left"],
      ["relieving_date", "is", "not set"],
    ]),
  ]);

  // Compute derived metrics from the raw counts.
  const attritionDenominator = headcountActive + headcountLeft;
  const attritionPct =
    attritionDenominator > 0
      ? Math.round((headcountLeft / attritionDenominator) * 100)
      : 0;
  const attendancePct =
    attendanceTotal > 0
      ? Math.round((attendancePresent / attendanceTotal) * 100)
      : 0;
  const goalCompletionPct =
    goalsInProgress + goalsCompleted > 0
      ? Math.round(
          (goalsCompleted / (goalsInProgress + goalsCompleted)) * 100,
        )
      : 0;
  const userLinkedPct =
    headcountActive > 0
      ? Math.round((employeesWithUser / headcountActive) * 100)
      : 0;

  const metrics: MetricRow[] = [
    {
      id: "headcount-active",
      label: "Active headcount",
      description: "Currently-active employees across the organisation.",
      sourceDoctype: "Employee",
      filterSummary: "status = Active",
      drilldown: "/employee?status=Active",
      value: headcountActive,
      format: "count",
    },
    {
      id: "headcount-left",
      label: "Departed (Left)",
      description: "Employees flagged Left across all time.",
      sourceDoctype: "Employee",
      filterSummary: "status = Left",
      drilldown: "/employee?status=Left",
      value: headcountLeft,
      format: "count",
    },
    {
      id: "attrition-rate",
      label: "Attrition rate (cumulative)",
      description:
        "Left / (Active + Left) — directional indicator, not annualised.",
      sourceDoctype: "Employee",
      filterSummary: "derived",
      value: attritionPct,
      format: "percent",
    },
    {
      id: "user-linked-rate",
      label: "Active employees with user account",
      description:
        "Linkage between Employee and User — required for self-service.",
      sourceDoctype: "Employee",
      filterSummary: "status = Active AND user_id is set",
      value: userLinkedPct,
      format: "percent",
    },
    {
      id: "leave-open",
      label: "Pending leave requests",
      description: "Leave applications awaiting an approver decision.",
      sourceDoctype: "Leave Application",
      filterSummary: "status = Open",
      drilldown: "/hr/leaves?status=Open",
      value: leaveOpen,
      format: "count",
    },
    {
      id: "leave-approved",
      label: "Approved leaves (lifetime)",
      description: "Total approved leave applications on record.",
      sourceDoctype: "Leave Application",
      filterSummary: "status = Approved",
      drilldown: "/hr/leaves?status=Approved",
      value: leaveApproved,
      format: "count",
    },
    {
      id: "attendance-rate",
      label: "Attendance rate (lifetime)",
      description: "Present / total marked Attendance rows.",
      sourceDoctype: "Attendance",
      filterSummary: "Present / All",
      drilldown: "/hr/attendance",
      value: attendancePct,
      format: "percent",
    },
    {
      id: "payroll-submitted",
      label: "Submitted payroll runs",
      description: "Payroll Entry docs that have been signed off (docstatus=1).",
      sourceDoctype: "Payroll Entry",
      filterSummary: "docstatus = 1",
      drilldown: "/payroll/entries?status=Submitted",
      value: payrollSubmitted,
      format: "count",
    },
    {
      id: "payroll-draft",
      label: "Draft payroll runs",
      description: "Awaiting Finance Reviewer sign-off.",
      sourceDoctype: "Payroll Entry",
      filterSummary: "docstatus = 0",
      drilldown: "/payroll/review",
      value: payrollDraft,
      format: "count",
    },
    {
      id: "salary-slips-submitted",
      label: "Submitted salary slips",
      description: "All salary slips with docstatus=1.",
      sourceDoctype: "Salary Slip",
      filterSummary: "docstatus = 1",
      drilldown: "/payroll?status=Submitted",
      value: salarySlipsSubmitted,
      format: "count",
    },
    {
      id: "goal-completion",
      label: "Goal completion rate",
      description: "Completed / (In Progress + Completed).",
      sourceDoctype: "Goal",
      filterSummary: "derived",
      value: goalCompletionPct,
      format: "percent",
    },
    {
      id: "appraisals-total",
      label: "Appraisals on record",
      description: "All Appraisal rows across every cycle.",
      sourceDoctype: "Appraisal",
      filterSummary: "all",
      drilldown: "/hr/performance",
      value: appraisalsTotal,
      format: "count",
    },
  ];

  const referenceData: ReferenceDataRow[] = [
    { doctype: "Department", label: "Departments", count: departmentCount, drilldown: "/hr/leaves" },
    { doctype: "Designation", label: "Designations", count: designationCount, drilldown: "/employee" },
    { doctype: "Employment Type", label: "Employment types", count: employmentTypeCount, drilldown: "/employee" },
    { doctype: "Branch", label: "Branches", count: branchCount, drilldown: "/employee" },
    { doctype: "Holiday List", label: "Holiday lists", count: holidayListCount, drilldown: "/employee" },
    { doctype: "Leave Type", label: "Leave types", count: leaveTypeCount, drilldown: "/hr/leaves" },
    { doctype: "Shift Type", label: "Shift types", count: shiftTypeCount, drilldown: "/hr/shift-management" },
  ];

  const quality: DataQualityIssue[] = [
    {
      id: "active-no-dept",
      label: "Active employees with no department",
      description:
        "Department is the primary axis for leave, payroll and reporting — missing here breaks aggregation.",
      count: qEmpNoDept,
      drilldown: "/employee?status=Active",
      severity: qEmpNoDept > 0 ? "warn" : "info",
    },
    {
      id: "active-no-designation",
      label: "Active employees with no designation",
      description:
        "Designation is used by recruitment matching and analytics.",
      count: qEmpNoDesignation,
      drilldown: "/employee?status=Active",
      severity: qEmpNoDesignation > 0 ? "warn" : "info",
    },
    {
      id: "active-no-user",
      label: "Active employees with no user account",
      description:
        "Without a linked User, the employee can't self-serve, clock in, or apply for leave.",
      count: qEmpNoUser,
      drilldown: "/employee?status=Active",
      severity: qEmpNoUser > 0 ? "crit" : "info",
    },
    {
      id: "active-no-doj",
      label: "Active employees with no joining date",
      description:
        "Required for tenure calculations and payroll proration.",
      count: qActiveNoDoj,
      drilldown: "/employee?status=Active",
      severity: qActiveNoDoj > 0 ? "warn" : "info",
    },
    {
      id: "left-no-relieving",
      label: "Departed employees with no relieving date",
      description:
        "Alumni portal can't compute tenure without this — and exit reporting becomes lossy.",
      count: qLeftNoRelieving,
      drilldown: "/employee?status=Left",
      severity: qLeftNoRelieving > 0 ? "warn" : "info",
    },
    {
      id: "goals-no-owner",
      label: "Goals with no employee owner",
      description:
        "Standalone goals must still have an owner — orphan goals don't appear on anyone's /me.",
      count: qGoalNoOwner,
      drilldown: "/hr/performance?tab=goals",
      severity: qGoalNoOwner > 0 ? "warn" : "info",
    },
    {
      id: "slips-zero-net",
      label: "Submitted salary slips with zero or negative net pay",
      description:
        "Likely a Salary Structure misconfiguration — investigate before the next pay run.",
      count: qSlipZeroNet,
      drilldown: "/payroll",
      severity: qSlipZeroNet > 0 ? "crit" : "info",
    },
  ];

  return { metrics, referenceData, quality };
}

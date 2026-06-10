import "server-only";
import { frappeCall } from "./client";

export type AnalyticsBoard = {
  headcount: number;
  leavesOpen: number;
  leavesApproved: number;
  expensesSubmitted: number;
  expensesSanctioned: number;
  attendanceLast30: number;
  presentLast30: number;
  trainingScheduled: number;
  trainingCompleted: number;
  appraisalsSubmitted: number;
  goalsInProgress: number;
  payrollNetTotal: number;
  loansOutstanding: number;
  recentLeaves: Array<{
    id: string;
    employee: string;
    employeeName: string | null;
    leaveType: string;
    fromDate: string;
    status: string;
  }>;
  recentClaims: Array<{
    id: string;
    employee: string;
    employeeName: string | null;
    postingDate: string;
    totalClaimedAmount: number;
    status: string;
  }>;
};

const safe = <T>(p: Promise<T>, fallback: T): Promise<T> =>
  p.catch(() => fallback);

async function count(doctype: string, filters: unknown = []): Promise<number> {
  return safe(
    frappeCall<number>({
      method: "frappe.client.get_count",
      args: { doctype, filters: JSON.stringify(filters) },
      as: "user",
    }).then((n) => Number(n ?? 0)),
    0,
  );
}

async function sum(
  doctype: string,
  field: string,
  filters: unknown = [],
): Promise<number> {
  type Row = Record<string, number | null>;
  const rows = await safe(
    frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype,
        fields: [field],
        filters: JSON.stringify(filters),
        limit_page_length: 1000,
      },
      as: "user",
    }),
    [] as Row[],
  );
  return rows.reduce((acc, r) => acc + Number(r[field] ?? 0), 0);
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export async function fetchAnalyticsBoard(): Promise<AnalyticsBoard> {
  const from30 = isoDaysAgo(30);

  type RecentLeave = {
    name: string;
    employee: string;
    employee_name: string | null;
    leave_type: string;
    from_date: string;
    status: string;
  };
  type RecentClaim = {
    name: string;
    employee: string;
    employee_name: string | null;
    posting_date: string;
    total_claimed_amount: number | null;
    status: string;
  };

  const [
    headcount,
    leavesOpen,
    leavesApproved,
    expensesSubmitted,
    expensesSanctioned,
    attendanceLast30,
    presentLast30,
    trainingScheduled,
    trainingCompleted,
    appraisalsSubmitted,
    goalsInProgress,
    payrollNetTotal,
    loansOutstandingRows,
    recentLeavesRaw,
    recentClaimsRaw,
  ] = await Promise.all([
    count("Employee", [["status", "=", "Active"]]),
    count("Leave Application", [["status", "=", "Open"]]),
    count("Leave Application", [["status", "=", "Approved"]]),
    count("Expense Claim", [["status", "=", "Submitted"]]),
    sum("Expense Claim", "total_sanctioned_amount", [
      ["status", "in", ["Approved", "Paid"]],
    ]),
    count("Attendance", [["attendance_date", ">=", from30]]),
    count("Attendance", [
      ["attendance_date", ">=", from30],
      ["status", "=", "Present"],
    ]),
    count("Training Event", [["event_status", "=", "Scheduled"]]),
    count("Training Event", [["event_status", "=", "Completed"]]),
    count("Appraisal", [["docstatus", "=", 1]]),
    count("Goal", [["status", "=", "In Progress"]]),
    sum("Salary Slip", "net_pay", [["docstatus", "=", 1]]),
    safe(
      frappeCall<
        Array<{
          total_payment: number | null;
          total_amount_paid: number | null;
        }>
      >({
        method: "frappe.client.get_list",
        args: {
          doctype: "Loan",
          fields: ["total_payment", "total_amount_paid"],
          filters: JSON.stringify([
            ["status", "in", ["Sanctioned", "Partially Disbursed", "Disbursed"]],
          ]),
          limit_page_length: 1000,
        },
        as: "user",
      }),
      [] as Array<{ total_payment: number | null; total_amount_paid: number | null }>,
    ),
    safe(
      frappeCall<RecentLeave[]>({
        method: "frappe.client.get_list",
        args: {
          doctype: "Leave Application",
          fields: ["name", "employee", "employee_name", "leave_type", "from_date", "status"],
          order_by: "from_date desc",
          limit_page_length: 5,
        },
        as: "user",
      }),
      [] as RecentLeave[],
    ),
    safe(
      frappeCall<RecentClaim[]>({
        method: "frappe.client.get_list",
        args: {
          doctype: "Expense Claim",
          fields: [
            "name",
            "employee",
            "employee_name",
            "posting_date",
            "total_claimed_amount",
            "status",
          ],
          order_by: "posting_date desc",
          limit_page_length: 5,
        },
        as: "user",
      }),
      [] as RecentClaim[],
    ),
  ]);

  const loansOutstanding = loansOutstandingRows.reduce(
    (acc, r) =>
      acc +
      Math.max(0, Number(r.total_payment ?? 0) - Number(r.total_amount_paid ?? 0)),
    0,
  );

  return {
    headcount,
    leavesOpen,
    leavesApproved,
    expensesSubmitted,
    expensesSanctioned,
    attendanceLast30,
    presentLast30,
    trainingScheduled,
    trainingCompleted,
    appraisalsSubmitted,
    goalsInProgress,
    payrollNetTotal,
    loansOutstanding,
    recentLeaves: recentLeavesRaw.map((r) => ({
      id: r.name,
      employee: r.employee,
      employeeName: r.employee_name,
      leaveType: r.leave_type,
      fromDate: r.from_date,
      status: r.status,
    })),
    recentClaims: recentClaimsRaw.map((r) => ({
      id: r.name,
      employee: r.employee,
      employeeName: r.employee_name,
      postingDate: r.posting_date,
      totalClaimedAmount: Number(r.total_claimed_amount ?? 0),
      status: r.status,
    })),
  };
}

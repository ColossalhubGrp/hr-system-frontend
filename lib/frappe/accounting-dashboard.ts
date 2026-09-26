import "server-only";
import { frappeCall } from "./client";
import { profitAndLoss } from "./accounting-reports";

/**
 * Aggregates for the /accounting/dashboard page. Numbers come from
 * the same DocTypes and reports the rest of the module uses so
 * everything stays consistent.
 */

export type DashboardTotals = {
  totalOutgoingBills: number; // sum of submitted Purchase Invoices
  totalIncomingBills: number; // sum of submitted Sales Invoices
  totalIncomingPayment: number; // sum of submitted Receive Payment Entries
  totalOutgoingPayment: number; // sum of submitted Pay Payment Entries
  accountsReceivableOutstanding: number;
  accountsPayableOutstanding: number;
};

export type PnlPoint = { period: string; income: number; expense: number; net: number };

export async function getAccountingDashboardTotals(company: string): Promise<DashboardTotals> {
  const [pi, si, pePaid, peReceived, arOs, apOs] = await Promise.all([
    sumField("Purchase Invoice", "grand_total", [
      ["company", "=", company],
      ["docstatus", "=", 1],
    ]),
    sumField("Sales Invoice", "grand_total", [
      ["company", "=", company],
      ["docstatus", "=", 1],
    ]),
    sumField("Payment Entry", "paid_amount", [
      ["company", "=", company],
      ["docstatus", "=", 1],
      ["payment_type", "=", "Pay"],
    ]),
    sumField("Payment Entry", "received_amount", [
      ["company", "=", company],
      ["docstatus", "=", 1],
      ["payment_type", "=", "Receive"],
    ]),
    sumField("Sales Invoice", "outstanding_amount", [
      ["company", "=", company],
      ["docstatus", "=", 1],
    ]),
    sumField("Purchase Invoice", "outstanding_amount", [
      ["company", "=", company],
      ["docstatus", "=", 1],
    ]),
  ]);
  return {
    totalOutgoingBills: pi,
    totalIncomingBills: si,
    totalIncomingPayment: peReceived,
    totalOutgoingPayment: pePaid,
    accountsReceivableOutstanding: arOs,
    accountsPayableOutstanding: apOs,
  };
}

async function sumField(
  doctype: string,
  field: string,
  filters: Array<[string, string, unknown]>,
): Promise<number> {
  try {
    const rows = await frappeCall<Array<Record<string, unknown>>>({
      method: "frappe.client.get_list",
      as: "user",
      args: { doctype, fields: [field], filters, limit_page_length: 0 },
    });
    return rows.reduce((acc, r) => acc + Number(r[field] ?? 0), 0);
  } catch {
    return 0;
  }
}

/**
 * Pulls a monthly P&L for the year-to-date and rehydrates it into a
 * flat series the chart can render.
 */
export async function getYtdPnl(company: string): Promise<PnlPoint[]> {
  const now = new Date();
  const from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  try {
    const report = await profitAndLoss({
      company,
      fromDate: from,
      toDate: to,
      periodicity: "Monthly",
    });
    return reshapePnlToPoints(report.columns, report.result);
  } catch {
    return [];
  }
}

function reshapePnlToPoints(
  columns: Array<{ fieldname: string; fieldtype: string; label: string }>,
  rows: Array<Record<string, unknown>>,
): PnlPoint[] {
  // Monthly columns are the Currency-typed columns other than the total.
  const monthCols = columns.filter(
    (c) => (c.fieldtype === "Currency" || c.fieldtype === "Float") && !/total/i.test(c.label),
  );
  // Row identity: look for is_income_or_expense sentinel in the row.
  const findTotalRow = (kind: RegExp) => rows.find((r) => kind.test(String(r.account ?? r.account_name ?? "")));
  const incomeRow = findTotalRow(/total income/i);
  const expenseRow = findTotalRow(/total expense/i);
  return monthCols.map((c) => {
    const income = Number(incomeRow?.[c.fieldname] ?? 0);
    const expense = Number(expenseRow?.[c.fieldname] ?? 0);
    return { period: c.label, income, expense, net: income - expense };
  });
}

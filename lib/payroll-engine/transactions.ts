import "server-only";
import { frappeCall } from "@/lib/frappe/client";
import { myCompany } from "@/lib/references/server";

/**
 * Transactions data layer (Belina parity).
 *
 *   listOpenPayRun()                        the current Draft pay run on this
 *                                            company (Belina's first OPEN period)
 *   listTransactionsForRun(payrollEntry)    rows for that run, sorted newest-first
 *   listActiveEmployees()                   ID + display name for the modal picker
 *   insertTransaction(payload)              create
 *   deleteTransactionRow(name)              delete
 */

export type OpenPayRun = {
  name: string;
  label: string;          // e.g. "June 2026"
  pay_date: string;
};

export type TransactionRow = {
  name: string;
  payroll_run: string;
  employee: string;
  employee_name: string;
  kind: "EARNING" | "DEDUCTION";
  code: string;
  currency: string;
  amount: number;
  taxable: 0 | 1 | boolean;
};

export type EmployeePick = {
  id: string;
  name: string;          // display: "HR-EMP-001 · First Last"
};

// ── reads ────────────────────────────────────────────────────────

async function listDocs<T extends Record<string, unknown>>(
  doctype: string,
  opts: {
    fields: string[];
    filters?: Record<string, unknown>;
    orderBy?: string;
    limit?: number;
  },
): Promise<T[]> {
  try {
    const res = await frappeCall<
      Array<Record<string, unknown>> | { message?: Array<Record<string, unknown>> }
    >({
      method: "frappe.client.get_list",
      args: {
        doctype,
        filters: opts.filters ?? {},
        fields: opts.fields,
        order_by: opts.orderBy ?? "modified desc",
        limit_page_length: opts.limit ?? 500,
      },
      as: "user",
    });
    const rows = Array.isArray(res)
      ? res
      : ((res?.message ?? []) as Array<Record<string, unknown>>);
    return rows as T[];
  } catch (err) {
    console.error(`[transactions] listDocs ${doctype} failed:`, err);
    return [];
  }
}

/**
 * Returns the most recent OPEN Payroll Run on the current company,
 * or null. Mirrors Belina's `findFirst({status:'OPEN'})`.
 */
export async function listOpenPayRun(): Promise<OpenPayRun | null> {
  const company = await myCompany();
  if (!company) return null;
  const rows = await listDocs<{
    name: string;
    period_label: string;
    pay_date: string;
  }>("Payroll Run", {
    fields: ["name", "period_label", "pay_date"],
    filters: { company, status: "OPEN" },
    orderBy: "pay_date desc",
    limit: 1,
  });
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    name: r.name,
    label: r.period_label || r.name,
    pay_date: r.pay_date,
  };
}

export async function listTransactionsForRun(payrollRun: string): Promise<TransactionRow[]> {
  const rows = await listDocs<TransactionRow>("Payroll Transaction", {
    fields: ["name", "payroll_run", "employee", "kind", "code", "currency", "amount", "taxable"],
    filters: { payroll_run: payrollRun },
    orderBy: "creation desc",
    limit: 500,
  });
  if (rows.length === 0) return [];
  // Enrich with employee_name in one query (avoid N+1).
  const ids = Array.from(new Set(rows.map((r) => r.employee)));
  const names = await listDocs<{ name: string; employee_name: string }>("Employee", {
    fields: ["name", "employee_name"],
    filters: { name: ["in", ids] },
  });
  const nameMap = new Map(names.map((n) => [n.name, n.employee_name] as const));
  return rows.map((r) => ({ ...r, employee_name: nameMap.get(r.employee) ?? r.employee }));
}

export async function listActiveEmployees(): Promise<EmployeePick[]> {
  const company = await myCompany();
  if (!company) return [];
  const rows = await listDocs<{ name: string; employee_name: string }>("Employee", {
    fields: ["name", "employee_name"],
    filters: { company, status: "Active" },
    orderBy: "name asc",
    limit: 1000,
  });
  return rows.map((e) => ({
    id: e.name,
    name: `${e.name} · ${e.employee_name}`,
  }));
}

// ── writes ───────────────────────────────────────────────────────

export async function insertTransaction(payload: {
  company: string;
  payroll_run: string;
  employee: string;
  kind: "EARNING" | "DEDUCTION";
  code: string;
  currency: string;
  amount: number;
  taxable: 0 | 1;
}): Promise<string> {
  const res = await frappeCall<{ name: string } | { message?: { name: string } }>({
    method: "frappe.client.insert",
    args: { doc: { doctype: "Payroll Transaction", ...payload } },
    as: "user",
    verb: "POST",
  });
  const inner = (res as { message?: { name: string } }).message ?? res;
  return (inner as { name: string }).name;
}

export async function deleteTransactionRow(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    args: { doctype: "Payroll Transaction", name },
    as: "user",
    verb: "POST",
  });
}

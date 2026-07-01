"use server";

import { revalidatePath } from "next/cache";
import { getMyAccess } from "@/lib/frappe/roles";
import { myCompany } from "@/lib/references/server";
import {
  insertTransaction,
  deleteTransactionRow,
} from "@/lib/payroll-engine/transactions";
import { listTxnCodes } from "@/lib/payroll-engine/setup";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const n = (fd: FormData, k: string) => Number(fd.get(k) || 0);

async function ensurePayrollAdmin(): Promise<void> {
  const access = await getMyAccess();
  if (!access.isPayrollAdmin && !access.isHrAdmin) {
    throw new Error("You need Payroll Admin or HR Admin to capture transactions.");
  }
}

export async function addTransaction(fd: FormData): Promise<void> {
  await ensurePayrollAdmin();
  const company = await myCompany();
  if (!company) throw new Error("No company in session.");
  const code = s(fd, "code");
  if (!code) throw new Error("Pick a code.");

  // Currency + tax treatment are owned by the code (Setup → Earnings
  // & Deductions), not by the per-transaction capture. Look the code
  // up so the modal doesn't need to ask the user again, and so the
  // Setup default actually wins.
  const allCodes = await listTxnCodes();
  const match = allCodes.find((c) => c.code === code);
  if (!match) throw new Error(`Code '${code}' not found in Setup.`);
  const taxable: 0 | 1 = match.taxable ? 1 : 0;
  const currency = match.default_currency || "USD";

  await insertTransaction({
    company,
    payroll_run: s(fd, "payPeriodId"),
    employee: s(fd, "employeeId"),
    kind: (s(fd, "kind") || "EARNING") as "EARNING" | "DEDUCTION",
    code,
    currency,
    amount: n(fd, "amount"),
    taxable,
  });
  revalidatePath("/payroll/transactions");
  revalidatePath(`/payroll/${encodeURIComponent(s(fd, "payPeriodId"))}`);
}

export async function deleteTransaction(id: string): Promise<void> {
  await ensurePayrollAdmin();
  await deleteTransactionRow(id);
  revalidatePath("/payroll/transactions");
}

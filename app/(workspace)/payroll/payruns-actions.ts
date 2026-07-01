"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { frappeCall } from "@/lib/frappe/client";
import { getMyAccess } from "@/lib/frappe/roles";

/**
 * Belina-flow Payroll Run server actions. Each one is a thin wrapper
 * around the Python whitelisted methods in
 * tenant_manager.payroll_engine.api.belina_run.
 */

async function ensurePayrollAdmin(): Promise<void> {
  const access = await getMyAccess();
  if (!access.isPayrollAdmin && !access.isHrAdmin) {
    throw new Error("You need Payroll Admin or HR Admin to run payroll.");
  }
}

function unwrap<T>(res: T | { message?: T }): T {
  if (res && typeof res === "object" && "message" in (res as object)) {
    return ((res as { message?: T }).message ?? (res as T));
  }
  return res as T;
}

// ── create_period ────────────────────────────────────────────────

export async function createPeriod(formData: FormData): Promise<void> {
  await ensurePayrollAdmin();
  const month = Number(formData.get("month") || 0);
  const year = Number(formData.get("year") || 0);
  if (!month || !year) throw new Error("Pick a month and year.");

  const raw = await frappeCall<
    { payroll_run: string; exists: boolean } | { message?: { payroll_run: string; exists: boolean } }
  >({
    method: "tenant_manager.payroll_engine.api.belina_run.create_period",
    args: { month, year },
    as: "user",
    verb: "POST",
  });
  const result = unwrap(raw);
  revalidatePath("/payroll");
  redirect(
    `/payroll/${encodeURIComponent(result.payroll_run)}` +
      (result.exists ? "?exists=1" : ""),
  );
}

// ── process_period ───────────────────────────────────────────────

export async function processPeriod(payrollRun: string): Promise<void> {
  await ensurePayrollAdmin();
  await frappeCall({
    method: "tenant_manager.payroll_engine.api.belina_run.process_period",
    args: { payroll_run: payrollRun },
    as: "user",
    verb: "POST",
  });
  revalidatePath("/payroll");
  revalidatePath(`/payroll/${encodeURIComponent(payrollRun)}`);
}

// ── update_period (close) ────────────────────────────────────────

export async function updatePeriod(payrollRun: string): Promise<void> {
  await ensurePayrollAdmin();
  await frappeCall({
    method: "tenant_manager.payroll_engine.api.belina_run.update_period",
    args: { payroll_run: payrollRun },
    as: "user",
    verb: "POST",
  });
  revalidatePath("/payroll");
  revalidatePath(`/payroll/${encodeURIComponent(payrollRun)}`);
}

// ── reopen_period ────────────────────────────────────────────────

export async function reopenPeriod(payrollRun: string): Promise<void> {
  await ensurePayrollAdmin();
  await frappeCall({
    method: "tenant_manager.payroll_engine.api.belina_run.reopen_period",
    args: { payroll_run: payrollRun },
    as: "user",
    verb: "POST",
  });
  revalidatePath("/payroll");
  revalidatePath(`/payroll/${encodeURIComponent(payrollRun)}`);
}

// ── off-cycle ────────────────────────────────────────────────────

export async function createOffCycleRun(formData: FormData): Promise<void> {
  await ensurePayrollAdmin();
  const raw = await frappeCall<
    { payroll_run: string } | { message?: { payroll_run: string } }
  >({
    method: "tenant_manager.payroll_engine.api.belina_run.create_off_cycle_run",
    args: {
      title: String(formData.get("title") || "Special Run"),
      run_type: String(formData.get("runType") || "BONUS"),
      basis: String(formData.get("basis") || "ONE_MONTH"),
      flat_usd: Number(formData.get("flatUsd") || 0),
      pay_date: String(formData.get("payDate") || ""),
    },
    as: "user",
    verb: "POST",
  });
  const result = unwrap(raw);
  revalidatePath("/payroll");
  redirect(`/payroll/${encodeURIComponent(result.payroll_run)}?offcycle=1`);
}

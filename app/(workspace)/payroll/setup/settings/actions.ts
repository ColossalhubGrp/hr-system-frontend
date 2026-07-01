"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  listUsdBands,
  saveSettings as saveSettingsHelper,
} from "@/lib/payroll-engine/belina-settings";
import { getMyAccess } from "@/lib/frappe/roles";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const n = (fd: FormData, k: string) => Number(fd.get(k) || 0);

/**
 * Settings save — mirrors Belina's saveSettings: scalar fields on the
 * top-level form + per-band rate/deduct edits keyed by `band_<id>_rate`
 * and `band_<id>_deduct`.
 *
 * Percent fields (aidsLevyPct, nssaPct, zimdefPct) are submitted as
 * whole numbers (e.g. 3 for 3%) and stored as decimals (0.03).
 */
export async function saveSettings(form: FormData): Promise<void> {
  const access = await getMyAccess();
  if (!access.isPayrollAdmin && !access.isHrAdmin) {
    throw new Error("You need Payroll Admin or HR Admin to edit Settings.");
  }

  // Build the bandEdits map from form keys
  const bandEdits: Record<string, { rate: number; deduct: number }> = {};
  const bands = await listUsdBands();
  for (const b of bands) {
    if (!b.name) continue;
    const rate = form.get(`band_${b.name}_rate`);
    const deduct = form.get(`band_${b.name}_deduct`);
    if (rate != null && deduct != null) {
      bandEdits[b.name] = {
        rate: Number(rate) / 100,
        deduct: Number(deduct),
      };
    }
  }

  const freq = (s(form, "pay_frequency") ||
    "Monthly") as
    | "Weekly" | "Bi-weekly" | "Semi-monthly" | "Monthly" | "Daily";

  await saveSettingsHelper({
    legal_name: s(form, "companyName"),
    bp_number: s(form, "bpNumber"),
    nssa_employer_no: s(form, "nssaEmployerNo"),
    zimdef_no: s(form, "zimdefNo"),
    company_address: s(form, "address"),
    interbank_rate: n(form, "exchangeRate"),
    aids_levy_pct: n(form, "aidsLevyPct") / 100,
    nssa_pct: n(form, "nssaPct") / 100,
    nssa_ceiling_usd: n(form, "nssaCeilingUsd"),
    zimdef_pct: n(form, "zimdefPct") / 100,
    bonus_tax_free_usd: n(form, "bonusTaxFreeUsd"),
    // Platform extras (third card)
    pay_frequency: freq,
    pay_day: s(form, "pay_day"),
    approval_lead_days: n(form, "approval_lead_days"),
    auto_run: form.get("auto_run") ? 1 : 0,
    email_payslips_on_approve: form.get("email_payslips_on_approve") ? 1 : 0,
    bank_name: s(form, "bank_name"),
    bank_last4: s(form, "bank_last4"),
    default_work_location: s(form, "default_work_location"),
    bandEdits,
  });

  revalidatePath("/payroll/setup/settings");
  redirect("/payroll/setup/settings?saved=1");
}

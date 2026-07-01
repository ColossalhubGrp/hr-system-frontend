import "server-only";
import { frappeCall } from "@/lib/frappe/client";
import { myCompany } from "@/lib/references/server";

/**
 * Settings page data layer (Belina parity).
 *
 * Surface:
 *   - getSettings()                       per-company Company Payroll Settings
 *   - listUsdBands()                      editable USD PAYE bands
 *   - deriveZigBands(rate, usdBands)      pure — USD × rate → ZiG bands
 *   - saveSettings(payload)               upserts CPS + per-band updates
 */

export type BelinaSettings = {
  company: string;
  legal_name: string | null;
  bp_number: string | null;
  nssa_employer_no: string | null;
  zimdef_no: string | null;
  company_address: string | null;
  interbank_rate: number;
  aids_levy_pct: number;       // decimal (0.03 = 3%)
  nssa_pct: number;            // decimal
  nssa_ceiling_usd: number;
  zimdef_pct: number;          // decimal
  bonus_tax_free_usd: number;
  // ── Platform extras (not part of Belina, but kept after the port
  //    so admins can still configure pay cadence + automation here)
  pay_frequency:
    | "Weekly"
    | "Bi-weekly"
    | "Semi-monthly"
    | "Monthly"
    | "Daily";
  pay_day: string | null;
  approval_lead_days: number;
  auto_run: 0 | 1 | boolean;
  email_payslips_on_approve: 0 | 1 | boolean;
  bank_name: string | null;
  bank_last4: string | null;
  default_work_location: string | null;
};

export type TaxBand = {
  name?: string;       // doc id (omit for derived bands)
  currency: "USD" | "ZWG";
  seq: number;
  lower: number;
  upper: number | null;   // null/0 = top band (no upper bound)
  rate: number;           // decimal — 0.20 means 20%
  deduct: number;
};

// ── reads ─────────────────────────────────────────────────────────

export async function getSettings(): Promise<BelinaSettings | null> {
  const company = await myCompany();
  if (!company) return null;

  try {
    const res = await frappeCall<
      Record<string, unknown> | { message?: Record<string, unknown> }
    >({
      method: "frappe.client.get",
      args: { doctype: "Company Payroll Settings", name: company },
      as: "user",
    });
    const r = ((res as { message?: Record<string, unknown> }).message ?? res) as Record<string, unknown>;
    if (!r || !r.name) {
      // First load — return defaults so the form renders something.
      return {
        company,
        legal_name: null,
        bp_number: null,
        nssa_employer_no: null,
        zimdef_no: null,
        company_address: null,
        interbank_rate: 28,
        aids_levy_pct: 0.03,
        nssa_pct: 0.045,
        nssa_ceiling_usd: 700,
        zimdef_pct: 0.01,
        bonus_tax_free_usd: 700,
        pay_frequency: "Monthly",
        pay_day: null,
        approval_lead_days: 4,
        auto_run: 0,
        email_payslips_on_approve: 0,
        bank_name: null,
        bank_last4: null,
        default_work_location: null,
      };
    }
    return {
      company,
      legal_name: (r.legal_name as string) || null,
      bp_number: (r.bp_number as string) || null,
      nssa_employer_no: (r.nssa_employer_no as string) || null,
      zimdef_no: (r.zimdef_no as string) || null,
      company_address: (r.company_address as string) || null,
      interbank_rate: Number(r.interbank_rate ?? 28),
      aids_levy_pct: Number(r.aids_levy_pct ?? 0.03),
      nssa_pct: Number(r.nssa_pct ?? 0.045),
      nssa_ceiling_usd: Number(r.nssa_ceiling_usd ?? 700),
      zimdef_pct: Number(r.zimdef_pct ?? 0.01),
      bonus_tax_free_usd: Number(r.bonus_tax_free_usd ?? 700),
      pay_frequency:
        ((r.pay_frequency as BelinaSettings["pay_frequency"]) || "Monthly"),
      pay_day: (r.pay_day as string) || null,
      approval_lead_days: Number(r.approval_lead_days ?? 4),
      auto_run: Boolean(r.auto_run) ? 1 : 0,
      email_payslips_on_approve: Boolean(r.email_payslips_on_approve) ? 1 : 0,
      bank_name: (r.bank_name as string) || null,
      bank_last4: (r.bank_last4 as string) || null,
      default_work_location: (r.default_work_location as string) || null,
    };
  } catch (err) {
    console.error("[settings] getSettings failed:", err);
    return null;
  }
}

export async function listUsdBands(): Promise<TaxBand[]> {
  const company = await myCompany();
  if (!company) return [];
  try {
    const res = await frappeCall<
      Array<Record<string, unknown>> | { message?: Array<Record<string, unknown>> }
    >({
      method: "frappe.client.get_list",
      args: {
        doctype: "Payroll Tax Band",
        filters: { company, currency: "USD" },
        fields: ["name", "currency", "seq", "lower", "upper", "rate", "deduct"],
        order_by: "seq asc",
        limit_page_length: 50,
      },
      as: "user",
    });
    const rows = Array.isArray(res)
      ? res
      : ((res?.message ?? []) as Array<Record<string, unknown>>);
    return rows.map((r) => ({
      name: r.name as string,
      currency: "USD",
      seq: Number(r.seq ?? 0),
      lower: Number(r.lower ?? 0),
      upper: r.upper ? Number(r.upper) : null,
      rate: Number(r.rate ?? 0),
      deduct: Number(r.deduct ?? 0),
    }));
  } catch (err) {
    console.error("[settings] listUsdBands failed:", err);
    return [];
  }
}

/**
 * Auto-derive ZiG bands from USD × exchange rate. Mirrors Belina's
 * deriveZigBands in src/lib/paye.ts.
 */
export function deriveZigBands(rate: number, usd: TaxBand[]): TaxBand[] {
  return usd.map((b) => ({
    currency: "ZWG",
    seq: b.seq,
    lower: b.lower * rate,
    upper: b.upper === null ? null : b.upper * rate,
    rate: b.rate,
    deduct: b.deduct * rate,
  }));
}

// ── writes ────────────────────────────────────────────────────────

export async function saveSettings(payload: {
  legal_name: string;
  bp_number: string;
  nssa_employer_no: string;
  zimdef_no: string;
  company_address: string;
  interbank_rate: number;
  aids_levy_pct: number;       // decimal
  nssa_pct: number;            // decimal
  nssa_ceiling_usd: number;
  zimdef_pct: number;          // decimal
  bonus_tax_free_usd: number;
  // Platform extras (third card on the Settings page)
  pay_frequency: BelinaSettings["pay_frequency"];
  pay_day: string;
  approval_lead_days: number;
  auto_run: 0 | 1;
  email_payslips_on_approve: 0 | 1;
  bank_name: string;
  bank_last4: string;
  default_work_location: string;
  /** Optional: per-band rate+deduct edits keyed by Tax Band doc name. */
  bandEdits?: Record<string, { rate: number; deduct: number }>;
}): Promise<void> {
  const company = await myCompany();
  if (!company) throw new Error("No company in session.");

  // Upsert Company Payroll Settings
  const existing = await frappeCall<unknown>({
    method: "frappe.client.get_value",
    args: {
      doctype: "Company Payroll Settings",
      filters: { name: company },
      fieldname: ["name"],
    },
    as: "user",
  }).catch(() => null);
  const exists =
    existing && typeof existing === "object" &&
    "name" in (("message" in existing ? (existing as { message?: object }).message ?? existing : existing) as Record<string, unknown>);

  const fields: Record<string, unknown> = {
    legal_name: payload.legal_name,
    bp_number: payload.bp_number,
    nssa_employer_no: payload.nssa_employer_no,
    zimdef_no: payload.zimdef_no,
    company_address: payload.company_address,
    interbank_rate: payload.interbank_rate,
    aids_levy_pct: payload.aids_levy_pct,
    nssa_pct: payload.nssa_pct,
    nssa_ceiling_usd: payload.nssa_ceiling_usd,
    zimdef_pct: payload.zimdef_pct,
    bonus_tax_free_usd: payload.bonus_tax_free_usd,
    // Platform extras
    pay_frequency: payload.pay_frequency,
    pay_day: payload.pay_day,
    approval_lead_days: payload.approval_lead_days,
    auto_run: payload.auto_run,
    email_payslips_on_approve: payload.email_payslips_on_approve,
    bank_name: payload.bank_name,
    bank_last4: payload.bank_last4,
    default_work_location: payload.default_work_location,
  };

  if (exists) {
    await frappeCall({
      method: "frappe.client.set_value",
      args: { doctype: "Company Payroll Settings", name: company, fieldname: fields },
      as: "user",
      verb: "POST",
    });
  } else {
    await frappeCall({
      method: "frappe.client.insert",
      args: { doc: { doctype: "Company Payroll Settings", company, ...fields } },
      as: "user",
      verb: "POST",
    });
  }

  // Per-band edits
  if (payload.bandEdits) {
    for (const [bandName, { rate, deduct }] of Object.entries(payload.bandEdits)) {
      await frappeCall({
        method: "frappe.client.set_value",
        args: {
          doctype: "Payroll Tax Band",
          name: bandName,
          fieldname: { rate, deduct },
        },
        as: "user",
        verb: "POST",
      });
    }
  }
}

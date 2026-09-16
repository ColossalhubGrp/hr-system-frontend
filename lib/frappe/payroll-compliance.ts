import "server-only";
import { frappeCall } from "./client";
import { myCompany } from "@/lib/references/server";

/**
 * Aggregated snapshot of every ZIMRA knob the payroll engine relies
 * on. Drives the /payroll/setup/compliance panel — HR sees each
 * value's current setting + when it was last confirmed, so the
 * page warns when a knob hasn't been reviewed in > 12 months.
 */
export type ComplianceKnob = {
  key: string;
  label: string;
  value: string;
  raw: number | string | null;
  currency?: "USD" | "PCT" | "MULT" | "DAYS";
  hint: string;
  /** ISO date the operator last confirmed this against ZIMRA's
   *  published schedule. null = never. */
  lastUpdated: string | null;
  /** Whether the knob is considered stale (> 12 months since
   *  confirmation, or never confirmed). */
  stale: boolean;
  /** Optional: when the knob is a Date field itself (i.e. IS the
   *  last-updated stamp), the operator can "Confirm as current"
   *  by hitting the stamp endpoint against this field. Points to
   *  the Company Payroll Settings fieldname. */
  confirmField?: string;
};

export type ComplianceSnapshot = {
  company: string | null;
  bandCounts: { usd: number; zig: number };
  knobs: ComplianceKnob[];
};

function isStale(iso: string | null): boolean {
  if (!iso) return true;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return true;
  const ageMs = Date.now() - t;
  return ageMs > 365 * 24 * 60 * 60 * 1000;
}

function fmtUsd(n: number): string {
  return `US$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtPct(n: number): string {
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
}
function fmtMult(n: number): string {
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}×`;
}

export async function loadComplianceSnapshot(): Promise<ComplianceSnapshot> {
  const company = await myCompany();
  if (!company) {
    return { company: null, bandCounts: { usd: 0, zig: 0 }, knobs: [] };
  }

  const cps = await frappeCall<Record<string, unknown>>({
    method: "frappe.client.get",
    args: { doctype: "Company Payroll Settings", name: company },
    as: "user",
  }).catch(() => ({}));

  const g = (k: string) => (cps as Record<string, unknown>)[k];
  const num = (k: string): number => Number(g(k) ?? 0);
  const iso = (k: string): string | null => {
    const v = g(k);
    return typeof v === "string" && v ? v.slice(0, 10) : null;
  };

  const [usdBands, zigBands] = await Promise.all([
    frappeCall<Array<{ name: string }>>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Payroll Tax Band",
        filters: JSON.stringify([
          ["company", "=", company],
          ["currency", "=", "USD"],
        ]),
        fields: ["name"],
        limit_page_length: 100,
      },
      as: "user",
    }).catch(() => []),
    frappeCall<Array<{ name: string }>>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Payroll Tax Band",
        filters: JSON.stringify([
          ["company", "=", company],
          ["currency", "=", "ZWG"],
        ]),
        fields: ["name"],
        limit_page_length: 100,
      },
      as: "user",
    }).catch(() => []),
  ]);

  const payeStamp = iso("paye_bands_last_updated");
  const nssaStamp = iso("nssa_ceiling_last_updated");

  const knobs: ComplianceKnob[] = [
    {
      key: "paye_bands",
      label: "PAYE bands",
      value: `${(usdBands ?? []).length} USD bands · ${(zigBands ?? []).length} ZiG bands`,
      raw: (usdBands ?? []).length,
      hint: "Progressive-tax bands per ZIMRA's annual schedule. Confirm after each January budget.",
      lastUpdated: payeStamp,
      stale: isStale(payeStamp),
      confirmField: "paye_bands_last_updated",
    },
    {
      key: "nssa_ceiling_usd",
      label: "NSSA insurable ceiling",
      value: fmtUsd(num("nssa_ceiling_usd")),
      raw: num("nssa_ceiling_usd"),
      hint: "Monthly USD cap on NSSA-insurable earnings. Bumped periodically by NSSA.",
      lastUpdated: nssaStamp,
      stale: isStale(nssaStamp),
      confirmField: "nssa_ceiling_last_updated",
    },
    {
      key: "nssa_pct",
      label: "NSSA (POBS) contribution",
      value: fmtPct(num("nssa_pct") * 100),
      raw: num("nssa_pct"),
      currency: "PCT",
      hint: "Employee + employer POBS rate. Zim norm 4.5% each side.",
      lastUpdated: nssaStamp,
      stale: isStale(nssaStamp),
    },
    {
      key: "nssa_apf_pct",
      label: "NSSA (APF) contribution",
      value: fmtPct(num("nssa_apf_pct")),
      raw: num("nssa_apf_pct"),
      currency: "PCT",
      hint: "Accident Prevention Fund employer side, split from POBS for the return. 0 = not applicable.",
      lastUpdated: nssaStamp,
      stale: isStale(nssaStamp),
    },
    {
      key: "aids_levy_pct",
      label: "AIDS Levy",
      value: fmtPct(num("aids_levy_pct") * 100),
      raw: num("aids_levy_pct"),
      currency: "PCT",
      hint: "Applied to PAYE after credits. Stable at 3% for years.",
      lastUpdated: null,
      stale: false,
    },
    {
      key: "zimdef_pct",
      label: "ZIMDEF",
      value: fmtPct(num("zimdef_pct") * 100),
      raw: num("zimdef_pct"),
      currency: "PCT",
      hint: "1% employer-only standards-development levy.",
      lastUpdated: null,
      stale: false,
    },
    {
      key: "elderly_credit_monthly_usd",
      label: "Elderly (≥55) tax credit",
      value: fmtUsd(num("elderly_credit_monthly_usd")),
      raw: num("elderly_credit_monthly_usd"),
      currency: "USD",
      hint: "Monthly USD credit for employees aged 55+. FDS-only. Bumped occasionally by ZIMRA.",
      lastUpdated: payeStamp,
      stale: isStale(payeStamp),
    },
    {
      key: "disabled_credit_monthly_usd",
      label: "Disabled tax credit",
      value: fmtUsd(num("disabled_credit_monthly_usd")),
      raw: num("disabled_credit_monthly_usd"),
      currency: "USD",
      hint: "Monthly USD credit for employees flagged disabled. FDS-only.",
      lastUpdated: payeStamp,
      stale: isStale(payeStamp),
    },
    {
      key: "medical_credit_pct",
      label: "Medical-aid credit",
      value: fmtPct(num("medical_credit_pct") * 100),
      raw: num("medical_credit_pct"),
      currency: "PCT",
      hint: "% of the employee's medical-aid premium refunded as a credit. ZIMRA norm 50%.",
      lastUpdated: payeStamp,
      stale: isStale(payeStamp),
    },
    {
      key: "bonus_tax_free_usd",
      label: "Bonus tax-free portion",
      value: fmtUsd(num("bonus_tax_free_usd")),
      raw: num("bonus_tax_free_usd"),
      currency: "USD",
      hint: "Portion of an annual bonus that isn't PAYE-taxable. Was USD 700 (2024), USD 800 (2025).",
      lastUpdated: payeStamp,
      stale: isStale(payeStamp),
    },
    {
      key: "contractor_wht_pct",
      label: "Contractor WHT",
      value: fmtPct(num("contractor_wht_pct") || 10),
      raw: num("contractor_wht_pct"),
      currency: "PCT",
      hint: "Withheld on contractor 1099 payments when they can't produce ITF263. ZIMRA §80 default 10%.",
      lastUpdated: null,
      stale: false,
    },
    {
      key: "default_weekend_multiplier",
      label: "Default weekend OT ×",
      value: fmtMult(num("default_weekend_multiplier") || 2),
      raw: num("default_weekend_multiplier"),
      currency: "MULT",
      hint: "Rate for Saturday / Sunday hours. Zim default 2×; overridable per Wizard Entry.",
      lastUpdated: null,
      stale: false,
    },
    {
      key: "default_holiday_multiplier",
      label: "Default public-holiday OT ×",
      value: fmtMult(num("default_holiday_multiplier") || 2),
      raw: num("default_holiday_multiplier"),
      currency: "MULT",
      hint: "Rate for gazetted public-holiday hours (from each employee's Holiday List). Default 2×.",
      lastUpdated: null,
      stale: false,
    },
    {
      key: "exchange_rate",
      label: "USD → ZiG interbank rate",
      value: `1 : ${num("exchange_rate").toFixed(2)}`,
      raw: num("exchange_rate"),
      hint: "Used to derive ZiG PAYE bands from USD bands. Should track RBZ interbank ± tolerance.",
      lastUpdated: null,
      stale: false,
    },
  ];

  return {
    company,
    bandCounts: {
      usd: (usdBands ?? []).length,
      zig: (zigBands ?? []).length,
    },
    knobs,
  };
}

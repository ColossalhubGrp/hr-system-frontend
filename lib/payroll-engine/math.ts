/**
 * Payroll calculation engine — port of Rippling's `lib/payroll.ts`,
 * parameterised by per-company `Payroll Tax Rule` rows (no hardcoded
 * US constants).
 *
 * Pure functions, no server imports — safe to call on client and server
 * so the wizard can preview pay live as the recruiter edits inputs.
 *
 * Inputs: PayInput + the tax-rule set for the company.
 * Output: PayCalculation (gross / withholdings / employer taxes / net).
 */

import type {
  PayInput,
  PayCalculation,
  TaxRule,
  TaxBracket,
} from "./types";

export const DEFAULT_PAY_PERIODS_PER_YEAR = 24; // semi-monthly fallback

// ── Internal helpers ─────────────────────────────────────────────────

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function asPercent(value: number): number {
  // Rates are stored as percent (1.45 = 1.45%). Convert to multiplier.
  return value / 100;
}

function findRule(rules: TaxRule[], code: string): TaxRule | undefined {
  return rules.find((r) => r.code === code && (r.is_active === 1 || r.is_active === true));
}

function findStateRule(rules: TaxRule[], state: string): TaxRule | undefined {
  // Convention: state income rules carry code `STATE_INCOME_<region>`.
  if (!state) return undefined;
  return rules.find(
    (r) =>
      r.applies_to === "employee" &&
      r.jurisdiction === "State" &&
      r.region === state &&
      (r.is_active === 1 || r.is_active === true),
  );
}

function bracketsTax(brackets: TaxBracket[], annualTaxable: number): number {
  let tax = 0;
  let lower = 0;
  for (const b of brackets) {
    if (annualTaxable <= lower) break;
    const upper = b.up_to > 0 ? b.up_to : Number.POSITIVE_INFINITY;
    const taxableInBracket = Math.min(annualTaxable, upper) - lower;
    if (taxableInBracket > 0) tax += taxableInBracket * asPercent(b.rate);
    lower = b.up_to > 0 ? b.up_to : annualTaxable;
  }
  return tax;
}

function capPerPeriod(annualCap: number, periodsPerYear: number): number {
  return periodsPerYear > 0 ? annualCap / periodsPerYear : annualCap;
}

// ── Missing-info detection ──────────────────────────────────────────

export const CRITICAL_FIELDS = [
  { key: "bankAccount", label: "Missing bank account" },
  { key: "homeLocation", label: "Missing home location" },
  { key: "taxId", label: "Missing tax ID" },
  { key: "stateWithholding", label: "Missing state tax withholding information" },
  { key: "federalWithholding", label: "Missing federal tax withholding information" },
] as const;

export function missingCriticalInfo(emp: Record<string, unknown>): string[] {
  // Contractors are 1099 — they don't need tax-withholding info, just a
  // way to be paid.
  if (emp.payType === "CONTRACTOR") {
    return emp.bankAccount ? [] : ["Missing bank account"];
  }
  return CRITICAL_FIELDS.filter((f) => !emp[f.key]).map((f) => f.label);
}

// ── Main calculator ─────────────────────────────────────────────────

export function calculatePay(
  emp: PayInput,
  rules: TaxRule[],
): PayCalculation {
  const zero = {
    employerSocialSecurity: 0,
    employerMedicare: 0,
    employerFuta: 0,
    employerSuta: 0,
    employerOther: 0,
  };

  // ── Contractors: 1099, no tax withholding on either side.
  if (emp.payType === "CONTRACTOR") {
    const basePay = emp.flatPay;
    const grossPay = basePay + emp.additionalPay;
    return {
      basePay: round(basePay),
      overtimePay: 0,
      doubleOtPay: 0,
      additionalPay: round(emp.additionalPay),
      reimbursements: round(emp.reimbursements),
      hoursWorked: 0,
      overtimeHours: 0,
      grossPay: round(grossPay),
      federalTax: 0,
      stateTax: 0,
      socialSecurity: 0,
      medicare: 0,
      retirement401k: 0,
      ...zero,
      netPay: round(grossPay + emp.reimbursements),
    };
  }

  // Pick the annualisation divisor — use the federal-income rule's
  // pay_periods_per_year if available, else the default.
  const fedRule = findRule(rules, "FED_INCOME_US") ?? rules.find((r) => r.rate_kind === "BRACKETS");
  const periodsPerYear =
    fedRule?.pay_periods_per_year ?? DEFAULT_PAY_PERIODS_PER_YEAR;

  const isHourly = emp.payType === "HOURLY";
  const basePay = isHourly
    ? emp.hourlyRate * emp.hoursWorked
    : emp.annualSalary / periodsPerYear;
  const overtimePay = isHourly ? emp.hourlyRate * 1.5 * emp.overtimeHours : 0;

  const cashGross = basePay + overtimePay + emp.additionalPay;
  const retirement401k = cashGross * emp.retirementPct;
  const taxablePerPeriod = cashGross - retirement401k;
  const annualTaxable = taxablePerPeriod * periodsPerYear;

  // ── Federal income (bracketed)
  let federalTax = 0;
  if (fedRule?.brackets && fedRule.brackets.length > 0) {
    federalTax = bracketsTax(fedRule.brackets, annualTaxable) / periodsPerYear;
  }

  // ── State income (single flat rate per region)
  const stateRule = findStateRule(rules, emp.state);
  const stateTax = stateRule
    ? taxablePerPeriod * asPercent(stateRule.rate_value)
    : 0;

  // ── Social Security (employee) — flat with annual wage base cap
  const ssEmp = findRule(rules, "SS_EMPLOYEE");
  let socialSecurity = 0;
  if (ssEmp) {
    const cap = ssEmp.wage_base > 0
      ? capPerPeriod(ssEmp.wage_base, periodsPerYear)
      : Number.POSITIVE_INFINITY;
    socialSecurity = Math.min(cashGross, cap) * asPercent(ssEmp.rate_value);
  }

  // ── Medicare (employee) — flat, no cap
  const medRule = findRule(rules, "MEDICARE_EMPLOYEE");
  const medicare = medRule ? cashGross * asPercent(medRule.rate_value) : 0;

  // ── Employer-side
  const ssEr = findRule(rules, "SS_EMPLOYER");
  const employerSocialSecurity = ssEr
    ? Math.min(
        cashGross,
        ssEr.wage_base > 0 ? capPerPeriod(ssEr.wage_base, periodsPerYear) : cashGross,
      ) * asPercent(ssEr.rate_value)
    : 0;

  const medEr = findRule(rules, "MEDICARE_EMPLOYER");
  const employerMedicare = medEr ? cashGross * asPercent(medEr.rate_value) : 0;

  const futa = findRule(rules, "FUTA");
  const employerFuta = futa
    ? Math.min(
        cashGross,
        futa.wage_base > 0 ? capPerPeriod(futa.wage_base, periodsPerYear) : cashGross,
      ) * asPercent(futa.rate_value)
    : 0;

  const suta = findRule(rules, "SUTA");
  const employerSuta = suta
    ? Math.min(
        cashGross,
        suta.wage_base > 0 ? capPerPeriod(suta.wage_base, periodsPerYear) : cashGross,
      ) * asPercent(suta.rate_value)
    : 0;

  // ── Any other "employer" rule that wasn't matched above (e.g. ZW AIDS
  // levy on the employer side). Sum into `employerOther`.
  const knownEmployerCodes = new Set([
    "SS_EMPLOYER",
    "MEDICARE_EMPLOYER",
    "FUTA",
    "SUTA",
  ]);
  let employerOther = 0;
  for (const r of rules) {
    if (r.applies_to !== "employer") continue;
    if (knownEmployerCodes.has(r.code ?? "")) continue;
    if (r.rate_kind === "EMPLOYER_FLAT") {
      employerOther += cashGross * asPercent(r.rate_value);
    } else if (r.rate_kind === "EMPLOYER_CAP") {
      const cap = r.wage_base > 0 ? capPerPeriod(r.wage_base, periodsPerYear) : cashGross;
      employerOther += Math.min(cashGross, cap) * asPercent(r.rate_value);
    }
  }

  const netPay =
    cashGross -
    federalTax -
    stateTax -
    socialSecurity -
    medicare -
    retirement401k +
    emp.reimbursements;

  return {
    basePay: round(basePay),
    overtimePay: round(overtimePay),
    doubleOtPay: 0,
    additionalPay: round(emp.additionalPay),
    reimbursements: round(emp.reimbursements),
    hoursWorked: isHourly ? emp.hoursWorked : 0,
    overtimeHours: isHourly ? emp.overtimeHours : 0,
    grossPay: round(cashGross),
    federalTax: round(federalTax),
    stateTax: round(stateTax),
    socialSecurity: round(socialSecurity),
    medicare: round(medicare),
    retirement401k: round(retirement401k),
    employerSocialSecurity: round(employerSocialSecurity),
    employerMedicare: round(employerMedicare),
    employerFuta: round(employerFuta),
    employerSuta: round(employerSuta),
    employerOther: round(employerOther),
    netPay: round(netPay),
  };
}

/** Returns the list of available state codes (those with a STATE_INCOME_* rule). */
export function availableStates(rules: TaxRule[]): string[] {
  const out = new Set<string>();
  for (const r of rules) {
    if (r.jurisdiction === "State" && r.region) out.add(r.region);
  }
  return Array.from(out).sort();
}

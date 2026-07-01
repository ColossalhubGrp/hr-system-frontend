/**
 * Shared types for the Rippling-flow payroll engine. Client-safe; never
 * imports server-only code so client wizards can preview pay live.
 */

// ── Tax rule rows (mirror of Frappe's "Payroll Tax Rule") ──────────────

export type RateKind = "FLAT" | "BRACKETS" | "EMPLOYER_FLAT" | "EMPLOYER_CAP";
export type AppliesTo = "employee" | "employer" | "both";

export type TaxBracket = {
  /** Annual taxable income up to this amount. 0 = no upper cap (last bracket). */
  up_to: number;
  /** Percent (e.g. 10 = 10%). */
  rate: number;
};

export type TaxRule = {
  name: string;
  code: string | null;
  rate_kind: RateKind;
  rate_value: number; // percent (1.45 = 1.45%)
  wage_base: number; // 0 = no annual cap
  brackets: TaxBracket[] | null;
  applies_to: AppliesTo;
  jurisdiction: string | null;
  region: string | null;
  pay_periods_per_year: number;
  is_active: 0 | 1 | boolean;
  company: string | null;
};

// ── Pay calculation IO ────────────────────────────────────────────────

export type PayType = "SALARY" | "HOURLY" | "CONTRACTOR";

export interface PayInput {
  payType: PayType;
  annualSalary: number;
  hourlyRate: number;
  /** For CONTRACTOR: the flat amount this period. */
  flatPay: number;
  /** State / region code used to pick the matching `STATE_INCOME_*` row. */
  state: string;
  /** Percent of gross going to 401(k) / retirement. 0–1 (0.05 = 5%). */
  retirementPct: number;

  hoursWorked: number;
  overtimeHours: number;
  additionalPay: number;
  reimbursements: number;
}

export interface PayCalculation {
  basePay: number;
  overtimePay: number;
  doubleOtPay: number;
  additionalPay: number;
  reimbursements: number;
  hoursWorked: number;
  overtimeHours: number;
  grossPay: number;
  federalTax: number;
  stateTax: number;
  socialSecurity: number;
  medicare: number;
  retirement401k: number;
  employerSocialSecurity: number;
  employerMedicare: number;
  employerFuta: number;
  employerSuta: number;
  /** Region-specific employer levies that don't fit the named slots. */
  employerOther: number;
  netPay: number;
}

// ── Pay-run model (Frappe Payroll Entry + Salary Slip view) ───────────

export type PayRunStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "PAID"
  | "ARCHIVED"
  | "FAILED";

export type PayRunRow = {
  id: string;
  company: string;
  label: string;
  scheduleType: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  approveBy: string;
  status: PayRunStatus;
  isOffCycle: boolean;
  numberOfEmployees: number;
  totalGrossPay: number | null;
  totalNetPay: number | null;
};

export type PayStubRow = {
  id: string;
  payRunId: string | null;
  employee: string;
  employeeName: string;
  included: boolean;
  // Snapshot of calculated values (mirror of PayCalculation but flatter)
  grossPay: number;
  netPay: number;
  totalDeduction: number;
  status: string;
  missingInfo: string[];
};

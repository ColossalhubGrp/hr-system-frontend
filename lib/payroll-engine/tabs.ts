/**
 * Tab definitions for the Payroll workspace.
 *
 * Mirrors the Rippling app's tab bar exactly (Overview / People / Settings
 * / Reimbursements / Deductions / Garnishments / Accounting / Reports /
 * Docs / Expected Tax Notices / Tax Exemptions).
 *
 * The PayrollTabs component (rendered in the /payroll layout) uses this
 * to draw the underline-style tab strip and to decide whether to render
 * at all — it hides itself on the per-run detail, run wizard, off-cycle
 * wizard, and the new-pay-run form.
 */

/**
 * Reimbursements, Deductions, Garnishments are NOT separate tabs by
 * design — they're handled via the Transactions flow against codes
 * defined in Setup → Earnings & deductions. Dedicated tabs would
 * duplicate that path.
 *
 * Setup also doesn't appear here — it sits on the sidebar because
 * its 6 sub-tabs would crowd this strip.
 */
export const PAYROLL_TABS: { label: string; href: string }[] = [
  { label: "Overview", href: "/payroll" },
  { label: "People", href: "/payroll/people" },
  { label: "Transactions", href: "/payroll/transactions" },
  { label: "Accounting", href: "/payroll/accounting" },
  { label: "Reports", href: "/payroll/reports" },
  { label: "Docs", href: "/payroll/docs" },
  { label: "Expected Tax Notices", href: "/payroll/tax-notices" },
  { label: "Tax Exemptions", href: "/payroll/tax-exemptions" },
  { label: "Audit", href: "/payroll/audit" },
];

export const PAYROLL_TAB_HREFS: string[] = PAYROLL_TABS.map((t) => t.href);

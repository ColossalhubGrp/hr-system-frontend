import {
  LayoutGrid,
  UserRound,
  Users,
  Banknote,
  BarChart3,
  Package,
  ShoppingBag,
  Factory,
  Wallet,
  Landmark,
  ShieldCheck,
  Settings,
  Briefcase,
  Database,
  type LucideIcon,
} from "lucide-react";

import type { RoleGroup } from "@/lib/frappe/roles";

export type NavChild = {
  label: string;
  href: string;
  external?: boolean;
  /** Role bundle required to see this child item. Omit for "any signed-in
   *  user can see it" (e.g. own profile, own dashboard). */
  requires?: RoleGroup;
};
export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  external?: boolean;
  children?: NavChild[];
  /** Same semantics as NavChild.requires — applies to the top-level item. */
  requires?: RoleGroup;
};

/**
 * Top-level workspace nav. Employee, Payroll and Loans are their own products —
 * they sit alongside HR so a customer can subscribe to one without the other.
 * The `requires` field maps each entry to one of the SRS-named role bundles in
 * lib/frappe/roles.ts; the sidebar filters this list against the signed-in
 * user's roles before rendering.
 */
export const NAV: NavItem[] = [
  // HR-flavored landing for managers/admins; pure employees get
  // /me as their default landing (see the workspace layout).
  { label: "Home", href: "/dashboard", icon: LayoutGrid, requires: "HR_ANY" },

  // Every signed-in employee gets a self-service hub at /me.
  { label: "My Workspace", href: "/me", icon: UserRound },

  {
    label: "Employee",
    href: "/employee",
    icon: Users,
    requires: "HR_ANY",
    children: [
      { label: "Master Data", href: "/employee", requires: "HR_ANY" },
      { label: "Lifecycle", href: "/employee/lifecycle", requires: "HR_ANY" },
    ],
  },

  {
    label: "My Team",
    href: "/team",
    icon: Users,
    requires: "LINE_MANAGER",
    children: [
      { label: "Directory", href: "/team", requires: "LINE_MANAGER" },
      { label: "Pending leave", href: "/team/leave", requires: "LINE_MANAGER" },
      { label: "Goals", href: "/team/goals", requires: "LINE_MANAGER" },
    ],
  },

  {
    label: "Recruitment",
    // Land on the HR-side jobs panel — the most-used recruitment surface —
    // rather than the dashboard, which loads heavier widgets.
    href: "/recruitment/hr/jobs",
    icon: Briefcase,
    requires: "RECRUITER",
    children: [
      // HR-side surfaces — copied verbatim from the recruitment app.
      // The recruitment app draws a distinction between the public Jobs board
      // (/jobs) and the HR-side jobs control panel (/hr/jobs); both are
      // surfaced here so HR users can reach either.
      { label: "HR Dashboard", href: "/recruitment/hr/dashboard", requires: "RECRUITER" },
      { label: "HR Jobs", href: "/recruitment/hr/jobs", requires: "RECRUITER" },
      { label: "Jobs (public)", href: "/recruitment/jobs", requires: "RECRUITER" },
      { label: "Candidates", href: "/recruitment/candidates", requires: "RECRUITER" },
      { label: "Upload CVs", href: "/recruitment/candidates/upload", requires: "RECRUITER" },
      { label: "Shortlist Reports", href: "/recruitment/reports", requires: "RECRUITER" },
      { label: "Interview Reviews", href: "/recruitment/interviewsreview", requires: "RECRUITER" },
      { label: "Interview Reports", href: "/recruitment/interviewreports", requires: "RECRUITER" },
      { label: "Feedback", href: "/recruitment/feedback", requires: "RECRUITER" },
      { label: "Billing", href: "/recruitment/billing", requires: "RECRUITER" },
      { label: "Billing analytics", href: "/recruitment/billing/analytics", requires: "RECRUITER" },
      { label: "HR Messages", href: "/recruitment/hr/messages", requires: "RECRUITER" },
    ],
  },

  {
    label: "HR",
    href: "/hr",
    icon: UserRound,
    requires: "HR_ANY",
    children: [
      { label: "Shift Management", href: "/hr/shift-management", requires: "SHIFT_ADMIN" },
      { label: "Leaves", href: "/hr/leaves", requires: "HR_ANY" },
      { label: "Attendance", href: "/hr/attendance", requires: "HR_ANY" },
      { label: "Expense Claims", href: "/hr/expense-claims", requires: "HR_ANY" },
      { label: "Training", href: "/hr/training", requires: "HR_ANY" },
      { label: "Performance", href: "/hr/performance", requires: "HR_ANY" },
      { label: "Calibration (9-box)", href: "/hr/performance/calibration", requires: "HR_ANY" },
    ],
  },

  // Analytics is its own top-level entry so Executive Viewers (who don't have
  // HR_ANY) can reach it without tripping the /hr layout guard.
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    requires: "EXECUTIVE_VIEWER",
  },

  {
    label: "Payroll",
    href: "/payroll",
    icon: Wallet,
    // PAYROLL_ANY = admin ∪ reviewer. Sub-items tighten further: only
    // PAYROLL_ADMIN sees slip lists / structures / entry runs; only
    // PAYROLL_REVIEWER sees the review queue. Members of both bundles
    // (HR Director, System Manager) see everything.
    requires: "PAYROLL_ANY",
    children: [
      { label: "Salary Slips", href: "/payroll", requires: "PAYROLL_ADMIN" },
      { label: "Salary Structures", href: "/payroll/structures", requires: "PAYROLL_ADMIN" },
      { label: "Payroll Entries", href: "/payroll/entries", requires: "PAYROLL_ADMIN" },
      { label: "Review queue", href: "/payroll/review", requires: "PAYROLL_REVIEWER" },
    ],
  },

  {
    label: "Loans",
    href: "/loans",
    icon: Landmark,
    requires: "HR_ANY",
    children: [
      { label: "Loans", href: "/loans", requires: "HR_ANY" },
      { label: "Applications", href: "/loans/applications", requires: "HR_ANY" },
      { label: "Loan Types", href: "/loans/types", requires: "HR_ADMIN" },
    ],
  },

  // Auditor sees a read-only audit log.
  {
    label: "Audit",
    href: "/audit",
    icon: ShieldCheck,
    requires: "AUDITOR",
  },

  // Data Steward workspace — metric catalog + ref data + data-quality probes.
  {
    label: "Data",
    href: "/data-steward",
    icon: Database,
    requires: "DATA_STEWARD",
  },

  // Settings is shared between HR-policy admins and IT admins. The landing
  // page renders cards filtered by which sub-pages each persona can use.
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    requires: "SETTINGS_ANY",
    children: [
      // Company-wide settings (currency, address, performance default) —
      // HR admins set these.
      { label: "Company", href: "/settings/company", requires: "HR_ADMIN" },
      { label: "Performance default", href: "/settings/performance", requires: "HR_ADMIN" },
      { label: "Overtime rules", href: "/settings/overtime", requires: "HR_ADMIN" },
      // IT-admin-only — explicitly NOT shown to HR Director / HR Manager.
      { label: "Users & Roles", href: "/settings/users", requires: "IT_ADMIN" },
      { label: "Permissions", href: "/settings/permissions", requires: "IT_ADMIN" },
    ],
  },

  // ERPNext modules — admin-only by default.
  { label: "Accounting", href: "/accounting", icon: Banknote, requires: "HR_ADMIN" },
  { label: "Sales", href: "/sales", icon: BarChart3, requires: "HR_ADMIN" },
  { label: "Stock", href: "/stock", icon: Package, requires: "HR_ADMIN" },
  { label: "Buying", href: "/buying", icon: ShoppingBag, requires: "HR_ADMIN" },
  { label: "Manufacturing", href: "/manufacturing", icon: Factory, requires: "HR_ADMIN" },
];

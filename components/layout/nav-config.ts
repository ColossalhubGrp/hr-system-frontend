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
  type LucideIcon,
} from "lucide-react";

export type NavChild = { label: string; href: string; external?: boolean };
export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  external?: boolean;
  children?: NavChild[];
};

/**
 * Top-level workspace nav. Employee, Payroll and Loans are their own products —
 * they sit alongside HR so a customer can subscribe to one without the other.
 * Employee is the bedrock: every other module references an employee, so it
 * earns its own top-level slot.
 */
export const NAV: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: LayoutGrid },
  {
    label: "Employee",
    href: "/employee",
    icon: Users,
    children: [
      { label: "Directory", href: "/employee" },
      { label: "Lifecycle", href: "/employee/lifecycle" },
    ],
  },
  {
    label: "HR",
    href: "/hr",
    icon: UserRound,
    children: [
      { label: "Shift Management", href: "/hr/shift-management" },
      { label: "Leaves", href: "/hr/leaves" },
      { label: "Attendance", href: "/hr/attendance" },
      { label: "Expense Claims", href: "/hr/expense-claims" },
      {
        label: "Recruitment",
        href: "https://recruitment.colossalhub.com/",
        external: true,
      },
      { label: "Training", href: "/hr/training" },
      { label: "Performance", href: "/hr/performance" },
      { label: "Analytics & Reports", href: "/hr/analytics" },
    ],
  },
  {
    label: "Payroll",
    href: "/payroll",
    icon: Wallet,
    children: [
      { label: "Salary Slips", href: "/payroll" },
      { label: "Salary Structures", href: "/payroll/structures" },
      { label: "Payroll Entries", href: "/payroll/entries" },
    ],
  },
  {
    label: "Loans",
    href: "/loans",
    icon: Landmark,
    children: [
      { label: "Loans", href: "/loans" },
      { label: "Applications", href: "/loans/applications" },
      { label: "Loan Types", href: "/loans/types" },
    ],
  },
  { label: "Accounting", href: "/accounting", icon: Banknote },
  { label: "Sales", href: "/sales", icon: BarChart3 },
  { label: "Stock", href: "/stock", icon: Package },
  { label: "Buying", href: "/buying", icon: ShoppingBag },
  { label: "Manufacturing", href: "/manufacturing", icon: Factory },
];

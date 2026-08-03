import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Building,
  Building2,
  Clock,
  FileText,
  MapPin,
  TrendingUp,
  Users,
} from "lucide-react";

/**
 * Every "type of transfer" HR files day-to-day, each mapping to exactly
 * one field on the Employee record. On submit of the Transfer doc, Frappe
 * walks the `employee_transfer_details` child table and applies each row
 * to the Employee — so the frontend just needs to build one row per typed
 * transfer, filled with `{fieldname, current, new}`.
 *
 * Slugs are used as the URL segment (`/transfer/new/<slug>`) AND as the
 * server-action discriminator. Rename with care.
 */
export type TransferTypeSlug =
  | "department"
  | "branch"
  | "designation"
  | "grade"
  | "reporting"
  | "company"
  | "employment_type"
  | "shift";

/** Which pre-loaded option list on EmployeeFormOptions this type reads. The
 *  `employees` source pulls from the employeeDirectory (used for reports_to). */
export type TransferOptionSource =
  | "departments"
  | "branches"
  | "designations"
  | "payGrades"
  | "companies"
  | "employees"
  | "employmentTypes"
  | "shifts";

export type TransferType = {
  slug: TransferTypeSlug;
  label: string;
  /** Card-sized description shown on the type picker. */
  description: string;
  icon: LucideIcon;
  /** The Employee field this transfer type changes. */
  employeeField: string;
  /** Label rendered on the per-type form beside the "new value" input. */
  formLabel: string;
  /** Where the form pulls the new-value options from. */
  optionsSource: TransferOptionSource;
  /** True when the type is an inter-company move — surfaces the
   *  create_new_employee_id toggle + writes Transfer.new_company. */
  isCompanyMove?: boolean;
};

export const TRANSFER_TYPES: Record<TransferTypeSlug, TransferType> = {
  department: {
    slug: "department",
    label: "Department transfer",
    description:
      "Move the employee to a different department. Reporting line can still be adjusted separately.",
    icon: Building2,
    employeeField: "department",
    formLabel: "New department",
    optionsSource: "departments",
  },
  branch: {
    slug: "branch",
    label: "Site / Branch transfer",
    description:
      "Relocate the employee to another business location. Common when a role moves between offices.",
    icon: MapPin,
    employeeField: "branch",
    formLabel: "New branch",
    optionsSource: "branches",
  },
  designation: {
    slug: "designation",
    label: "Designation change",
    description:
      "Change the job title. Lateral role change or a rename that doesn't affect pay grade.",
    icon: BadgeCheck,
    employeeField: "designation",
    formLabel: "New designation",
    optionsSource: "designations",
  },
  grade: {
    slug: "grade",
    label: "Grade change",
    description:
      "Promotion or demotion by pay grade. Salary changes derive from the new grade at payroll time.",
    icon: TrendingUp,
    employeeField: "pay_grade",
    formLabel: "New pay grade",
    optionsSource: "payGrades",
  },
  reporting: {
    slug: "reporting",
    label: "Reporting change",
    description:
      "Change the manager this employee reports to. Team stays, line moves.",
    icon: Users,
    employeeField: "reports_to",
    formLabel: "New manager",
    optionsSource: "employees",
  },
  company: {
    slug: "company",
    label: "Inter-company transfer",
    description:
      "Move to a different legal entity or subsidiary. Optionally issues a fresh Employee ID.",
    icon: Building,
    employeeField: "company",
    formLabel: "New company",
    optionsSource: "companies",
    isCompanyMove: true,
  },
  employment_type: {
    slug: "employment_type",
    label: "Employment type change",
    description:
      "Convert e.g. Contract → Permanent, or Part-time → Full-time. Affects leave + payroll rules.",
    icon: FileText,
    employeeField: "employment_type",
    formLabel: "New employment type",
    optionsSource: "employmentTypes",
  },
  shift: {
    slug: "shift",
    label: "Shift change",
    description:
      "Assign a different default shift pattern. Attendance rules pick it up from the next day forward.",
    icon: Clock,
    employeeField: "default_shift",
    formLabel: "New shift",
    optionsSource: "shifts",
  },
};

export function isTransferTypeSlug(v: unknown): v is TransferTypeSlug {
  return typeof v === "string" && v in TRANSFER_TYPES;
}

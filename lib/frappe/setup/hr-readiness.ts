import "server-only";
import { frappeCall } from "../client";

/**
 * HR readiness - what has to exist before you can usefully onboard an
 * employee or run a leave request. Mirror shape of the Accounting
 * readiness report so the UI (/hr/setup page + HRSetupGate component)
 * can reuse the same renderer.
 */

export type ReadinessItem = {
  key: string;
  label: string;
  hint: string;
  href: string;
  done: boolean;
};

export type ReadinessReport = {
  items: ReadinessItem[];
  ready: boolean;
};

async function count(doctype: string, filters: Array<[string, string, unknown]> = []): Promise<number> {
  try {
    const raw = await frappeCall<{ count?: number } | number>({
      method: "frappe.client.get_count",
      as: "user",
      args: { doctype, filters },
    });
    return typeof raw === "number" ? raw : raw?.count ?? 0;
  } catch {
    return 0;
  }
}

export async function getHrReadiness(): Promise<ReadinessReport> {
  const [companies, departments, designations, grades, leaveTypes, holidayLists] =
    await Promise.all([
      count("Company", [["is_group", "=", 0]]),
      count("Department"),
      count("Designation"),
      count("Employee Grade"),
      count("Leave Type"),
      count("Holiday List"),
    ]);

  const items: ReadinessItem[] = [
    {
      key: "company",
      label: "Create at least one company",
      hint: "Every Employee is attached to a company. Finish the Accounting setup first — the Company is shared.",
      href: "/accounting/masters/companies",
      done: companies > 0,
    },
    {
      key: "department",
      label: "Add at least one Department",
      hint: "Employees live under a Department (e.g. Finance, Operations). You can add more later.",
      href: "/hr/departments",
      done: departments > 0,
    },
    {
      key: "designation",
      label: "Add at least one Designation",
      hint: "Job titles — e.g. Accountant, Driver, Software Engineer. Required when creating an Employee.",
      href: "/hr/designations",
      done: designations > 0,
    },
    {
      key: "employee_grade",
      label: "Add at least one Employee Grade",
      hint: "Grades (A, B, C or custom labels) drive salary bands and NEC ceilings. Needed before you can set salaries.",
      href: "/hr/grades",
      done: grades > 0,
    },
    {
      key: "leave_type",
      label: "Define at least one Leave Type",
      hint: "Annual Leave, Sick Leave, etc. Leave requests reference these.",
      href: "/hr/leave-types",
      done: leaveTypes > 0,
    },
    {
      key: "holiday_list",
      label: "Have at least one Holiday List",
      hint: "Public holidays for the year. Payroll + attendance use this to skip non-working days.",
      href: "/hr/holiday-lists",
      done: holidayLists > 0,
    },
  ];

  return { items, ready: items.every((i) => i.done) };
}

import "server-only";
import { frappeCall } from "../client";

/**
 * Payroll readiness - must be in place before a payrun won't crash.
 * Zimbabwe-specific: NEC bands, PAYE / Aids Levy / NSSA / ZIMDEF tax
 * accounts, salary structure.
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

export async function getPayrollReadiness(): Promise<ReadinessReport> {
  const [structures, componentsEarn, componentsDeduct, grades, payrollPeriods, costCenters] =
    await Promise.all([
      count("Salary Structure"),
      count("Salary Component", [["type", "=", "Earning"]]),
      count("Salary Component", [["type", "=", "Deduction"]]),
      count("Employee Grade"),
      count("Payroll Period"),
      count("Colossal Cost Center", [["is_group", "=", 0]]),
    ]);

  const items: ReadinessItem[] = [
    {
      key: "cost_center",
      label: "At least one leaf Cost Centre",
      hint: "Payroll costs post against a Cost Centre. Add one under /accounting/cost-centers.",
      href: "/accounting/cost-centers",
      done: costCenters > 0,
    },
    {
      key: "employee_grade",
      label: "Define Employee Grades",
      hint: "Grades drive salary bands. For Zimbabwe NEC bands, add at least Grade A through the top grade.",
      href: "/hr/grades",
      done: grades > 0,
    },
    {
      key: "earning_component",
      label: "At least one Earning Salary Component",
      hint: "e.g. Basic, Housing Allowance, Transport. Payruns need these to compute gross.",
      href: "/payroll/components",
      done: componentsEarn > 0,
    },
    {
      key: "deduction_component",
      label: "At least one Deduction Salary Component",
      hint: "e.g. PAYE, Aids Levy, NSSA, ZIMDEF, pension. Required to compute statutory withholdings.",
      href: "/payroll/components",
      done: componentsDeduct > 0,
    },
    {
      key: "salary_structure",
      label: "Define at least one Salary Structure",
      hint: "A Salary Structure wires components (Basic × 1, Transport = 50, PAYE = formula) to a grade.",
      href: "/payroll/structures",
      done: structures > 0,
    },
    {
      key: "payroll_period",
      label: "Have a current Payroll Period",
      hint: "The Payroll Period covers the pay dates in your run. Needed for PAYE / NSSA brackets.",
      href: "/payroll/periods",
      done: payrollPeriods > 0,
    },
  ];

  return { items, ready: items.every((i) => i.done) };
}

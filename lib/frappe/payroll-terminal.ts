import "server-only";
import { frappeCall } from "./client";

/**
 * Hydrate a TERMINAL Payroll Run's captured items and their §14
 * classification for the specialized detail page. Reads the txn
 * rows on the run, joins to Payroll Transaction Code for each
 * row's package_class, and returns them grouped for the ledger UI.
 */

export type TerminalItemView = {
  code: string;
  amount: number;
  package_class:
    | "regular"
    | "retrenchment_eligible"
    | "cash_in_lieu"
    | "exempt_passage";
};

export type TerminalRunSnapshot = {
  employee: string;
  employee_name: string;
  items: TerminalItemView[];
  totals: {
    package_eligible: number;
    cash_in_lieu: number;
    exempt_passage: number;
    regular: number;
    gross: number;
  };
};

export async function loadTerminalRunSnapshot(
  payrollRun: string,
  targetEmployee: string,
): Promise<TerminalRunSnapshot> {
  const [txns, empRow] = await Promise.all([
    frappeCall<
      Array<{ code: string; amount: number; currency: string; kind: string }>
    >({
      method: "frappe.client.get_list",
      args: {
        doctype: "Payroll Transaction",
        fields: ["code", "amount", "currency", "kind"],
        filters: JSON.stringify([
          ["payroll_run", "=", payrollRun],
          ["employee", "=", targetEmployee],
        ]),
        limit_page_length: 500,
        order_by: "creation asc",
      },
      as: "user",
    }).catch(() => []),
    frappeCall<{ employee_name: string } | { message?: { employee_name: string } }>({
      method: "frappe.client.get_value",
      args: { doctype: "Employee", filters: targetEmployee, fieldname: "employee_name" },
      as: "user",
    }).catch(() => ({} as { employee_name?: string })),
  ]);

  const rawEmpName =
    (empRow as { message?: { employee_name?: string }; employee_name?: string })
      .message?.employee_name ??
    (empRow as { employee_name?: string }).employee_name ??
    "";

  // Resolve each txn's code → package_class in one query.
  const codes = Array.from(new Set((txns ?? []).map((t) => t.code).filter(Boolean)));
  const classByCode = new Map<string, TerminalItemView["package_class"]>();
  if (codes.length > 0) {
    try {
      const rows = await frappeCall<
        Array<{ code: string; package_class: string | null }>
      >({
        method: "frappe.client.get_list",
        args: {
          doctype: "Payroll Transaction Code",
          fields: ["code", "package_class"],
          filters: JSON.stringify([["code", "in", codes]]),
          limit_page_length: 500,
        },
        as: "user",
      });
      for (const r of rows ?? []) {
        const raw = (r.package_class ?? "regular").toLowerCase();
        classByCode.set(
          r.code,
          (["retrenchment_eligible", "cash_in_lieu", "exempt_passage", "regular"].includes(raw)
            ? raw
            : "regular") as TerminalItemView["package_class"],
        );
      }
    } catch {
      /* leave unclassified → default 'regular' */
    }
  }

  const items: TerminalItemView[] = (txns ?? [])
    .filter((t) => t.kind === "EARNING" && (t.currency ?? "USD") === "USD")
    .map((t) => ({
      code: t.code,
      amount: Number(t.amount || 0),
      package_class: classByCode.get(t.code) ?? "regular",
    }));

  const totals = items.reduce(
    (a, i) => {
      if (i.package_class === "retrenchment_eligible") a.package_eligible += i.amount;
      else if (i.package_class === "cash_in_lieu") a.cash_in_lieu += i.amount;
      else if (i.package_class === "exempt_passage") a.exempt_passage += i.amount;
      else a.regular += i.amount;
      a.gross += i.amount;
      return a;
    },
    { package_eligible: 0, cash_in_lieu: 0, exempt_passage: 0, regular: 0, gross: 0 },
  );

  return {
    employee: targetEmployee,
    employee_name: rawEmpName || targetEmployee,
    items,
    totals,
  };
}

import { NextRequest } from "next/server";
import { frappeCall } from "@/lib/frappe/client";

export const dynamic = "force-dynamic";

/**
 * CSV export mirroring the on-screen pivot: one row per
 * (employee, component code, kind) with amount totals summed across
 * every Payroll Run with a pay-date in the chosen range.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";
  const kind = url.searchParams.get("kind") || "BOTH";
  if (!from || !to) return new Response("Missing from / to.", { status: 400 });

  const runs = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Payroll Run",
      fields: ["name"],
      filters: [
        ["pay_date", ">=", from],
        ["pay_date", "<=", to],
      ],
      limit_page_length: 500,
    },
  });
  const runNames = runs.map((r) => String(r.name ?? ""));
  if (runNames.length === 0) {
    return new Response("Kind,Employee ID,Employee,Code,Currency,Amount\n", {
      status: 200,
      headers: { "Content-Type": "text/csv; charset=utf-8" },
    });
  }

  // One query per run, 500 rows each (v15 caps list queries at 500).
  // Mirrors the shape used by the UI page.
  const perRun = await Promise.all(
    runNames.map((runName) => {
      const filters: Array<[string, string, unknown]> = [["payroll_run", "=", runName]];
      if (kind !== "BOTH") filters.push(["kind", "=", kind]);
      return frappeCall<Array<Record<string, unknown>>>({
        method: "frappe.client.get_list",
        as: "user",
        args: {
          doctype: "Payroll Transaction",
          fields: ["employee", "employee_name", "code", "currency", "amount", "kind"],
          filters,
          limit_page_length: 500,
        },
      });
    }),
  );
  const txns = perRun.flat();

  // Aggregate (kind, employee, code) → amount so the CSV matches the UI
  // totals rather than every raw transaction row.
  const agg = new Map<string, { kind: string; employee: string; employee_name: string; code: string; currency: string; amount: number }>();
  for (const r of txns) {
    const k = `${r.kind}:${r.employee}:${r.code}:${r.currency}`;
    const existing = agg.get(k);
    if (existing) {
      existing.amount += Number(r.amount ?? 0);
    } else {
      agg.set(k, {
        kind: String(r.kind ?? ""),
        employee: String(r.employee ?? ""),
        employee_name: String(r.employee_name ?? r.employee ?? ""),
        code: String(r.code ?? ""),
        currency: String(r.currency ?? "USD"),
        amount: Number(r.amount ?? 0),
      });
    }
  }

  const header = ["Kind", "Employee ID", "Employee", "Code", "Currency", "Amount"];
  const lines = [header.map(csvCell).join(",")];
  for (const r of Array.from(agg.values()).sort((a, b) =>
    a.kind.localeCompare(b.kind) ||
    a.employee_name.localeCompare(b.employee_name) ||
    a.code.localeCompare(b.code),
  )) {
    lines.push([r.kind, r.employee, r.employee_name, r.code, r.currency, r.amount.toFixed(2)].map(csvCell).join(","));
  }
  const csv = lines.join("\n") + "\n";
  const filename = `earnings-deductions-${from}-to-${to}.csv`.replace(/[^\w.\-]+/g, "_");
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function csvCell(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

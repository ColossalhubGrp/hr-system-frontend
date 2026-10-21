import { NextRequest } from "next/server";
import { frappeCall } from "@/lib/frappe/client";

export const dynamic = "force-dynamic";

/**
 * Serves the sales-report rows as text/csv so the browser treats it as
 * a download. Same company + from + to query params the page uses, so
 * users can bookmark + hit the CSV button and get a matching export.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const company = url.searchParams.get("company") || "";
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";

  if (!company || !from || !to) {
    return new Response("Missing company, from, or to.", { status: 400 });
  }

  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Colossal Sales Invoice",
      fields: [
        "name",
        "posting_date",
        "due_date",
        "customer",
        "customer_name",
        "company",
        "currency",
        "grand_total",
        "outstanding_amount",
        "status",
        "docstatus",
      ],
      filters: [
        ["company", "=", company],
        ["posting_date", ">=", from],
        ["posting_date", "<=", to],
      ],
      order_by: "posting_date asc, creation asc",
      // v15 caps list queries at 500 → oversize values trigger 417
      // from the typed_validator. If a tenant genuinely has > 500 SI
      // in one range, extend this to multi-page later.
      limit_page_length: 500,
    },
  });

  const header = [
    "Invoice",
    "Posting date",
    "Due date",
    "Customer ID",
    "Customer name",
    "Company",
    "Currency",
    "Grand total",
    "Outstanding",
    "Status",
    "Docstatus",
  ];
  const lines = [header.map(csvCell).join(",")];
  for (const r of rows) {
    lines.push(
      [
        String(r.name ?? ""),
        String(r.posting_date ?? ""),
        String(r.due_date ?? ""),
        String(r.customer ?? ""),
        String(r.customer_name ?? ""),
        String(r.company ?? ""),
        String(r.currency ?? ""),
        String(r.grand_total ?? 0),
        String(r.outstanding_amount ?? 0),
        String(r.status ?? ""),
        String(r.docstatus ?? ""),
      ].map(csvCell).join(","),
    );
  }
  const csv = lines.join("\n") + "\n";

  // Filename picks up the date range for easy filing by the user.
  const filename = `sales-${company}-${from}-to-${to}.csv`.replace(/[^\w.\-]+/g, "_");
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

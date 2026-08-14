import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * GET /api/analytics/semantics/source-columns?table=<DocType>
 *
 * Picker options for the "Column" dropdown on the New Metric modal —
 * the columns available on the chosen source table. Populated on
 * demand once the user picks a source table.
 */
export async function GET(req: Request) {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const url = new URL(req.url);
  const table = (url.searchParams.get("table") || "").trim();
  if (!table) {
    return NextResponse.json({ columns: [] });
  }
  try {
    const rows = await frappeCall({
      method: "colossal_bi.bi_analytics.api.semantics.list_source_columns",
      verb: "GET",
      args: { source_doctype: table },
      as: "user",
    });
    return NextResponse.json({ columns: rows ?? [] });
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[semantics/source-columns GET] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

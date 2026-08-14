import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * GET /api/analytics/semantics/source-tables
 *
 * Picker options for the "Source table" dropdown on the New Metric
 * modal. Backend filters to HR/payroll-relevant tables so the list
 * is browsable rather than the site's full 1000+ DocType surface.
 */
export async function GET() {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  try {
    const rows = await frappeCall({
      method: "colossal_bi.bi_analytics.api.semantics.list_source_tables",
      verb: "GET",
      args: {},
      as: "user",
    });
    return NextResponse.json({ tables: rows ?? [] });
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[semantics/source-tables GET] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * GET /api/analytics/semantics/data-sources
 *
 * Proxy for `colossal_bi.bi_analytics.api.data_sources.list_external_sources`.
 * Returns the list of external OLTP Data Sources (Postgres etc.);
 * used by the Data tab to render the "Connected databases" panel.
 */
export async function GET() {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  try {
    const data = await frappeCall({
      method: "colossal_bi.bi_analytics.api.data_sources.list_external_sources",
      verb: "GET",
      args: {},
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[semantics/data-sources] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

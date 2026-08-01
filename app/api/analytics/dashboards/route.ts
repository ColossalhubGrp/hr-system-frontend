import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * GET /api/analytics/dashboards
 *
 * Returns the dashboards the caller can see (owner + shared_with_roles
 * + all-of-them for Executive Viewer). Each row carries a tile_count
 * and a `mine` flag so the list view can group / label correctly.
 */
export async function GET() {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  try {
    const data = await frappeCall({
      method: "colossal_bi.bi_analytics.api.dashboards.list_dashboards",
      verb: "GET",
      args: {},
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[dashboards] list failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

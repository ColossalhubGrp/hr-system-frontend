import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * GET /api/analytics/dashboards/shares/list?dashboard_code=<code>
 *
 * List active + revoked shares for a dashboard. Used by the
 * share-tile modal to render current links + revoke buttons.
 */
export async function GET(req: Request) {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const dashboard_code = new URL(req.url).searchParams.get("dashboard_code")?.trim();
  if (!dashboard_code) {
    return NextResponse.json({ error: "dashboard_code is required." }, { status: 400 });
  }
  try {
    const data = await frappeCall({
      method: "colossal_bi.bi_analytics.api.dashboard_shares.list_shares",
      verb: "GET",
      args: { dashboard_code },
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[dashboards/shares/list] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

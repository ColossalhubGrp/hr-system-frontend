import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * GET /api/analytics/dashboards/<code>
 *
 * Returns the full DashboardDetail (metadata + tiles). 403 when
 * the caller isn't in the visibility set (owner + shared_with_roles
 * + Executive Viewer). The frontend renders a distinct
 * not-available state on 403.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const { code } = await params;
  if (!code) {
    return NextResponse.json({ error: "code is required." }, { status: 400 });
  }
  try {
    const data = await frappeCall({
      method: "colossal_bi.bi_analytics.api.dashboards.get_dashboard",
      verb: "GET",
      args: { code },
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[dashboards/get] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

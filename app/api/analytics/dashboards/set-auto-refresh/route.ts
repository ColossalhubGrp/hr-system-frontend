import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * POST /api/analytics/dashboards/set-auto-refresh
 * Body: { dashboard_code, enabled }
 *
 * Owner-only toggle. When enabled, the nightly Frappe scheduler
 * (see colossal_bi hooks.py::scheduler_events["daily"]) walks the
 * dashboard's tiles and re-runs any that are past their
 * stale_after_hours. Off by default per Phase 4c design.
 */
export async function POST(req: Request) {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as {
    dashboard_code?: string;
    enabled?: boolean;
  } | null;
  if (!body?.dashboard_code || typeof body.enabled !== "boolean") {
    return NextResponse.json(
      { error: "dashboard_code and enabled (boolean) are required." },
      { status: 400 },
    );
  }
  try {
    const data = await frappeCall({
      method: "colossal_bi.bi_analytics.api.dashboards.set_auto_refresh",
      verb: "POST",
      args: { dashboard_code: body.dashboard_code, enabled: body.enabled },
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[dashboards/set-auto-refresh] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

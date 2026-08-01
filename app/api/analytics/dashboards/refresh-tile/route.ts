import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * POST /api/analytics/dashboards/refresh-tile
 * Body: { dashboard_code, tile_position }
 *
 * Re-execute the tile's question with review=True and replace its
 * snapshot. Preserves position + saved_at (historical anchor).
 * ~5-6s latency (same as save_answer).
 */
export async function POST(req: Request) {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as {
    dashboard_code?: string;
    tile_position?: number;
  } | null;
  if (!body?.dashboard_code || typeof body.tile_position !== "number") {
    return NextResponse.json({ error: "dashboard_code and tile_position are required." }, { status: 400 });
  }
  try {
    const data = await frappeCall({
      method: "colossal_bi.bi_analytics.api.dashboards.refresh_tile",
      verb: "POST",
      args: { dashboard_code: body.dashboard_code, tile_position: body.tile_position },
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[dashboards/refresh-tile] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

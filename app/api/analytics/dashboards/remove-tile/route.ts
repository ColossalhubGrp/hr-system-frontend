import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * POST /api/analytics/dashboards/remove-tile
 * Body: { dashboard_code, tile_position }
 *
 * Removes a tile and re-packs positions (no gaps). Returns
 * { removed: true/false, remaining: N } so the UI can update
 * without a full re-fetch.
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
      method: "colossal_bi.bi_analytics.api.dashboards.remove_tile",
      verb: "POST",
      args: { dashboard_code: body.dashboard_code, tile_position: body.tile_position },
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[dashboards/remove-tile] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

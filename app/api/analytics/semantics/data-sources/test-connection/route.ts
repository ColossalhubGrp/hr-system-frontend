import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * POST /api/analytics/semantics/data-sources/test-connection
 * Body: { code }
 *
 * Re-pings an existing Data Source's health check and updates the
 * DocType's `last_connected_at` / `last_health_message` / `status`
 * fields on the backend so the "Connected databases" panel
 * refreshes on the next reload.
 */
export async function POST(req: Request) {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { code?: string } | null;
  if (!body?.code) {
    return NextResponse.json({ error: "code is required." }, { status: 400 });
  }
  try {
    const data = await frappeCall({
      method: "colossal_bi.bi_analytics.api.data_sources.test_connection",
      verb: "POST",
      args: { code: body.code },
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[semantics/data-sources/test-connection] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

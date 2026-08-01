import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * POST /api/analytics/dashboards/shares/revoke
 * Body: { token }
 *
 * Kill a share link. Idempotent — revoking an already-revoked
 * share just updates the timestamp. Public reads on the token
 * start returning 410 Gone immediately after.
 */
export async function POST(req: Request) {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { token?: string } | null;
  if (!body?.token) {
    return NextResponse.json({ error: "token is required." }, { status: 400 });
  }
  try {
    const data = await frappeCall({
      method: "colossal_bi.bi_analytics.api.dashboard_shares.revoke_share",
      verb: "POST",
      args: { token: body.token },
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[dashboards/shares/revoke] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

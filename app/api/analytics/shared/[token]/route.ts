import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";

/**
 * GET /api/analytics/shared/<token>
 *
 * PUBLIC endpoint — no session required. Backend method is
 * whitelisted with allow_guest=True; the token itself is the auth
 * (~256 bits of entropy, revocable by the owner).
 *
 * Uses the service API key rather than a user session — the backend
 * gates on the token, not on who is asking. The Next.js server
 * always has the service key, so this call succeeds for anonymous
 * browser visitors too.
 *
 * Preserves the backend's HTTP status code (404 unknown / 410
 * revoked-or-expired / 409 tile-removed) so the shared page can
 * render distinct error states.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: "token is required." }, { status: 400 });
  }
  try {
    const data = await frappeCall({
      method: "colossal_bi.bi_analytics.api.dashboard_shares.get_shared_tile",
      verb: "GET",
      args: { token },
      as: "service",
      revalidate: false,   // per-visitor access log; must not cache
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[analytics/shared] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

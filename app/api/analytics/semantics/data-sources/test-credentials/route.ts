import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * POST /api/analytics/semantics/data-sources/test-credentials
 *
 * Pings the given host/port/db/user/password combo WITHOUT
 * persisting a Data Source row. The Data-tab wizard calls this
 * from a "Test connection" button so a Steward proves the creds
 * work before hitting Save. Prevents the "stuck after a failed
 * save" trap where a Data Source would be left half-created
 * and the user had to delete it before retrying.
 */
export async function POST(req: Request) {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  try {
    const data = await frappeCall({
      method: "colossal_bi.bi_analytics.api.data_sources.test_credentials",
      verb: "POST",
      args: body,
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[semantics/data-sources/test-credentials] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

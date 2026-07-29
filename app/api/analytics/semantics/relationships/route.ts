import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * GET /api/analytics/semantics/relationships?confidence=Heuristic%20Pending
 *
 * Proxies to colossal_bi.bi_analytics.api.semantics.list_relationships.
 * Default filter (no param) returns ALL confidence tiers so the UI
 * can render the count chips without a second request.
 */

export async function GET(req: Request) {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const args: Record<string, string> = {};
  const conf = searchParams.get("confidence");
  if (conf) args.confidence = conf;
  const fromDT = searchParams.get("from_doctype");
  if (fromDT) args.from_doctype = fromDT;
  const toDT = searchParams.get("to_doctype");
  if (toDT) args.to_doctype = toDT;
  const limit = searchParams.get("limit");
  if (limit) args.limit = limit;

  try {
    const data = await frappeCall({
      method: "colossal_bi.bi_analytics.api.semantics.list_relationships",
      verb: "GET",
      args,
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[semantics/relationships list] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

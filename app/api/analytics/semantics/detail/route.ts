import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * Proxies /analytics/semantics's detail view to
 * colossal_bi.bi_analytics.api.semantics.get_metric_detail.
 *
 * GET /api/analytics/semantics/detail?code=hr.comp.payroll_cost_monthly
 *
 * Query-string routing keeps the URL flat — we don't need dynamic
 * segments for a single-parameter endpoint, and it avoids the
 * Next.js quirk of encoding dots in path segments.
 */

export async function GET(req: Request) {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const code = (searchParams.get("code") || "").trim();
  if (!code) {
    return NextResponse.json({ error: "code is required." }, { status: 400 });
  }

  try {
    const data = await frappeCall({
      method: "colossal_bi.bi_analytics.api.semantics.get_metric_detail",
      verb: "GET",
      args: { code },
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[semantics/detail] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

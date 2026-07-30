import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * GET  /api/analytics/semantics/business-context
 *   Returns { raw, resolved, editable }.
 *
 * POST /api/analytics/semantics/business-context
 *   Body: any subset of { fiscal_year_start_month, default_timezone,
 *   base_currency, currency_notes, code_system_notes, profile_apps }.
 *   Only fields explicitly present get written; others are left alone.
 */

export async function GET() {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  try {
    const data = await frappeCall({
      method: "colossal_bi.bi_analytics.api.semantics.get_business_context",
      verb: "GET",
      args: {},
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[semantics/business-context GET] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  // Forward only known keys so a rogue field can't sneak into the
  // backend call. The backend also validates.
  const allowed: Record<string, string | number> = {};
  const keys = [
    "fiscal_year_start_month",
    "default_timezone",
    "base_currency",
    "currency_notes",
    "code_system_notes",
    "profile_apps",
  ];
  for (const k of keys) {
    if (k in body) {
      const v = body[k];
      if (v === null || v === undefined) continue;
      allowed[k] = typeof v === "number" ? v : String(v);
    }
  }

  try {
    const data = await frappeCall({
      method: "colossal_bi.bi_analytics.api.semantics.update_business_context",
      verb: "POST",
      args: allowed,
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[semantics/business-context POST] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

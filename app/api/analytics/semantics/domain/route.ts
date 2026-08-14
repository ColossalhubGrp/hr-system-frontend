import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * POST /api/analytics/semantics/domain
 *
 * Create a new metric domain (sidebar bucket like Headcount / Attrition).
 * Called inline from the "+ New metric" modal when the user picks
 * "Create new domain" from the domain dropdown.
 *
 * Body: { title, description?, icon? }
 */
export async function POST(req: Request) {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const result = await frappeCall({
      method: "colossal_bi.bi_analytics.api.semantics.create_domain",
      verb: "POST",
      args: body,
      as: "user",
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 400 });
    }
    console.error("[semantics/domain POST] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

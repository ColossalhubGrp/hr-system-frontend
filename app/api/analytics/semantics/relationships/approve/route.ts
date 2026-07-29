import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * POST /api/analytics/semantics/relationships/approve
 * body: { name: string }
 *
 * Proxies to colossal_bi.bi_analytics.api.semantics.approve_relationship.
 */

export async function POST(req: Request) {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  let body: { name?: string };
  try {
    body = (await req.json()) as { name?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body.name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }
  try {
    const data = await frappeCall({
      method: "colossal_bi.bi_analytics.api.semantics.approve_relationship",
      verb: "POST",
      args: { name: body.name },
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[semantics/relationships approve] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

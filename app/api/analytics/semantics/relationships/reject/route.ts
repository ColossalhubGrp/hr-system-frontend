import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * POST /api/analytics/semantics/relationships/reject
 * body: { name: string, reason: string }
 */

export async function POST(req: Request) {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  let body: { name?: string; reason?: string };
  try {
    body = (await req.json()) as { name?: string; reason?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body.name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }
  if (!(body.reason || "").trim()) {
    return NextResponse.json({ error: "reason is required." }, { status: 400 });
  }
  try {
    const data = await frappeCall({
      method: "colossal_bi.bi_analytics.api.semantics.reject_relationship",
      verb: "POST",
      args: { name: body.name, reason: body.reason ?? "" },
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[semantics/relationships reject] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

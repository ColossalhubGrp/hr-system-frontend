import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

export async function POST(req: Request) {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: { audit_log_id?: string; rating?: string; comment?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body.audit_log_id || !body.rating) {
    return NextResponse.json({ error: "audit_log_id and rating are required." }, { status: 400 });
  }
  if (body.rating !== "Up" && body.rating !== "Down") {
    return NextResponse.json({ error: "rating must be 'Up' or 'Down'." }, { status: 400 });
  }

  try {
    const data = await frappeCall<{ ok: boolean; ticket: string | null }>({
      method: "tenant_manager.chatbot.api.chatbot.rate",
      verb: "POST",
      args: {
        audit_log_id: body.audit_log_id,
        rating: body.rating,
        comment: body.comment,
      },
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[chat/rate] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

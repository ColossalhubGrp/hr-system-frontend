import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * Proxies the browser chat UI to Frappe's HR-policy chatbot endpoint.
 * We keep this in a Route Handler (not a Server Action) so client-side
 * fetch can post from a Sheet component without a full server round-trip
 * on every keystroke and so future streaming can slot in later.
 */

type AskResponse = {
  answer: string;
  citations: {
    label: string;
    doctype: string;
    name: string;
    title: string;
    category?: string;
  }[];
  refused: boolean;
  audit_log_id: string;
  latency_ms: number;
};

export async function POST(req: Request) {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: { question?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const question = (body.question ?? "").trim();
  if (!question) {
    return NextResponse.json({ error: "Question cannot be empty." }, { status: 400 });
  }
  if (question.length > 500) {
    return NextResponse.json({ error: "Question is too long (max 500 chars)." }, { status: 400 });
  }

  try {
    const data = await frappeCall<AskResponse>({
      method: "tenant_manager.chatbot.api.chatbot.ask",
      verb: "POST",
      args: { question },
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status || 500 },
      );
    }
    console.error("[chat/ask] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * Whitelisted-doctype passthrough for citation lookup from the chat drawer.
 * Only HR Policy and FAQ are exposed here — the citation UX has no
 * legitimate need for anything else, and locking the allowlist means a
 * future prompt-injection can't coerce the chat drawer into fetching
 * arbitrary records.
 */

const ALLOWED = new Set(["HR Policy", "FAQ"]);

export async function GET(req: Request) {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const doctype = searchParams.get("doctype") ?? "";
  const name = searchParams.get("name") ?? "";

  if (!ALLOWED.has(doctype)) {
    return NextResponse.json({ error: "Doctype not allowed." }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }

  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      args: { doctype, name },
      as: "user",
    });
    return NextResponse.json(doc);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[frappe/get] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

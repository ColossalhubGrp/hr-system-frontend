import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * POST /api/analytics/dashboards/create
 * Body: { title, description?, shared_with_roles? }
 *
 * Creates an empty dashboard owned by the caller. Returns
 * { code, title } — the caller usually redirects to /analytics/
 * dashboards/<code> next.
 */
export async function POST(req: Request) {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as {
    title?: string;
    description?: string;
    shared_with_roles?: string[];
  } | null;
  if (!body?.title?.trim()) {
    return NextResponse.json({ error: "title is required." }, { status: 400 });
  }
  try {
    const data = await frappeCall({
      method: "colossal_bi.bi_analytics.api.dashboards.create_dashboard",
      verb: "POST",
      args: {
        title: body.title.trim(),
        description: body.description,
        // The Frappe layer accepts JSON-encoded lists; normalize
        // so a UI array round-trips cleanly.
        shared_with_roles: body.shared_with_roles
          ? JSON.stringify(body.shared_with_roles)
          : undefined,
      },
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[dashboards/create] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

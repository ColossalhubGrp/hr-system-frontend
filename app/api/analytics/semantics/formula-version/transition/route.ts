import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * POST /api/analytics/semantics/formula-version/transition
 *
 * Moves an existing Formula Version through its workflow. Legal
 * transitions are enforced by
 * colossal_bi.bi_analytics.api.semantics.transition_formula_version.
 */

type TransitionBody = {
  name?: string;
  to_status?: string;
  reason?: string;
  effective_date?: string;
};

export async function POST(req: Request) {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: TransitionBody;
  try {
    body = (await req.json()) as TransitionBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.name || !body.to_status) {
    return NextResponse.json(
      { error: "name and to_status are required." },
      { status: 400 },
    );
  }

  try {
    const data = await frappeCall({
      method: "colossal_bi.bi_analytics.api.semantics.transition_formula_version",
      verb: "POST",
      args: {
        name: body.name,
        to_status: body.to_status,
        reason: body.reason ?? "",
        effective_date: body.effective_date ?? "",
      },
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[semantics/formula-version transition] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

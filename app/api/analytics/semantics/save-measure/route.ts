import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * Proxies the Ask assistant's "save this measure" action to
 * colossal_bi.bi_analytics.api.semantics.save_tenant_measure.
 *
 * Saves a measure the user just defined self-serve, PRIVATE to their
 * tenant (owner_model = their Semantic Model child). The measure goes
 * live immediately, so the next analyze() of the restated question can
 * answer it. The backend re-validates every field and role-gates the
 * write, so this route only passes through.
 */

type SaveResponse = {
  code: string;
  title: string;
  domain: string;
  owner_model: string;
  private: boolean;
  restated_question: string | null;
};

export async function POST(req: Request) {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "Measure name is required." }, { status: 400 });
  }

  // Pass through only the fields save_tenant_measure accepts. Undefined
  // values are dropped so the backend's defaults apply.
  const fields = [
    "computation_type", "description", "plain_explanation", "source_doctype",
    "aggregation", "aggregation_field", "base_filters", "custom_sql", "unit",
    "format", "domain", "restated_question",
  ] as const;
  const args: Record<string, string> = { title };
  for (const f of fields) {
    const v = body[f];
    if (v !== undefined && v !== null && v !== "") args[f] = String(v);
  }
  if (body.higher_is_better !== undefined) {
    args.higher_is_better = body.higher_is_better ? "1" : "0";
  }

  try {
    const data = await frappeCall<SaveResponse>({
      method: "colossal_bi.bi_analytics.api.semantics.save_tenant_measure",
      verb: "POST",
      args,
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[semantics/save-measure] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

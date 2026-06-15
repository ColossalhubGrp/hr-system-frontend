import "server-only";
import { frappeCall } from "./client";
import { readSession } from "./session";

/**
 * The three values Frappe HR's native `evaluation_framework` field accepts.
 * The SRS (§4.1 of the Performance Management spec) calls these the three
 * Evaluation Framework options.
 */
export type EvaluationFramework =
  | "KRA & Goals"
  | "OKR"
  | "Balanced Scorecard";

export const EVALUATION_FRAMEWORKS: EvaluationFramework[] = [
  "KRA & Goals",
  "OKR",
  "Balanced Scorecard",
];

/**
 * Normalise whatever Frappe sends back for `evaluation_framework`. The field
 * defaults to "KRA & Goals" on new cycles; anything unrecognised falls back
 * to KRA so the UI never breaks on a stale value.
 */
export function normalizeFramework(v: unknown): EvaluationFramework {
  if (v === "OKR") return "OKR";
  if (v === "Balanced Scorecard") return "Balanced Scorecard";
  return "KRA & Goals";
}

export type ActiveCycleInfo = {
  cycleId: string;
  cycleName: string;
  framework: EvaluationFramework;
  company: string | null;
  startDate: string | null;
  endDate: string | null;
};

/**
 * Returns the most-recently-started open Appraisal Cycle for the signed-in
 * employee's company, with its evaluation framework. We pick the latest
 * `start_date` so that when multiple cycles overlap (e.g. company-wide
 * annual + team quarterly), the more recent one drives the UI. Returns null
 * when there's no Employee record bound to the session, or no cycles exist.
 */
export async function getActiveAppraisalCycleFramework(): Promise<ActiveCycleInfo | null> {
  const session = readSession();
  if (!session.userId) return null;

  try {
    // Resolve the signed-in user's company via their Employee record.
    type EmpRow = { name: string; company: string | null };
    const empRows = await frappeCall<EmpRow[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Employee",
        fields: ["name", "company"],
        filters: JSON.stringify([["user_id", "=", session.userId]]),
        limit_page_length: 1,
      },
      as: "user",
    });
    const company = empRows[0]?.company ?? null;

    type CycleRow = {
      name: string;
      cycle_name: string | null;
      evaluation_framework: string | null;
      company: string | null;
      start_date: string | null;
      end_date: string | null;
    };
    const filters: Array<[string, string, string]> = [];
    if (company) filters.push(["company", "=", company]);

    const rows = await frappeCall<CycleRow[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Appraisal Cycle",
        fields: [
          "name",
          "cycle_name",
          "evaluation_framework",
          "company",
          "start_date",
          "end_date",
        ],
        filters: JSON.stringify(filters),
        order_by: "start_date desc",
        limit_page_length: 1,
      },
      as: "user",
    });

    const row = rows[0];
    if (!row) return null;
    return {
      cycleId: row.name,
      cycleName: row.cycle_name ?? row.name,
      framework: normalizeFramework(row.evaluation_framework),
      company: row.company,
      startDate: row.start_date,
      endDate: row.end_date,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch the framework for one specific cycle (used by Goal pages that know
 * which cycle a goal belongs to). Returns "KRA & Goals" if the cycle can't be
 * read — Goal forms then fall back to the legacy framing.
 */
export async function getCycleFramework(
  cycleId: string,
): Promise<EvaluationFramework> {
  try {
    type Raw = { evaluation_framework: string | null };
    const doc = await frappeCall<Raw>({
      method: "frappe.client.get_value",
      args: {
        doctype: "Appraisal Cycle",
        filters: JSON.stringify({ name: cycleId }),
        fieldname: "evaluation_framework",
      },
      as: "user",
    });
    return normalizeFramework(doc.evaluation_framework);
  } catch {
    return "KRA & Goals";
  }
}

/**
 * Write the framework on a cycle. Used by the HR-only Server Action; callers
 * must check `MyAccess.isHrAdmin` BEFORE calling. The Server Action also
 * re-checks server-side as a defense-in-depth measure.
 */
export async function setCycleFramework(
  cycleId: string,
  framework: EvaluationFramework,
): Promise<void> {
  await frappeCall<{ name: string }>({
    method: "frappe.client.set_value",
    args: {
      doctype: "Appraisal Cycle",
      name: cycleId,
      fieldname: { evaluation_framework: framework },
    },
    verb: "POST",
    as: "user",
  });
}

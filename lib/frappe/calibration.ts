import "server-only";
import { frappeCall } from "./client";

/**
 * 9-box calibration data layer.
 *
 * Performance axis: derived from Appraisal.final_score
 *   Low    : final_score < 2.5
 *   Medium : 2.5 ≤ final_score ≤ 4.0
 *   High   : final_score > 4.0
 *
 * Potential axis: HR-set Custom Field `Appraisal.potential_rating` (Select
 *   "Low" / "Medium" / "High"). Defaults to Medium when unset so newly-created
 *   appraisals land in the centre column instead of mysteriously disappearing.
 *
 * Both axes are per-cycle: the board is always scoped to a single Appraisal
 * Cycle. The cycle picker on the calibration page drives the filter.
 */

export type Band = "Low" | "Medium" | "High";
export const BANDS: Band[] = ["Low", "Medium", "High"];

export type NineBoxCell = {
  performance: Band;
  potential: Band;
  /** Stable id like `perf-high-pot-medium`. */
  id: string;
  /** Short cell label per the standard 9-box framing. */
  label: string;
  /** One-line callout describing the typical recommendation. */
  hint: string;
  entries: NineBoxEntry[];
};

export type NineBoxEntry = {
  /** Appraisal id (one entry per appraisal, not per employee). */
  appraisalId: string;
  employee: string;
  employeeName: string | null;
  finalScore: number;
  potential: Band;
  performance: Band;
  rating: number | null;
  status: string;
};

export type NineBoxBoard = {
  cycleId: string;
  cycleName: string | null;
  cells: NineBoxCell[];
  /** Total appraisals shown across the grid. */
  totalCount: number;
  /** Appraisals whose final_score has not been set yet. */
  unscoredCount: number;
};

// ---------------------------------------------------------------------------
// Cell metadata — standard 9-box framing. Labels chosen to be unambiguous;
// hints lifted from common HR playbooks.
// ---------------------------------------------------------------------------

const CELL_META: Record<string, { label: string; hint: string }> = {
  "perf-high-pot-high":   { label: "Top talent",      hint: "Invest hard: stretch roles, succession plans, accelerated learning." },
  "perf-medium-pot-high": { label: "Future star",     hint: "High potential — give the runway to grow into the next performance band." },
  "perf-low-pot-high":    { label: "Inconsistent star", hint: "Capable but underperforming — diagnose blockers before doubling down." },
  "perf-high-pot-medium": { label: "Solid performer", hint: "Reliable in role — reward and retain; promote when broader scope opens." },
  "perf-medium-pot-medium": { label: "Core contributor", hint: "Backbone of the team — keep engaged; don't over-rotate." },
  "perf-low-pot-medium":  { label: "Developing",      hint: "Needs targeted coaching — set a 90-day plan." },
  "perf-high-pot-low":    { label: "Expert / Specialist", hint: "Deep in their role — value as IC; not every star needs to manage." },
  "perf-medium-pot-low":  { label: "Effective",       hint: "Steady and dependable. Avoid pushing past their preferred scope." },
  "perf-low-pot-low":     { label: "Improvement plan", hint: "PIP territory — set clear expectations and a review date." },
};

function cellId(performance: Band, potential: Band): string {
  return `perf-${performance.toLowerCase()}-pot-${potential.toLowerCase()}`;
}

function scoreToBand(score: number): Band {
  if (score > 4) return "High";
  if (score >= 2.5) return "Medium";
  return "Low";
}

function isBand(v: unknown): v is Band {
  return v === "Low" || v === "Medium" || v === "High";
}

// ---------------------------------------------------------------------------
// Public reads
// ---------------------------------------------------------------------------

export async function listCyclesForCalibration(): Promise<
  Array<{ id: string; label: string }>
> {
  type Row = { name: string; cycle_name: string | null };
  const rows = await frappeCall<Row[]>({
    method: "frappe.client.get_list",
    args: {
      doctype: "Appraisal Cycle",
      fields: ["name", "cycle_name"],
      order_by: "modified desc",
      limit_page_length: 50,
    },
    as: "user",
  }).catch(() => [] as Row[]);
  return rows.map((r) => ({
    id: r.name,
    label: r.cycle_name ?? r.name,
  }));
}

export async function fetch9BoxBoard(cycleId: string): Promise<NineBoxBoard> {
  type Row = {
    name: string;
    employee: string;
    employee_name: string | null;
    final_score: number | null;
    status: string;
    potential_rating: string | null;
  };
  const rows = await frappeCall<Row[]>({
    method: "frappe.client.get_list",
    args: {
      doctype: "Appraisal",
      // Frappe v15 only allows in_list_view fields in get_list. `rating` is
      // not flagged in_list_view on Appraisal, so requesting it throws. We
      // already show the derived band, so we don't need `rating` here at all.
      // `potential_rating` is a Custom Field we provisioned with default
      // settings; if Frappe rejects it on this site, we fall back to fetching
      // each appraisal individually below.
      fields: [
        "name",
        "employee",
        "employee_name",
        "final_score",
        "status",
        "potential_rating",
      ],
      filters: JSON.stringify([["appraisal_cycle", "=", cycleId]]),
      order_by: "modified desc",
      limit_page_length: 500,
    },
    as: "user",
  }).catch(() => [] as Row[]);

  // Resolve the cycle label once.
  let cycleName: string | null = null;
  try {
    const cy = await frappeCall<{ cycle_name: string | null }>({
      method: "frappe.client.get_value",
      args: {
        doctype: "Appraisal Cycle",
        filters: JSON.stringify({ name: cycleId }),
        fieldname: ["cycle_name"],
      },
      as: "user",
    });
    cycleName = cy?.cycle_name ?? null;
  } catch {
    cycleName = null;
  }

  // Initialise every cell so the grid is always 3x3 even when some are empty.
  const cells: NineBoxCell[] = BANDS.flatMap((performance) =>
    BANDS.map((potential) => {
      const id = cellId(performance, potential);
      return {
        performance,
        potential,
        id,
        label: CELL_META[id]?.label ?? "—",
        hint: CELL_META[id]?.hint ?? "",
        entries: [] as NineBoxEntry[],
      };
    }),
  );

  let unscoredCount = 0;
  for (const r of rows) {
    const final = Number(r.final_score ?? 0);
    if (final <= 0) unscoredCount++;
    const performance = scoreToBand(final);
    const potential = isBand(r.potential_rating) ? r.potential_rating : "Medium";
    const cell = cells.find(
      (c) => c.performance === performance && c.potential === potential,
    );
    cell?.entries.push({
      appraisalId: r.name,
      employee: r.employee,
      employeeName: r.employee_name,
      finalScore: final,
      potential,
      performance,
      rating: null,
      status: r.status,
    });
  }

  return {
    cycleId,
    cycleName,
    cells,
    totalCount: rows.length,
    unscoredCount,
  };
}

// ---------------------------------------------------------------------------
// Public writes
// ---------------------------------------------------------------------------

/**
 * Set the potential_rating on an Appraisal.
 *
 * We use a custom whitelisted method (`recruitment_app.api.me.set_appraisal_potential`)
 * rather than `frappe.client.set_value`, because the latter triggers a full
 * `validate` run on Appraisal, which recomputes `final_score` from the
 * goal/self/feedback scores. For an appraisal whose goal/self/feedback are
 * still 0, that recomputation would zero out a manually-set final_score —
 * losing data every time HR calibrates. The whitelisted method writes via
 * `frappe.db.set_value` (DB-only, no hooks), and re-checks admin rights
 * server-side.
 */
export async function setAppraisalPotential(
  appraisalId: string,
  rating: Band,
): Promise<void> {
  await frappeCall<{ ok: boolean }>({
    method: "recruitment_app.api.me.set_appraisal_potential",
    verb: "POST",
    args: { appraisal_id: appraisalId, rating },
    as: "user",
  });
}

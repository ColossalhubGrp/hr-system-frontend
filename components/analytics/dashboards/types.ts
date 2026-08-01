/**
 * Types for Phase 4a dashboards. Mirror the Python DocType shape
 * in colossal_bi.bi_analytics.doctype.dashboard{,_tile} — kept 1:1
 * on purpose so a backend field addition surfaces as a TS error
 * here rather than a silent runtime skew.
 */
import type { VizSpec } from "../types";

export type ReviewVerdict = "approve" | "warn" | "reject" | "unreviewed";

export interface ReviewIssue {
  kind:
    | "fabricated_number"
    | "causal_speculation"
    | "unit_mixup"
    | "hallucinated_entity"
    | "other"
    | string;
  description: string;
}

/** One saved BI answer inside a Dashboard. */
export interface DashboardTile {
  position: number;
  question: string;
  metric_code: string;
  narrative: string;
  /** Verdict at save (or last refresh) time. */
  review_verdict: ReviewVerdict;
  review_issues: ReviewIssue[];
  /** Reviewer's safer version, populated when verdict === "reject". */
  revised_narrative: string;
  /** The VizSpec at save time — hand straight to <VizRenderer/>. */
  viz: VizSpec;
  /** Column names in row order — for chart axis mapping + table view. */
  data_columns: string[];
  /** Row snapshot at save time. Refresh re-executes and replaces. */
  data_rows: Record<string, unknown>[];
  data_row_count: number;
  saved_at: string | null;
  last_refreshed_at: string | null;
  /** Freshness hint — UI can flag "stale" past this age. */
  stale_after_hours: number;
}

export interface DashboardSummary {
  name: string;
  code: string;
  title: string;
  description: string;
  owner_user: string;
  created_from_role: string | null;
  modified: string | null;
  tile_count: number;
  /** True when the current user owns this dashboard. */
  mine: boolean;
}

export interface DashboardDetail {
  code: string;
  title: string;
  description: string;
  owner_user: string;
  shared_with_roles: string[];
  /** True when the current user can add / refresh / remove tiles. */
  editable: boolean;
  /**
   * Phase 4c: nightly auto-refresh state.
   * `auto_refresh_enabled` — owner opted in for the daily job to
   * re-run stale tiles.
   * `auto_refresh_last_run_at` / `auto_refresh_last_summary` — what
   * the last scheduler pass did, shown in the header so the owner
   * knows whether the job is actually firing.
   */
  auto_refresh_enabled: boolean;
  auto_refresh_last_run_at: string | null;
  auto_refresh_last_summary: string;
  tiles: DashboardTile[];
}

export interface ListDashboardsResponse {
  dashboards: DashboardSummary[];
}

export interface CreateDashboardResponse {
  code: string;
  title: string;
}

export interface SaveAnswerResponse {
  dashboard_code: string;
  dashboard_title: string;
  tile_position: number;
  review_verdict: ReviewVerdict;
}

export interface RefreshTileResponse {
  tile: DashboardTile;
}

export interface RemoveTileResponse {
  removed: boolean;
  remaining?: number;
}

/* ── Phase 4b: shares ─────────────────────────────────────────── */

export interface DashboardTileShare {
  token: string;
  tile_position: number;
  created_by: string;
  created_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  access_count: number;
  last_accessed_at: string | null;
  public_url: string;
  is_live: boolean;
}

export interface CreateShareResponse {
  token: string;
  public_url: string;
  created_at: string | null;
}

export interface ListSharesResponse {
  shares: DashboardTileShare[];
}

export interface SharedTilePayload {
  token: string;
  dashboard: {
    code: string;
    title: string;
    owner_user: string;
  };
  tile: DashboardTile;
  created_at: string | null;
}

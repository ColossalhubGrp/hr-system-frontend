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

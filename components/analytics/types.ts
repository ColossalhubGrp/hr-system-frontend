/**
 * Shared type definitions for the analytics conversation UI. Mirrors
 * the Frappe endpoint's response shape so a single `analyze` payload
 * flows through all the components without re-typing.
 */

export type VizType =
  | "kpi_tile"
  | "bar"
  | "line"
  | "donut"
  | "grouped_bar"
  | "stacked_line"
  | "table";

export type MetricFormat = "integer" | "decimal" | "currency" | "percentage" | "duration_days";

export interface MetricMeta {
  code: string;
  name: string;
  unit: string;
  format: MetricFormat | string;
  /** True when the metric can be time-shifted for compare-vs-prior mode. */
  supports_compare?: boolean;
}

export type CompareMode = "previous_period" | "previous_year";

export interface CompareRow {
  key: string;
  current: number;
  prior: number;
  delta_pct: number | null;
}

export interface CompareScalar {
  current: number;
  prior: number;
  delta_pct: number | null;
}

export interface CompareData {
  mode: CompareMode;
  prior_time_range: { start: string; end: string };
  rows: CompareRow[];
  scalar: CompareScalar | null;
}

export interface AnalyzeData {
  columns: string[];
  rows: Record<string, unknown>[];
  row_count: number;
  metric: MetricMeta;
  compare?: CompareData | null;
}

export interface VizSpec {
  viz_type: VizType | string;
  value_field: string;
  category_field: string | null;
  time_field: string | null;
  series_field: string | null;
  value_label: string;
  category_label: string | null;
  hint: string;
}

export interface Followup {
  intent: "drill_down" | "compare" | "trend" | "root_cause" | "related" | string;
  question: string;
}

export interface Clarification {
  question: string;
  options: { label: string; question: string }[];
}

/**
 * One (plan, data, viz) triple in a multi-metric answer. The combo
 * chart renderer aligns two of these on their shared dimension.
 */
export interface MultiSlice {
  plan: unknown;
  data: AnalyzeData;
  viz: VizSpec;
}

export interface MultiPayload {
  slices: MultiSlice[];
}

export interface AnalyzeResponse {
  question: string;
  plan: unknown | null;
  refused: boolean;
  refusal_reason: string | null;
  clarification: Clarification | null;
  data: AnalyzeData | null;
  viz: VizSpec | null;
  multi: MultiPayload | null;
  narrative: string | null;
  followups: Followup[];
  audit_log_id: string;
  stage_latencies: Record<string, number>;
  total_latency_ms: number;
  error: string | null;
}

export type Turn =
  | { role: "user"; text: string }
  | {
      role: "assistant";
      question: string;
      refused: boolean;
      refusal_reason: string | null;
      clarification: Clarification | null;
      narrative: string | null;
      data: AnalyzeData | null;
      viz: VizSpec | null;
      multi: MultiPayload | null;
      followups: Followup[];
      plan: unknown | null;
      audit_log_id: string;
      total_latency_ms: number;
      stage_latencies: Record<string, number>;
    };

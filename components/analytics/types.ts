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
}

export interface AnalyzeData {
  columns: string[];
  rows: Record<string, unknown>[];
  row_count: number;
  metric: MetricMeta;
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

export interface AnalyzeResponse {
  question: string;
  plan: unknown | null;
  refused: boolean;
  refusal_reason: string | null;
  data: AnalyzeData | null;
  viz: VizSpec | null;
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
      narrative: string | null;
      data: AnalyzeData | null;
      viz: VizSpec | null;
      followups: Followup[];
      plan: unknown | null;
      audit_log_id: string;
      total_latency_ms: number;
      stage_latencies: Record<string, number>;
    };

/**
 * Shape definitions for the Semantics editor. Mirrors the Python
 * endpoints in colossal_bi.bi_analytics.api.semantics — deliberately
 * 1:1 so a backend change surfaces here as a TS error rather than
 * a silent runtime skew.
 */

export type OverrideStatus =
  | "Candidate"
  | "Under Review"
  | "Published"
  | "Rejected"
  | "Superseded";

export interface SemanticMetric {
  code: string;
  title: string;
  description: string;
  computation_type: string;
  format: string;
  unit: string;
  dimension_count: number;
  has_override: boolean;
  override_status: OverrideStatus | null;
  override_version: number | null;
}

export interface SemanticDomain {
  code: string;
  title: string;
  description: string;
  icon: string;
  metrics: SemanticMetric[];
}

export interface SemanticListResponse {
  active_model: string | null;
  model_chain: string[];
  domains: SemanticDomain[];
  editable: boolean;
}

export interface FormulaVersion {
  name: string;
  owner_model: string;
  override_kind: string;
  status: OverrideStatus | string;
  version: number;
  expression: string | null;
  custom_sql: string | null;
  source_field: string | null;
  aggregation: string | null;
  aggregation_field: string | null;
  change_reason: string;
  created_by_user: string;
  reviewed_by: string | null;
  effective_date: string | null;
  rejection_reason: string | null;
  has_assumptions: boolean;
  assumption_notes: string;
  modified: string | null;
  is_active: boolean;
  can_transition: boolean;
}

export type RelationshipConfidence =
  | "Link"
  | "Heuristic Pending"
  | "Approved"
  | "Rejected";

export interface SemanticRelationship {
  name: string;
  code: string;
  from_doctype: string;
  from_field: string;
  from_field_type: string;
  to_doctype: string;
  to_field: string;
  confidence: RelationshipConfidence | string;
  reason: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejected_reason: string | null;
  modified: string | null;
}

export interface RelationshipListResponse {
  relationships: SemanticRelationship[];
  counts: {
    Link: number;
    "Heuristic Pending": number;
    Approved: number;
    Rejected: number;
    total: number;
  };
  editable: boolean;
}

/**
 * Data Source.source_type values the backend registry supports.
 * Kept as a string union rather than an enum so Frappe adding a
 * new source_type (via patch) doesn't need a coordinated frontend
 * release — unknown values still render, they just get the fallback
 * icon.
 */
export type DataSourceType =
  | "frappe_doctype"
  | "csv_upload"
  | "postgres"
  | "mysql"
  | "sqlserver"
  | "bigquery"
  | "snowflake"
  | "redshift"
  | "dbt_manifest"
  | string;

export interface DatasetRow {
  name: string;
  code: string;
  title: string;
  data_source: string;
  /**
   * Phase 2.6a: joined-in from Data Source so the card badge can
   * distinguish CSV from Postgres from a future connector without
   * a per-card round-trip. Null when the Data Source row is missing
   * (should not happen — Dataset.data_source is a Link field).
   */
  source_type: DataSourceType | null;
  status: "Active" | "Deprecated" | "Failed" | string;
  source_table: string | null;
  source_doctype: string | null;
  row_count: number | null;
  last_profiled_at: string | null;
  description: string;
  modified: string | null;
}

export interface DatasetListResponse {
  datasets: DatasetRow[];
  counts_by_source: Record<string, number>;
  editable: boolean;
}

export interface IngestedColumn {
  original_name: string;
  safe_name: string;
  sql_type: string;
  inferred_kind: "int" | "float" | "date" | "bool" | "text" | string;
  nullable: boolean;
  sample_values: string[];
}

export interface IngestCsvResponse {
  dataset_code: string;
  data_source: string;
  physical_table: string;
  row_count: number;
  columns: IngestedColumn[];
  sample_rows: Record<string, unknown>[];
  warnings: string[];
}

export interface DatasetColumn {
  name: string;
  sql_type: string;
  nullable: boolean;
  is_numeric: boolean;
}

export interface DatasetColumnsResponse {
  dataset_code: string;
  physical_table: string;
  columns: DatasetColumn[];
  metrics: {
    name: string;
    code: string;
    title: string;
    custom_sql: string;
    format: string;
    unit: string;
  }[];
  editable: boolean;
}

export interface CreatedMetric {
  metric_code: string;
  title: string;
  sql: string;
  aggregation: string;
  column: string;
  dataset_code: string;
  physical_table: string;
}

export interface SemanticMetricDetail {
  code: string;
  title: string;
  domain: string;
  description: string;
  unit: string;
  format: string;
  precision: number;
  higher_is_better: boolean;
  dimensions: {
    code: string;
    required: boolean;
    default_slice: boolean;
    name: string;
  }[];
  canonical: {
    computation_type: string | null;
    source_doctype: string | null;
    aggregation: string | null;
    aggregation_field: string | null;
    formula: string | null;
    custom_sql: string | null;
  };
  active: {
    computation_type: string | null;
    source_doctype: string | null;
    aggregation: string | null;
    aggregation_field: string | null;
    formula: string | null;
    custom_sql: string | null;
    served_by_override: boolean;
  };
  versions: FormulaVersion[];
  active_model: string | null;
  model_chain: string[];
  editable: boolean;
}

/* ── Phase 2.6a: external Data Sources ────────────────────────────── */

/**
 * Health-check response mirrored from `HealthReport` in
 * connectors/base.py. `server_version` and `latency_ms` are optional
 * because the connector Protocol allows either to be null (e.g. a
 * connector that only reports alive/not without measuring latency).
 */
export interface HealthReport {
  ok: boolean;
  message: string;
  latency_ms?: number | null;
  server_version?: string | null;
}

export interface CreateExternalResponse {
  code: string;
  source_type: DataSourceType;
  health: HealthReport;
}

export interface TestConnectionResponse extends HealthReport {
  code: string;
}

export interface ExternalTableInfo {
  name: string;
  description: string;
  row_count: number | null;
}

export interface ListTablesResponse {
  code: string;
  tables: ExternalTableInfo[];
}

/**
 * Data Source row returned by list_external_sources — a subset of
 * the DocType, safe to render in the "Connected databases" panel
 * without exposing the credentials Password field.
 */
export interface ExternalSourceRow {
  name: string;
  code: string;
  title: string;
  source_type: DataSourceType;
  status: "Active" | "Inactive" | "Error" | string;
  description: string;
  last_connected_at: string | null;
  last_health_message: string | null;
  modified: string | null;
}

export interface ExternalSourcesResponse {
  sources: ExternalSourceRow[];
  supported_types: DataSourceType[];
  editable: boolean;
}

export interface CreateDatasetFromTableResponse {
  dataset_code: string;
  data_source: string;
  table: string;
  columns: Array<{
    name: string;
    data_type: string;
    nullable: boolean;
    is_primary: boolean;
  }>;
}

/* ── Phase 2.8: dbt manifest import ───────────────────────────────── */

export interface DbtModelPreview {
  unique_id: string;
  name: string;
  qualified_name: string;
  description: string;
  column_count: number;
}

export interface DbtMetricPreview {
  unique_id: string;
  name: string;
  label: string;
  description: string;
  /** "simple" is MVP-supported; ratio/cumulative/derived/legacy aren't. */
  type: "simple" | "ratio" | "cumulative" | "derived" | "legacy" | string;
  /** True when the backend can generate SQL for this metric today. */
  supported: boolean;
  measure_name: string | null;
  measure_agg: string | null;
  measure_expr: string | null;
  model_unique_id: string | null;
  model_qualified_name: string | null;
}

export interface DbtPreviewResponse {
  project_name: string;
  dbt_version: string;
  adapter_type: string;
  generated_at: string;
  counts: {
    models: number;
    metrics: number;
    semantic_models: number;
    supported_metrics: number;
  };
  models: DbtModelPreview[];
  metrics: DbtMetricPreview[];
  warnings: string[];
  warnings_truncated: boolean;
}

export interface DbtImportResponse {
  project_name: string;
  data_source: string;
  datasets_created: string[];
  metrics_created: string[];
  metrics_skipped: Array<{ unique_id: string; reason: string }>;
  warnings: string[];
}

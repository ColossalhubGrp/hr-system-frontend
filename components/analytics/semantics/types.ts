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

export interface DatasetRow {
  name: string;
  code: string;
  title: string;
  data_source: string;
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

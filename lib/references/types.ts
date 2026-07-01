/**
 * Shared types for the bench-wide reference-data framework. Client-safe;
 * never imports server-only code.
 */

export type ReferenceMasterMeta = {
  /** Backend DocType name (also the master "id" used in API calls). */
  name: string;
  /** Module the master lives in (e.g. "CRM", "Recruitment App"). */
  module: string;
  /** Human description set when the master was created. */
  description: string | null;
  /** Current active + inactive total row count. */
  rowCount: number;
};

export type ReferenceMasterField = {
  fieldname: string;
  label: string;
  fieldtype: string;
  options: string | null;
  reqd: boolean;
};

export type ReferenceMasterDescribe = ReferenceMasterMeta & {
  fields: ReferenceMasterField[];
};

export type ReferenceRow = {
  name: string;
  title: string;
  code?: string | null;
  description?: string | null;
  is_active: 0 | 1 | boolean;
  sort_order?: number | null;
  company?: string | null;
};

export type ListValuesResponse = {
  rows: ReferenceRow[];
  total: number;
};

export type ListValuesOptions = {
  search?: string;
  limitStart?: number;
  limitPageLength?: number;
  includeInactive?: boolean;
  company?: string;
};

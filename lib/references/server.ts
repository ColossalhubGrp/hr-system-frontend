import "server-only";
import { frappeCall } from "@/lib/frappe/client";
import type {
  ListValuesOptions,
  ListValuesResponse,
  ReferenceMasterDescribe,
  ReferenceMasterMeta,
  ReferenceRow,
} from "./types";

/**
 * Server-side facade over tenant_manager.reference_data.api.references.*.
 *
 * Use from Server Components, Server Actions, and other server-only code.
 * For client components, use `useReferenceData` (lib/references/use-reference-data.ts)
 * which hits the dedicated /api/references endpoint instead.
 *
 * All calls forward the user's sid (`as: "user"`), so the API's
 * `frappe.has_permission(master, "read")` checks see the actual caller.
 */

const METHOD = "tenant_manager.reference_data.api.references";

export async function listMasters(): Promise<ReferenceMasterMeta[]> {
  const res = await frappeCall<{ masters: RawMaster[] }>({
    method: `${METHOD}.list_masters`,
    args: {},
    as: "user",
  });
  return (res.masters ?? []).map(toMeta);
}

export async function describeMaster(
  master: string,
): Promise<ReferenceMasterDescribe | null> {
  try {
    const raw = await frappeCall<RawMasterDescribe>({
      method: `${METHOD}.describe`,
      args: { master },
      as: "user",
    });
    return {
      ...toMeta(raw),
      fields: (raw.fields ?? []).map((f) => ({
        fieldname: f.fieldname,
        label: f.label,
        fieldtype: f.fieldtype,
        options: f.options ?? null,
        reqd: Boolean(f.reqd),
      })),
    };
  } catch {
    return null;
  }
}

export async function listValues(
  master: string,
  opts: ListValuesOptions = {},
): Promise<ListValuesResponse> {
  const res = await frappeCall<ListValuesResponse>({
    method: `${METHOD}.list_values`,
    args: {
      master,
      search: opts.search,
      limit_start: opts.limitStart ?? 0,
      limit_page_length: opts.limitPageLength ?? 50,
      include_inactive: opts.includeInactive ?? false,
      company: opts.company,
    },
    as: "user",
  });
  return {
    rows: (res.rows ?? []).map(normalize),
    total: res.total ?? 0,
  };
}

export async function upsertValue(
  master: string,
  title: string,
  payload: Partial<ReferenceRow> = {},
): Promise<ReferenceRow> {
  const res = await frappeCall<ReferenceRow>({
    method: `${METHOD}.upsert_value`,
    args: { master, title, payload },
    as: "user",
    verb: "POST",
  });
  return normalize(res);
}

export async function deactivate(master: string, name: string): Promise<void> {
  await frappeCall({
    method: `${METHOD}.deactivate`,
    args: { master, name },
    as: "user",
    verb: "POST",
  });
}

export async function myCompany(): Promise<string | null> {
  try {
    const res = await frappeCall<{ company: string | null }>({
      method: `${METHOD}.my_company`,
      args: {},
      as: "user",
    });
    return res.company ?? null;
  } catch {
    return null;
  }
}

export type AvailableModule = { name: string; app_name: string };

export async function listAvailableModules(): Promise<AvailableModule[]> {
  try {
    const res = await frappeCall<{ modules: AvailableModule[] }>({
      method: `${METHOD}.list_available_modules`,
      args: {},
      as: "user",
    });
    return res.modules ?? [];
  } catch {
    return [];
  }
}

export type CreateMasterInput = {
  name: string;
  module?: string;
  companyScoped?: boolean;
  description?: string;
};

export async function createMaster(input: CreateMasterInput): Promise<string> {
  const res = await frappeCall<{ name: string }>({
    method: `${METHOD}.create_master`,
    args: {
      name: input.name,
      module: input.module ?? "Tenant Manager",
      company_scoped: input.companyScoped ?? false,
      description: input.description ?? "",
    },
    as: "user",
    verb: "POST",
  });
  return res.name;
}

// ---------------------------------------------------------------------------
// Raw → typed conversion
// ---------------------------------------------------------------------------

type RawMaster = {
  name: string;
  module: string;
  description: string | null;
  row_count: number;
};

type RawMasterDescribe = RawMaster & {
  fields: Array<{
    fieldname: string;
    label: string;
    fieldtype: string;
    options: string | null;
    reqd: boolean | 0 | 1;
  }>;
};

function toMeta(r: RawMaster): ReferenceMasterMeta {
  return {
    name: r.name,
    module: r.module,
    description: r.description,
    rowCount: r.row_count ?? 0,
  };
}

function normalize(r: ReferenceRow): ReferenceRow {
  return {
    ...r,
    is_active: r.is_active === 1 || r.is_active === true ? 1 : 0,
  };
}

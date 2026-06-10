import "server-only";
import { frappeCall } from "./client";

/**
 * The five lifecycle doctypes Frappe HR ships. Each shares a common shape
 * (employee link + status), so we wrap them behind a single `kind` knob.
 *
 * The `dateField` differs per doctype — we use it for the "when" column and
 * for sorting by recency.
 */
export type LifecycleKind =
  | "onboarding"
  | "separation"
  | "transfer"
  | "promotion"
  | "grievance";

type KindMeta = {
  label: string;
  doctype: string;
  dateField: string;
  statuses: string[];
};

const META: Record<LifecycleKind, KindMeta> = {
  onboarding: {
    label: "Onboarding",
    doctype: "Employee Onboarding",
    dateField: "boarding_begins_on",
    statuses: ["Pending", "In Process", "Completed"],
  },
  separation: {
    label: "Separation",
    doctype: "Employee Separation",
    // Real field name on Frappe HR's Employee Separation doctype.
    dateField: "separation_begins_on",
    statuses: ["Pending", "In Process", "Completed"],
  },
  transfer: {
    label: "Transfer",
    doctype: "Employee Transfer",
    dateField: "transfer_date",
    statuses: [],
  },
  promotion: {
    label: "Promotion",
    doctype: "Employee Promotion",
    dateField: "promotion_date",
    statuses: [],
  },
  grievance: {
    label: "Grievance",
    doctype: "Employee Grievance",
    // Frappe HR uses just `date` on Employee Grievance, not the more obvious
    // `grievance_raised_date`.
    dateField: "date",
    statuses: ["Open", "Investigated", "Resolved", "Invalid"],
  },
};

export type LifecycleRow = {
  id: string;
  employee: string;
  employeeName: string | null;
  when: string | null;
  status: string;
  docstatus: 0 | 1 | 2;
  details: string | null;
};

export type LifecycleListResult = {
  kind: LifecycleKind;
  label: string;
  rows: LifecycleRow[];
  total: number;
  statuses: string[];
};

const FIELDS_BY_KIND: Record<LifecycleKind, string[]> = {
  onboarding: [
    "name",
    "employee",
    "employee_name",
    "boarding_begins_on",
    "boarding_status",
    "docstatus",
    "designation",
  ],
  separation: [
    "name",
    "employee",
    "employee_name",
    // Trimmed: Frappe v15 won't let us project `boarding_status` or
    // `designation` in list view for this doctype.
    "separation_begins_on",
    "docstatus",
  ],
  transfer: [
    "name",
    "employee",
    "employee_name",
    "transfer_date",
    "docstatus",
    "new_company",
  ],
  promotion: [
    "name",
    "employee",
    "employee_name",
    "promotion_date",
    "docstatus",
    "company",
  ],
  grievance: [
    "name",
    "raised_by",
    // No employee_name on grievance — we don't join.
    "date",
    "status",
    "docstatus",
    "grievance_type",
  ],
};

export async function listLifecycle(
  kind: LifecycleKind,
  opts: { status?: string; page?: number; pageSize?: number } = {},
): Promise<LifecycleListResult> {
  const meta = META[kind];
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, opts.pageSize ?? 25));

  const filters: Array<[string, string, string]> = [];
  if (opts.status) {
    if (kind === "onboarding") {
      filters.push(["boarding_status", "=", opts.status]);
    } else if (kind === "separation") {
      // Onboarding uses `boarding_status`, Separation uses `status`.
      filters.push(["status", "=", opts.status]);
    } else if (kind === "grievance") {
      filters.push(["status", "=", opts.status]);
    }
  }

  let rowsRaw: Array<Record<string, unknown>> = [];
  let totalRaw = 0;
  try {
    [rowsRaw, totalRaw] = await Promise.all([
      frappeCall<Array<Record<string, unknown>>>({
        method: "frappe.client.get_list",
        args: {
          doctype: meta.doctype,
          fields: FIELDS_BY_KIND[kind],
          filters: JSON.stringify(filters),
          order_by: `${meta.dateField} desc`,
          limit_start: (page - 1) * pageSize,
          limit_page_length: pageSize,
        },
        as: "user",
      }),
      frappeCall<number>({
        method: "frappe.client.get_count",
        args: { doctype: meta.doctype, filters: JSON.stringify(filters) },
        as: "user",
      }),
    ]);
  } catch {
    /* doctype may not exist on older Frappe HR builds */
  }

  const rows = rowsRaw.map<LifecycleRow>((r) => ({
    id: String(r.name),
    // Grievance keys its employee on `raised_by`, not `employee`.
    employee: String(
      (kind === "grievance" ? r.raised_by : r.employee) ?? "",
    ),
    employeeName: (r.employee_name as string | null) ?? null,
    when: (r[meta.dateField] as string | null) ?? null,
    status: pickStatus(kind, r),
    docstatus: (r.docstatus as 0 | 1 | 2) ?? 0,
    details: pickDetails(kind, r),
  }));

  return {
    kind,
    label: meta.label,
    rows,
    total: Number(totalRaw ?? 0),
    statuses: meta.statuses,
  };
}

function pickStatus(kind: LifecycleKind, r: Record<string, unknown>): string {
  switch (kind) {
    case "onboarding":
      return (r.boarding_status as string) ?? "—";
    case "separation":
    case "grievance":
      return (r.status as string) ?? "—";
    case "transfer":
    case "promotion":
      return Number(r.docstatus) === 1 ? "Submitted" : "Draft";
  }
}

function pickDetails(
  kind: LifecycleKind,
  r: Record<string, unknown>,
): string | null {
  switch (kind) {
    case "onboarding":
      return (r.designation as string | null) ?? null;
    case "separation":
      // Designation not projectable on Separation list view.
      return null;
    case "transfer":
      return (r.new_company as string | null) ?? null;
    case "promotion":
      return (r.company as string | null) ?? null;
    case "grievance":
      return (r.grievance_type as string | null) ?? null;
  }
}

export type LifecycleSummary = Record<
  LifecycleKind,
  { total: number; latest: LifecycleRow | null }
>;

export async function fetchLifecycleSummary(): Promise<LifecycleSummary> {
  const kinds: LifecycleKind[] = [
    "onboarding",
    "separation",
    "transfer",
    "promotion",
    "grievance",
  ];
  const entries = await Promise.all(
    kinds.map(async (k) => {
      const r = await listLifecycle(k, { pageSize: 1 });
      return [k, { total: r.total, latest: r.rows[0] ?? null }] as const;
    }),
  );
  return Object.fromEntries(entries) as LifecycleSummary;
}

export const LIFECYCLE_META = META;

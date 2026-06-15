import "server-only";
import { frappeCall } from "./client";

/**
 * Overtime Rule Engine — Next.js data layer.
 *
 * Three doctypes:
 *   Overtime Rule           — threshold + calculation + validity
 *   Overtime Rule Tier      — tiered multiplier ladder (child)
 *   Overtime Rule Assignment — binds a rule to Global / Country / Department
 *                              / Employment Type / Employee
 *
 * The resolver lives server-side in `recruitment_app.api.overtime`. This
 * module is thin CRUD + a `dryRun()` helper that calls the resolver.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ThresholdType =
  | "Daily Hours"
  | "Weekly Hours"
  | "Consecutive Days"
  | "Shift Based";

export type CalculationMethod = "Multiplier" | "Fixed Amount" | "Tiered";

export type DayType = "All Days" | "Weekday" | "Weekend" | "Holiday Only";

export type AppliesTo =
  | "Global"
  | "Country"
  | "Department"
  | "Employment Type"
  | "Employee";

export const APPLIES_TO_OPTIONS: AppliesTo[] = [
  "Global",
  "Country",
  "Department",
  "Employment Type",
  "Employee",
];

export type OvertimeRuleRow = {
  id: string;
  ruleName: string;
  isActive: boolean;
  thresholdType: ThresholdType;
  thresholdValue: number;
  calculationMethod: CalculationMethod;
  validFrom: string | null;
  validTo: string | null;
};

export type OvertimeRuleTier = {
  fromMinute: number;
  toMinute: number | null;
  rateMultiplier: number;
  description: string | null;
};

export type OvertimeRuleFull = OvertimeRuleRow & {
  description: string | null;
  thresholdValue: number;
  graceMinutes: number;
  dayType: DayType;
  multiplierRate: number;
  fixedAmount: number;
  weekendMultiplier: number;
  holidayMultiplier: number;
  tiers: OvertimeRuleTier[];
  notes: string | null;
};

export type OvertimeAssignmentRow = {
  id: string;
  rule: string;
  ruleName: string | null;
  appliesTo: AppliesTo;
  target: string | null;
  priority: number;
  validFrom: string | null;
  validTo: string | null;
};

// ---------------------------------------------------------------------------
// Rule reads
// ---------------------------------------------------------------------------

export async function listOvertimeRules(): Promise<OvertimeRuleRow[]> {
  type Row = {
    name: string;
    rule_name: string;
    is_active: 0 | 1;
    threshold_type: ThresholdType;
    threshold_value: number;
    calculation_method: CalculationMethod;
    valid_from: string | null;
    valid_to: string | null;
  };
  const rows = await frappeCall<Row[]>({
    method: "frappe.client.get_list",
    args: {
      doctype: "Overtime Rule",
      fields: [
        "name",
        "rule_name",
        "is_active",
        "threshold_type",
        "threshold_value",
        "calculation_method",
        "valid_from",
        "valid_to",
      ],
      order_by: "is_active desc, valid_from desc",
      limit_page_length: 200,
    },
    as: "user",
  }).catch(() => [] as Row[]);
  return rows.map((r) => ({
    id: r.name,
    ruleName: r.rule_name,
    isActive: Boolean(r.is_active),
    thresholdType: r.threshold_type,
    thresholdValue: Number(r.threshold_value ?? 0),
    calculationMethod: r.calculation_method,
    validFrom: r.valid_from,
    validTo: r.valid_to,
  }));
}

export async function getOvertimeRule(id: string): Promise<OvertimeRuleFull | null> {
  try {
    type Raw = {
      name: string;
      rule_name: string;
      is_active: 0 | 1;
      description: string | null;
      threshold_type: ThresholdType;
      threshold_value: number;
      grace_minutes: number;
      day_type: DayType;
      calculation_method: CalculationMethod;
      multiplier_rate: number;
      fixed_amount: number;
      weekend_multiplier: number;
      holiday_multiplier: number;
      valid_from: string | null;
      valid_to: string | null;
      tiered_rates?: Array<{
        from_minute: number;
        to_minute: number | null;
        rate_multiplier: number;
        description: string | null;
      }>;
      notes: string | null;
    };
    const doc = await frappeCall<Raw>({
      method: "frappe.client.get",
      args: { doctype: "Overtime Rule", name: id },
      as: "user",
    });
    return {
      id: doc.name,
      ruleName: doc.rule_name,
      isActive: Boolean(doc.is_active),
      description: doc.description,
      thresholdType: doc.threshold_type,
      thresholdValue: Number(doc.threshold_value ?? 0),
      graceMinutes: Number(doc.grace_minutes ?? 0),
      dayType: doc.day_type,
      calculationMethod: doc.calculation_method,
      multiplierRate: Number(doc.multiplier_rate ?? 1),
      fixedAmount: Number(doc.fixed_amount ?? 0),
      weekendMultiplier: Number(doc.weekend_multiplier ?? 1),
      holidayMultiplier: Number(doc.holiday_multiplier ?? 1),
      validFrom: doc.valid_from,
      validTo: doc.valid_to,
      tiers: (doc.tiered_rates ?? []).map((t) => ({
        fromMinute: Number(t.from_minute ?? 0),
        toMinute: t.to_minute === null ? null : Number(t.to_minute),
        rateMultiplier: Number(t.rate_multiplier ?? 1),
        description: t.description,
      })),
      notes: doc.notes,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Rule writes
// ---------------------------------------------------------------------------

export type OvertimeRuleInput = {
  rule_name: string;
  is_active: boolean;
  description?: string;
  valid_from: string; // YYYY-MM-DD
  valid_to?: string;
  threshold_type: ThresholdType;
  threshold_value: number;
  grace_minutes: number;
  day_type: DayType;
  calculation_method: CalculationMethod;
  multiplier_rate?: number;
  fixed_amount?: number;
  weekend_multiplier: number;
  holiday_multiplier: number;
  tiered_rates?: Array<{
    from_minute: number;
    to_minute?: number;
    rate_multiplier: number;
    description?: string;
  }>;
  notes?: string;
};

export async function createOvertimeRule(input: OvertimeRuleInput): Promise<string> {
  const { tiered_rates, ...scalar } = input;
  const doc: Record<string, unknown> = {
    doctype: "Overtime Rule",
    ...compact(scalar),
    is_active: input.is_active ? 1 : 0,
  };
  if (tiered_rates && tiered_rates.length > 0) {
    doc.tiered_rates = tiered_rates.map((t) => compact(t));
  }
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    verb: "POST",
    args: { doc },
    as: "user",
  });
  return saved.name;
}

export async function updateOvertimeRule(
  id: string,
  input: OvertimeRuleInput,
): Promise<void> {
  const { tiered_rates, ...scalar } = input;
  // Frappe child-table writes need a full doc save. Fetch → mutate → save.
  const doc = await frappeCall<Record<string, unknown>>({
    method: "frappe.client.get",
    args: { doctype: "Overtime Rule", name: id },
    as: "user",
  });
  Object.assign(doc, compact(scalar));
  doc.is_active = input.is_active ? 1 : 0;
  doc.tiered_rates = (tiered_rates ?? []).map((t) => compact(t));
  await frappeCall<unknown>({
    method: "frappe.client.save",
    verb: "POST",
    args: { doc },
    as: "user",
  });
}

export async function deleteOvertimeRule(id: string): Promise<void> {
  await frappeCall<unknown>({
    method: "frappe.client.delete",
    verb: "POST",
    args: { doctype: "Overtime Rule", name: id },
    as: "user",
  });
}

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------

export async function listAssignmentsForRule(
  ruleId: string,
): Promise<OvertimeAssignmentRow[]> {
  type Row = {
    name: string;
    rule: string;
    applies_to: AppliesTo;
    country: string | null;
    department: string | null;
    employment_type: string | null;
    employee: string | null;
    priority: number;
    valid_from: string | null;
    valid_to: string | null;
  };
  const rows = await frappeCall<Row[]>({
    method: "frappe.client.get_list",
    args: {
      doctype: "Overtime Rule Assignment",
      fields: [
        "name", "rule", "applies_to",
        "country", "department", "employment_type", "employee",
        "priority", "valid_from", "valid_to",
      ],
      filters: JSON.stringify([["rule", "=", ruleId]]),
      order_by: "priority desc, modified desc",
      limit_page_length: 200,
    },
    as: "user",
  }).catch(() => [] as Row[]);
  return rows.map((r) => ({
    id: r.name,
    rule: r.rule,
    ruleName: null,
    appliesTo: r.applies_to,
    target:
      r.applies_to === "Global"
        ? null
        : r.applies_to === "Country"
          ? r.country
          : r.applies_to === "Department"
            ? r.department
            : r.applies_to === "Employment Type"
              ? r.employment_type
              : r.employee,
    priority: Number(r.priority ?? 0),
    validFrom: r.valid_from,
    validTo: r.valid_to,
  }));
}

export type OvertimeAssignmentInput = {
  rule: string;
  applies_to: AppliesTo;
  country?: string;
  department?: string;
  employment_type?: string;
  employee?: string;
  priority: number;
  valid_from?: string;
  valid_to?: string;
  notes?: string;
};

export async function createOvertimeAssignment(
  input: OvertimeAssignmentInput,
): Promise<string> {
  const doc = { doctype: "Overtime Rule Assignment", ...compact(input) };
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    verb: "POST",
    args: { doc },
    as: "user",
  });
  return saved.name;
}

export async function deleteOvertimeAssignment(id: string): Promise<void> {
  await frappeCall<unknown>({
    method: "frappe.client.delete",
    verb: "POST",
    args: { doctype: "Overtime Rule Assignment", name: id },
    as: "user",
  });
}

// ---------------------------------------------------------------------------
// Dry-run helper for the test panel
// ---------------------------------------------------------------------------

export type DryRunResult = {
  ok: boolean;
  scope: AppliesTo | null;
  reason: string;
  rule: { name: string; rule_name: string } | null;
  date: string;
};

export async function dryRunOvertime(
  employee: string,
  date: string,
): Promise<DryRunResult> {
  type Raw = {
    ok: boolean;
    scope: AppliesTo | null;
    reason: string;
    rule: { name: string; rule_name: string } | null;
    date: string;
  };
  return await frappeCall<Raw>({
    method: "recruitment_app.api.overtime.dry_run_for_employee",
    args: { employee, date },
    as: "user",
  }).catch(() => ({
    ok: false,
    scope: null,
    reason: "failed to call resolver",
    rule: null,
    date,
  })) as DryRunResult;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function compact<T extends Record<string, unknown>>(o: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    out[k] = v;
  }
  return out;
}

/**
 * Shared types for the per-company subscription framework. Client-safe;
 * never imports server-only code.
 */

export type AppCode =
  | "core"
  | "hr"
  | "recruitment"
  | "payroll"
  | "loans"
  | "analytics"
  | "audit"
  | "data_steward"
  | "erpnext_modules";

export type AppDefinition = {
  code: string;
  name: string;
  description: string;
  always_on: boolean;
  requires: string[];
  nav_prefixes: string[];
};

export type SubscribedApp = AppDefinition & {
  enabled: boolean;
  valid_until: string | null;
};

export type CompanySubscription = {
  company: string | null;
  plan_name: string | null;
  is_active: 0 | 1 | boolean;
  valid_until: string | null;
  apps: SubscribedApp[];
  /** Convenience lookup: `has["hr"]` → true/false. */
  has: Record<string, boolean>;
  /** True when no record existed yet — defaulted to all-enabled. */
  auto_seeded?: boolean;
};

export type SubscriptionRow = {
  company: string;
  plan_name: string | null;
  is_active: 0 | 1 | boolean;
  valid_until: string | null;
  apps_enabled: number;
  apps_total: number;
  auto_seeded: boolean;
};

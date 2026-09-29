// Client-safe constants + types for the payroll dashboard period filter.
// Kept out of dashboard.ts so client components can import them without
// pulling in `server-only` transitively.

export type PeriodKey = "mtd" | "last_month" | "qtd" | "ytd" | "l6m" | "l12m";

export const PERIOD_OPTIONS: Array<{ value: PeriodKey; label: string }> = [
  { value: "mtd",        label: "Month to date" },
  { value: "last_month", label: "Last month" },
  { value: "qtd",        label: "Quarter to date" },
  { value: "ytd",        label: "Year to date" },
  { value: "l6m",        label: "Last 6 months" },
  { value: "l12m",       label: "Last 12 months" },
];

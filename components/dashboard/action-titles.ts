/**
 * Action titles for dashboard chart cards — per the product owner's
 * Storytelling-with-Data brief (Lesson 5: "Action titles. Not topic
 * titles."). Each helper turns the chart's own data into the takeaway
 * sentence; the old topic title moves into the card's meta slot.
 *
 * Pure functions, server-safe.
 */

import type {
  BucketPoint,
  DepartmentSlice,
  FlowPoint,
  GenderSlice,
  KpiPoint,
} from "@/lib/frappe/queries";

const fmt = new Intl.NumberFormat("en");

export function headcountTrendTitle(points: KpiPoint[]): string {
  if (points.length < 2) return "Employee numbers";
  const first = points[0].value;
  const last = points[points.length - 1].value;
  const diff = last - first;
  if (diff === 0) return "Headcount has held level over the year";
  const pct = first > 0 ? Math.round((Math.abs(diff) / first) * 100) : null;
  const pctBit = pct && pct >= 1 ? ` (${pct}%)` : "";
  return diff > 0
    ? `Headcount grew by ${fmt.format(diff)}${pctBit} over 12 months`
    : `Headcount fell by ${fmt.format(-diff)}${pctBit} over 12 months`;
}

export function flowTitle(flow: FlowPoint[]): string {
  const hires = flow.reduce((a, p) => a + (p.hires || 0), 0);
  const seps = flow.reduce((a, p) => a + (p.separations || 0), 0);
  if (hires === 0 && seps === 0) return "No joiners or leavers yet";
  if (seps === 0) return `${fmt.format(hires)} hires, no exits in 12 months`;
  if (hires === 0) return `${fmt.format(seps)} exits, no hires in 12 months`;
  if (hires === seps) return "Hires and exits balanced over 12 months";
  const ratio = hires / seps;
  if (hires > seps && ratio >= 1.5) {
    const r = ratio >= 10 ? Math.round(ratio) : Math.round(ratio * 10) / 10;
    return `Hiring outpaced exits ${r} to 1 over 12 months`;
  }
  if (seps > hires && seps / hires >= 1.5) {
    const r = seps / hires >= 10
      ? Math.round(seps / hires)
      : Math.round((seps / hires) * 10) / 10;
    return `Exits outpaced hiring ${r} to 1 over 12 months`;
  }
  const net = hires - seps;
  return net > 0
    ? `Net ${fmt.format(net)} added over 12 months`
    : `Net ${fmt.format(-net)} lost over 12 months`;
}

export function departmentTitle(data: DepartmentSlice[]): string {
  if (data.length === 0) return "Employees by department";
  const top = data.reduce((a, b) => (b.percentage > a.percentage ? b : a));
  const name = shortDept(top.department);
  return `${name} holds ${top.percentage}% of the workforce`;
}

export function ageTitle(buckets: BucketPoint[]): string {
  const top = maxBucket(buckets);
  return top ? `Most employees are aged ${top.label}` : "Age distribution";
}

export function tenureTitle(buckets: BucketPoint[]): string {
  const top = maxBucket(buckets);
  return top
    ? `The largest group has ${top.label} of service`
    : "Tenure distribution";
}

export function genderTitle(slices: GenderSlice[]): string {
  if (slices.length === 0) return "Gender distribution";
  const parts = [...slices]
    .sort((a, b) => b.percentage - a.percentage)
    .map((s) => `${s.percentage}% ${s.label.toLowerCase()}`);
  return `The workforce is ${parts.slice(0, 2).join(", ")}`;
}

export function waterfallTitle(
  hires: number,
  separations: number,
): string {
  const net = hires - separations;
  if (hires === 0 && separations === 0) return "No headcount movement yet";
  const sign = net > 0 ? `grew by ${fmt.format(net)}` : net < 0
    ? `shrank by ${fmt.format(-net)}` : "ended level";
  return `Headcount ${sign}: ${fmt.format(hires)} joined, ${fmt.format(separations)} left`;
}

function maxBucket(buckets: BucketPoint[]): BucketPoint | null {
  const real = buckets.filter((b) => b.count > 0);
  if (real.length === 0) return null;
  return real.reduce((a, b) => (b.count > a.count ? b : a));
}

/** "Warehouse - Rivers Inc" → "Warehouse". */
function shortDept(full: string): string {
  const dash = full.lastIndexOf(" - ");
  return dash > 0 ? full.slice(0, dash) : full;
}

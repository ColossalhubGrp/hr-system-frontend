import { KpiCard } from "./kpi-card";
import { ChartCard } from "./chart-card";
import { DepartmentBarChart } from "./department-bar-chart";
import { GenderDonut } from "./gender-donut";
import type { DashboardSnapshot } from "@/lib/frappe/queries";

type Props = {
  title: string;
  snapshot: DashboardSnapshot;
};

/**
 * The shared layout used by both /dashboard and /hr — same grid, same chrome,
 * different page title. KPI 1 + 4 both render headcount, exactly as the
 * mockup does. Staff cost is shown as `—` until the payroll cube is exposed.
 */
export function DashboardGrid({ title, snapshot }: Props) {
  const headcountFmt = new Intl.NumberFormat("en").format(snapshot.headcount);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ash-900">{title}</h1>
      </header>

      <section
        aria-label="Key metrics"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <KpiCard
          label="Headcount"
          value={headcountFmt}
          trendPct={snapshot.headcountTrendPct}
          spark={snapshot.spark.headcount}
        />
        <KpiCard
          label="Staff Cost to Income"
          value={
            snapshot.staffCostToIncomePct === null
              ? "—"
              : `${snapshot.staffCostToIncomePct}%`
          }
          trendPct={snapshot.staffCostTrendPct}
          trendDirection={
            snapshot.staffCostTrendPct === null
              ? "flat"
              : snapshot.staffCostTrendPct > 0
              ? "down" // a rise in this ratio is *bad* — red
              : "up"
          }
        />
        <KpiCard
          label="Employee Turnover"
          value={`${snapshot.turnoverPct}%`}
          trendPct={snapshot.turnoverTrendPct}
          trendDirection={snapshot.turnoverTrendPct >= 0 ? "down" : "up"}
          spark={snapshot.spark.turnover}
        />
        <KpiCard
          label="Headcount"
          value={headcountFmt}
          trendPct={snapshot.headcountTrendPct}
          spark={snapshot.spark.headcount}
        />
      </section>

      <section
        aria-label="Distributions"
        className="grid grid-cols-1 gap-4 lg:grid-cols-2"
      >
        <ChartCard title="Headcount by Department">
          <DepartmentBarChart data={snapshot.departments} />
        </ChartCard>
        <ChartCard title="Gender Distribution">
          <GenderDonut data={snapshot.gender} />
        </ChartCard>
      </section>

      <section
        aria-label="Distributions, continued"
        className="grid grid-cols-1 gap-4 lg:grid-cols-2"
      >
        <ChartCard title="Headcount by Department">
          <DepartmentBarChart data={snapshot.departments} />
        </ChartCard>
        <ChartCard title="Headcount by Department">
          <DepartmentBarChart data={snapshot.departments} />
        </ChartCard>
      </section>
    </div>
  );
}

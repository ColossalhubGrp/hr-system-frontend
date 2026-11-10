import { KpiCard } from "./kpi-card";
import { ChartCard } from "./chart-card";
import { DepartmentBarChart } from "./department-bar-chart";
import { GenderSplit } from "./gender-split";
import { HeadcountTrendChart } from "./headcount-trend-chart";
import { HeadcountWaterfall } from "./headcount-waterfall";
import { FlowChart } from "./flow-chart";
import { BucketBarChart } from "./bucket-bar-chart";
import {
  ageTitle,
  departmentTitle,
  flowTitle,
  genderTitle,
  headcountTrendTitle,
  tenureTitle,
  waterfallTitle,
} from "./action-titles";
import type { DashboardSnapshot } from "@/lib/frappe/queries";

type Props = {
  title: string;
  snapshot: DashboardSnapshot;
};

/**
 * Shared layout for /dashboard (Overall) and /hr. Four unique KPIs
 * across the top (headcount + hires + separations + turnover) and
 * six charts arranged to tell the workforce story:
 *
 *   Row 1  Headcount by Department  · Gender Distribution
 *   Row 2  Headcount Trend (12mo)   · Hires vs Separations (12mo)
 *   Row 3  Age Distribution          · Tenure Distribution
 *
 * All charts are vertical-bar (or area / donut) by request; the
 * old chart card had been duplicated three times with the same data.
 */
export function DashboardGrid({ title, snapshot }: Props) {
  const fmt = new Intl.NumberFormat("en");
  const headcountFmt = fmt.format(snapshot.headcount);

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
          label="Employees"
          value={headcountFmt}
          trendPct={snapshot.headcountTrendPct}
          spark={snapshot.spark.headcount}
        />
        <KpiCard
          label="New hires"
          value={fmt.format(snapshot.hires12mo)}
          trendPct={null}
          caption="Last 12 months"
        />
        <KpiCard
          label="Separations"
          value={fmt.format(snapshot.separations12mo)}
          trendPct={null}
          caption="Last 12 months"
          trendDirection="down" // red colour semantic — separations are a cost
        />
        <KpiCard
          label="Turnover rate"
          value={`${snapshot.turnoverPct}%`}
          trendPct={snapshot.turnoverTrendPct}
          trendDirection={snapshot.turnoverTrendPct >= 0 ? "down" : "up"}
          spark={snapshot.spark.turnover}
        />
      </section>

      {/* Action titles throughout (product owner's Storytelling-with-
          Data brief): the title is the takeaway, the meta slot carries
          the old topic/scope. */}
      <section
        aria-label="Workforce shape"
        className="grid grid-cols-1 gap-4 lg:grid-cols-2"
      >
        <ChartCard
          title={departmentTitle(snapshot.departments)}
          meta="By department · active only"
        >
          <DepartmentBarChart data={snapshot.departments} />
        </ChartCard>
        <ChartCard title={genderTitle(snapshot.gender)} meta="Gender · active only">
          <GenderSplit data={snapshot.gender} />
        </ChartCard>
      </section>

      <section
        aria-label="Workforce movement"
        className="grid grid-cols-1 gap-4 lg:grid-cols-3"
      >
        <ChartCard
          title={headcountTrendTitle(snapshot.headcountTrend)}
          meta="Employees · end of each month"
        >
          <HeadcountTrendChart data={snapshot.headcountTrend} />
        </ChartCard>
        <ChartCard
          title={flowTitle(snapshot.flow)}
          meta="Hires vs separations · monthly"
        >
          <FlowChart data={snapshot.flow} />
        </ChartCard>
        <ChartCard
          title={waterfallTitle(snapshot.hires12mo, snapshot.separations12mo)}
          meta="Headcount movement · 12 months"
        >
          <HeadcountWaterfall
            headcount={snapshot.headcount}
            hires={snapshot.hires12mo}
            separations={snapshot.separations12mo}
          />
        </ChartCard>
      </section>

      <section
        aria-label="Workforce demographics"
        className="grid grid-cols-1 gap-4 lg:grid-cols-2"
      >
        <ChartCard title={ageTitle(snapshot.ageBuckets)} meta="Age bands · active only">
          <BucketBarChart
            data={snapshot.ageBuckets}
            emptyMessage="No birthdates on file yet."
          />
        </ChartCard>
        <ChartCard
          title={tenureTitle(snapshot.tenureBuckets)}
          meta="Tenure bands · active only"
        >
          <BucketBarChart
            data={snapshot.tenureBuckets}
            emptyMessage="No join dates on file yet."
          />
        </ChartCard>
      </section>
    </div>
  );
}

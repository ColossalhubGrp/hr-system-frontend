import { KpiCard } from "./kpi-card";
import { ChartCard } from "./chart-card";
import { DepartmentBarChart } from "./department-bar-chart";
import { GenderDonut } from "./gender-donut";
import { HeadcountTrendChart } from "./headcount-trend-chart";
import { FlowChart } from "./flow-chart";
import { BucketBarChart } from "./bucket-bar-chart";
import type { ExecSnapshot } from "@/lib/frappe/exec-snapshot";

/**
 * Executive dashboard — the across-the-system view at `/dashboard`.
 * Each section (People / Payroll / Accounting / Recruitment)
 * renders ONLY when the signed-in user has access to that module;
 * the layout gates each fetch, and tiles with no data drop out.
 *
 * `/hr` keeps its focused HR-only grid (DashboardGrid); /dashboard
 * uses this richer, multi-module view.
 */
export function ExecDashboardGrid({ title, snapshot }: { title: string; snapshot: ExecSnapshot }) {
  const fmt = new Intl.NumberFormat("en");
  const money = (n: number, currency?: string | null) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(n);

  const anySection =
    snapshot.hr || snapshot.payroll || snapshot.accounting || snapshot.recruitment;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ash-900">{title}</h1>
      </header>

      {!anySection && (
        <div className="rounded-card border border-hairline bg-surface px-6 py-10 text-center text-sm text-ash-500">
          You don't have access to any of the modules on this
          dashboard yet. Ask your admin to add you to a role bundle
          (HR, Payroll, Accounting, or Recruitment).
        </div>
      )}

      {/* ─── PEOPLE (HR) ──────────────────────────────────────── */}
      {snapshot.hr && (
        <section aria-label="People" className="flex flex-col gap-4">
          <SectionHeading
            title="People"
            subtitle="Workforce size, movement, and shape."
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Headcount"
              value={fmt.format(snapshot.hr.headcount)}
              trendPct={snapshot.hr.headcountTrendPct}
              spark={snapshot.hr.spark.headcount}
            />
            <KpiCard
              label="New Hires"
              value={fmt.format(snapshot.hr.hires12mo)}
              trendPct={null}
              caption="Last 12 months"
            />
            <KpiCard
              label="Separations"
              value={fmt.format(snapshot.hr.separations12mo)}
              trendPct={null}
              caption="Last 12 months"
              trendDirection="down"
            />
            <KpiCard
              label="Turnover Rate"
              value={`${snapshot.hr.turnoverPct}%`}
              trendPct={snapshot.hr.turnoverTrendPct}
              trendDirection={snapshot.hr.turnoverTrendPct >= 0 ? "down" : "up"}
              spark={snapshot.hr.spark.turnover}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Headcount Trend (12 months)">
              <HeadcountTrendChart data={snapshot.hr.headcountTrend} />
            </ChartCard>
            <ChartCard title="Hires vs Separations (12 months)">
              <FlowChart data={snapshot.hr.flow} />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard title="Headcount by Department">
              <DepartmentBarChart data={snapshot.hr.departments} />
            </ChartCard>
            <ChartCard title="Age Distribution">
              <BucketBarChart
                data={snapshot.hr.ageBuckets}
                emptyMessage="No birthdates on file yet."
              />
            </ChartCard>
            <ChartCard title="Tenure Distribution">
              <BucketBarChart
                data={snapshot.hr.tenureBuckets}
                emptyMessage="No join dates on file yet."
              />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Gender Distribution">
              <GenderDonut data={snapshot.hr.gender} />
            </ChartCard>
          </div>
        </section>
      )}

      {/* ─── PAYROLL ──────────────────────────────────────────── */}
      {snapshot.payroll && (
        <section aria-label="Payroll" className="flex flex-col gap-4">
          <SectionHeading
            title="Payroll"
            subtitle="Current-month cost + pay-run throughput."
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard
              label="Payroll Cost (MTD)"
              value={money(snapshot.payroll.monthToDateGross, snapshot.payroll.currency)}
              trendPct={null}
              caption="Current month, submitted slips"
            />
            <KpiCard
              label="Pay Runs"
              value={fmt.format(snapshot.payroll.runsThisMonth)}
              trendPct={null}
              caption="Current month"
            />
            <KpiCard
              label="Avg Gross Pay"
              value={money(snapshot.payroll.avgGrossThisMonth, snapshot.payroll.currency)}
              trendPct={null}
              caption="Per employee, current month"
            />
          </div>
        </section>
      )}

      {/* ─── ACCOUNTING ──────────────────────────────────────── */}
      {snapshot.accounting && snapshot.accounting.company && (
        <section aria-label="Accounting" className="flex flex-col gap-4">
          <SectionHeading
            title="Accounting"
            subtitle={`Outstanding AR / AP + cumulative billing · ${snapshot.accounting.company}`}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Receivables Outstanding"
              value={money(snapshot.accounting.accountsReceivableOutstanding)}
              trendPct={null}
              caption="Owed to us"
            />
            <KpiCard
              label="Payables Outstanding"
              value={money(snapshot.accounting.accountsPayableOutstanding)}
              trendPct={null}
              caption="Owed by us"
              trendDirection="down"
            />
            <KpiCard
              label="Sales Billed"
              value={money(snapshot.accounting.totalIncomingBills)}
              trendPct={null}
              caption="All submitted sales invoices"
            />
            <KpiCard
              label="Purchases Billed"
              value={money(snapshot.accounting.totalOutgoingBills)}
              trendPct={null}
              caption="All submitted purchase invoices"
              trendDirection="down"
            />
          </div>
        </section>
      )}

      {/* ─── RECRUITMENT ─────────────────────────────────────── */}
      {snapshot.recruitment && (
        <section aria-label="Recruitment" className="flex flex-col gap-4">
          <SectionHeading
            title="Recruitment"
            subtitle="Pipeline health at a glance."
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard
              label="Open Roles"
              value={fmt.format(snapshot.recruitment.openJobs)}
              trendPct={null}
              caption="Jobs currently accepting"
            />
            <KpiCard
              label="Active Applicants"
              value={fmt.format(snapshot.recruitment.activeApplicants)}
              trendPct={null}
              caption="Not yet hired or rejected"
            />
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <h2 className="text-base font-semibold text-ash-900">{title}</h2>
      <p className="text-sm text-ash-500">{subtitle}</p>
    </div>
  );
}

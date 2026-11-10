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
import { MovementHeadline } from "./movement-headline";
import { NeedsYou } from "./needs-you";
import { RefreshStamp } from "./refresh-stamp";
import { AskInline } from "./ask-inline";
import { formatMoney } from "@/lib/format";
import type { ExecSnapshot } from "@/lib/frappe/exec-snapshot";

/**
 * Executive dashboard — the across-the-system view at `/dashboard`.
 * Opens with the attributed movement headline (what moved and why),
 * then the to-do strip, then per-module sections. Each section
 * renders ONLY when the signed-in user has access to that module;
 * tiles are drill-throughs into the records they summarise.
 */
export function ExecDashboardGrid({ title, snapshot }: { title: string; snapshot: ExecSnapshot }) {
  const fmt = new Intl.NumberFormat("en");
  const money = (n: number, currency?: string | null) =>
    formatMoney(n, currency ?? "USD");

  const anySection =
    snapshot.hr || snapshot.payroll || snapshot.accounting || snapshot.recruitment;

  const hr = snapshot.hr;
  const employeeDelta = hr
    ? (() => {
        const diff = hr.headcount - hr.headcountPrior;
        if (diff === 0) return "level with last month";
        return `${diff > 0 ? "up" : "down"} ${Math.abs(diff)} on last month`;
      })()
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ash-900">{title}</h1>
        <RefreshStamp asOf={snapshot.asOf} />
      </header>

      {!anySection && (
        <div className="rounded-card border border-hairline bg-surface px-6 py-10 text-center text-sm text-ash-500">
          You don't have access to any of the modules on this
          dashboard yet. Ask your admin to add you to a role bundle
          (HR, Payroll, Accounting, or Recruitment).
        </div>
      )}

      {snapshot.movement && <MovementHeadline movement={snapshot.movement} />}
      <NeedsYou items={snapshot.needsYou} />
      {anySection && <AskInline />}

      {/* ─── PEOPLE (HR) ──────────────────────────────────────── */}
      {hr && (
        <section aria-label="People" className="flex flex-col gap-4">
          <SectionHeading
            title="People"
            subtitle="Workforce size, movement, and shape."
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Employees"
              value={fmt.format(hr.headcount)}
              trendPct={hr.headcountTrendPct}
              delta={employeeDelta}
              footnote={`From ${fmt.format(hr.headcount)} active employee records`}
              href="/employee"
              spark={hr.spark.headcount}
            />
            <KpiCard
              label="New hires"
              value={fmt.format(hr.hires12mo)}
              trendPct={null}
              caption="Last 12 months"
              href="/employee"
            />
            <KpiCard
              label="Separations"
              value={fmt.format(hr.separations12mo)}
              trendPct={null}
              caption="Last 12 months"
              trendDirection="down"
              href="/employee/lifecycle"
            />
            <KpiCard
              label="Turnover rate"
              value={`${hr.turnoverPct}%`}
              trendPct={hr.turnoverTrendPct}
              trendDirection={hr.turnoverTrendPct >= 0 ? "down" : "up"}
              footnote="Leavers over 12 months ÷ active employees"
              spark={hr.spark.turnover}
            />
          </div>

          {/* Action titles throughout (product owner's Storytelling-
              with-Data brief): the title is the takeaway, the meta
              slot carries the old topic/scope. */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard
              title={headcountTrendTitle(hr.headcountTrend)}
              meta="Employees · end of each month"
            >
              <HeadcountTrendChart data={hr.headcountTrend} />
            </ChartCard>
            <ChartCard
              title={flowTitle(hr.flow)}
              meta="Hires vs separations · monthly"
            >
              <FlowChart data={hr.flow} />
            </ChartCard>
            <ChartCard
              title={waterfallTitle(hr.hires12mo, hr.separations12mo)}
              meta="Headcount movement · 12 months"
            >
              <HeadcountWaterfall
                headcount={hr.headcount}
                hires={hr.hires12mo}
                separations={hr.separations12mo}
              />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard
              title={departmentTitle(hr.departments)}
              meta="By department · active only"
            >
              <DepartmentBarChart data={hr.departments} />
            </ChartCard>
            <ChartCard title={ageTitle(hr.ageBuckets)} meta="Age bands · active only">
              <BucketBarChart
                data={hr.ageBuckets}
                emptyMessage="No birthdates on file yet."
              />
            </ChartCard>
            <ChartCard
              title={tenureTitle(hr.tenureBuckets)}
              meta="Tenure bands · active only"
            >
              <BucketBarChart
                data={hr.tenureBuckets}
                emptyMessage="No join dates on file yet."
              />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title={genderTitle(hr.gender)} meta="Gender · active only">
              <GenderSplit data={hr.gender} />
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
              label="Payroll cost (this month)"
              value={money(snapshot.payroll.monthToDateGross, snapshot.payroll.currency)}
              trendPct={null}
              caption="Current month, posted slips"
              footnote="Gross pay across posted salary slips"
              href="/payroll/dashboard"
            />
            <KpiCard
              label="Pay runs"
              value={fmt.format(snapshot.payroll.runsThisMonth)}
              trendPct={null}
              caption="Current month"
              href="/payroll"
            />
            <KpiCard
              label="Average gross pay"
              value={money(snapshot.payroll.avgGrossThisMonth, snapshot.payroll.currency)}
              trendPct={null}
              caption="Per employee, current month"
              href="/payroll/dashboard"
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
              label="Receivables outstanding"
              value={money(snapshot.accounting.accountsReceivableOutstanding)}
              trendPct={null}
              caption="Owed to us"
              href="/accounting/sales-invoices"
            />
            <KpiCard
              label="Payables outstanding"
              value={money(snapshot.accounting.accountsPayableOutstanding)}
              trendPct={null}
              caption="Owed by us"
              trendDirection="down"
              href="/accounting/purchase-invoices"
            />
            <KpiCard
              label="Sales billed"
              value={money(snapshot.accounting.totalIncomingBills)}
              trendPct={null}
              caption="All posted sales invoices"
              href="/accounting/sales-invoices"
            />
            <KpiCard
              label="Purchases billed"
              value={money(snapshot.accounting.totalOutgoingBills)}
              trendPct={null}
              caption="All posted purchase invoices"
              trendDirection="down"
              href="/accounting/purchase-invoices"
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
              label="Open roles"
              value={fmt.format(snapshot.recruitment.openJobs)}
              trendPct={null}
              caption="Jobs currently accepting"
              href="/recruitment/hr/jobs"
            />
            <KpiCard
              label="Active applicants"
              value={fmt.format(snapshot.recruitment.activeApplicants)}
              trendPct={null}
              caption="Not yet hired or rejected"
              href="/recruitment/candidates"
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

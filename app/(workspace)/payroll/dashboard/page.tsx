import Link from "next/link";
import type { Route } from "next";
import {
  ArrowRight,
  TrendingUp,
  Users,
  ShieldCheck,
  Coins,
  AlertTriangle,
} from "lucide-react";
import { getDashboardMetrics, type PeriodKey, PERIOD_OPTIONS } from "@/lib/payroll-engine/dashboard";
import { listMissingCriticalInfo } from "@/lib/payroll-engine/payruns";
import {
  KpiTile,
  TrendChart,
  DonutChart,
  BarsCard,
} from "@/components/payroll/dashboard-charts";
import { NewPeriodModal } from "@/components/payroll/new-period-modal";
import { PeriodFilter } from "@/components/payroll/period-filter";

export const metadata = { title: "Payroll Dashboard · Colossal Hub" };
export const dynamic = "force-dynamic";

const usd = (n: number) =>
  `US$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const usd2 = (n: number) =>
  `US$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function pctChange(now: number, prev: number): string {
  if (!prev) return now ? "· first month with data" : "—";
  const p = ((now - prev) / prev) * 100;
  const sign = p >= 0 ? "▲" : "▼";
  return `${sign} ${Math.abs(p).toFixed(1)}% vs previous month`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ── Statutory deadlines ──────────────────────────────────────────────
// PAYE (+AIDS levy) and NSSA are remitted by the 10th of the month
// after the pay month; ZIMDEF is quarterly, within 30 days of the
// quarter's end. Computed from the latest processed run's pay date.
type Due = { label: string; date: Date };

function statutoryDues(payDateIso: string | null | undefined): {
  payeNssa: Due | null; zimdef: Due | null;
} {
  if (!payDateIso) return { payeNssa: null, zimdef: null };
  const d = new Date(payDateIso.slice(0, 10) + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return { payeNssa: null, zimdef: null };
  const tenth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 10));
  const qEndMonth = Math.floor(d.getUTCMonth() / 3) * 3 + 3; // 3,6,9,12
  const qDue = new Date(Date.UTC(d.getUTCFullYear(), qEndMonth, 0));
  qDue.setUTCDate(qDue.getUTCDate() + 30);
  return {
    payeNssa: { label: "by the 10th", date: tenth },
    zimdef: { label: "30 days after quarter end", date: qDue },
  };
}

function dueDateLong(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

function DueChip({ due }: { due: Due }) {
  const days = Math.ceil((due.date.getTime() - Date.now()) / 86400000);
  const cls =
    days < 0
      ? "bg-rose-100 text-rose-700"
      : days <= 14
      ? "bg-amber-100 text-amber-700"
      : "bg-emerald-100 text-emerald-700";
  const text =
    days < 0
      ? `was due ${dueDateLong(due.date)}`
      : days === 0
      ? "due today"
      : days === 1
      ? "due tomorrow"
      : `due ${dueDateLong(due.date)} · ${days} days`;
  return (
    <span className={`ml-2 inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${cls}`}>
      {text}
    </span>
  );
}

export default async function PayrollDashboardPage({
  searchParams,
}: {
  searchParams?: { period?: string };
}) {
  const validKeys = new Set(PERIOD_OPTIONS.map((o) => o.value));
  const period: PeriodKey = validKeys.has((searchParams?.period ?? "") as PeriodKey)
    ? (searchParams!.period as PeriodKey)
    : "l6m";

  const [metrics, missing] = await Promise.all([
    getDashboardMetrics(period),
    listMissingCriticalInfo(),
  ]);
  metrics.blockedEmployeeCount = missing.length;

  const { latest, trend, period: periodTotals, recent } = metrics;
  const currentTrend = trend[trend.length - 1]?.netUsd ?? 0;
  const previousTrend = trend[trend.length - 2]?.netUsd ?? 0;

  // Composition of the latest run — where does the gross go?
  const netAfterCredits = Math.max(0, latest.netUsd);
  const composition = latest.grossUsd > 0
    ? [
        { label: "Net take-home", value: netAfterCredits, color: "#059669" },
        { label: "PAYE", value: latest.payeUsd, color: "#4f46e5" },
        { label: "NSSA (employee)", value: latest.nssaEmployee, color: "#0891b2" },
        { label: "Pension", value: latest.pensionUsd, color: "#7c3aed" },
        { label: "AIDS Levy", value: latest.aidsUsd, color: "#c026d3" },
        {
          label: "Other deductions",
          value: Math.max(
            0,
            latest.grossUsd
              - netAfterCredits
              - latest.payeUsd
              - latest.nssaEmployee
              - latest.pensionUsd
              - latest.aidsUsd,
          ),
          color: "#f59e0b",
        },
      ].filter((s) => s.value > 0)
    : [];

  const dues = statutoryDues(latest.run?.pay_date);

  // Run-on-run: the last two months that actually processed.
  const processed = trend.filter((t) => !t.isForecast);
  const curM = processed[processed.length - 1] ?? null;
  const prevM = processed[processed.length - 2] ?? null;
  const employerThisRun = latest.grossUsd + latest.nssaEmployer + latest.zimdef;
  const costPerEmployee =
    latest.employeeCount > 0 ? employerThisRun / latest.employeeCount : 0;
  const overheadPct =
    latest.grossUsd > 0
      ? ((employerThisRun - latest.grossUsd) / latest.grossUsd) * 100
      : 0;

  const trendPoints = trend.map((t) => ({
    label: t.label,
    value: t.netUsd,
    isForecast: t.isForecast,
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Payroll
          </p>
          <h1 className="text-[28px] font-bold leading-tight text-foreground">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time overview of workforce cost, statutory obligations,
            and the health of the next pay run.
            {latest.run && (
              <>
                {" "}Last processed:{" "}
                <span className="font-semibold text-foreground">
                  {latest.run.period_label}
                </span>{" "}
                (pay date {fmtDate(latest.run.pay_date)}).
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodFilter current={period} />
          <NewPeriodModal />
          <Link
            href={"/payroll" as Route}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-transparent px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/40"
          >
            All pay runs
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Action Required */}
      {metrics.blockedEmployeeCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div className="flex-1">
            <div className="text-sm font-bold text-rose-800">
              {metrics.blockedEmployeeCount} employee
              {metrics.blockedEmployeeCount === 1 ? "" : "s"} blocked
              from the next run
            </div>
            <p className="mt-1 text-xs text-rose-700/80">
              Missing statutory identifiers or bank details. Fix these
              before the next processing window to avoid exclusions.
            </p>
          </div>
          <Link
            href={"/payroll" as Route}
            className="whitespace-nowrap text-xs font-semibold text-rose-700 hover:underline"
          >
            Review →
          </Link>
        </div>
      )}

      {/* KPI row */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile
          label="This run · Net pay"
          value={usd(latest.netUsd)}
          hint={
            currentTrend && previousTrend
              ? pctChange(currentTrend, previousTrend)
              : `${latest.employeeCount} employee${latest.employeeCount === 1 ? "" : "s"} paid`
          }
          accent="emerald"
        />
        <KpiTile
          label="This run · Gross"
          value={usd(latest.grossUsd)}
          hint={`Employer cost incl. NSSA + ZIMDEF: ${usd(latest.grossUsd + latest.nssaEmployer + latest.zimdef)}`}
          accent="primary"
        />
        <KpiTile
          label="This run · PAYE + AIDS"
          value={usd(latest.payeUsd + latest.aidsUsd)}
          hint={
            latest.taxCreditsUsd > 0
              ? `Tax credits applied: −${usd(latest.taxCreditsUsd)}`
              : "Remitted to ZIMRA"
          }
          accent="amber"
        />
        <KpiTile
          label={`${periodTotals.label} · Employer cost`}
          value={usd(periodTotals.employerCostUsd)}
          hint={
            periodTotals.runs > 0
              ? `${periodTotals.runs} run${periodTotals.runs === 1 ? "" : "s"} · Net paid: ${usd(periodTotals.netUsd)}`
              : "No processed runs in this period"
          }
          accent="primary"
        />
      </section>

      {/* Run on run + unit economics */}
      {curM && (
        <section className="grid grid-cols-2 gap-3 rounded-xl border bg-card p-4 sm:grid-cols-5">
          <CompareStat
            label={prevM ? `Gross vs ${prevM.label}` : "Gross"}
            now={curM.grossUsd}
            prev={prevM?.grossUsd ?? null}
          />
          <CompareStat
            label={prevM ? `Net vs ${prevM.label}` : "Net"}
            now={curM.netUsd}
            prev={prevM?.netUsd ?? null}
          />
          <CompareStat
            label={prevM ? `PAYE vs ${prevM.label}` : "PAYE"}
            now={curM.payeUsd}
            prev={prevM?.payeUsd ?? null}
          />
          <div className="flex flex-col gap-0.5">
            <div className="text-[11px] font-semibold text-muted-foreground">
              Cost per employee — this run
            </div>
            <div className="text-lg font-bold tabular-nums text-foreground">
              {usd2(costPerEmployee)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Employer cost ÷ {latest.employeeCount} paid
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="text-[11px] font-semibold text-muted-foreground">
              Employer overhead on gross
            </div>
            <div className="text-lg font-bold tabular-nums text-foreground">
              {overheadPct.toFixed(1)}%
            </div>
            <div className="text-[11px] text-muted-foreground">
              NSSA (employer) + ZIMDEF
            </div>
          </div>
        </section>
      )}

      {/* Trend + Composition */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TrendChart
            label={`Net pay trend · ${trend.length} month${trend.length === 1 ? "" : "s"}`}
            points={trendPoints}
            color="#059669"
          />
          <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-600" />
            Processed
            <span className="ml-3 inline-flex h-2 w-2 rounded-full border-2 border-emerald-600 bg-surface" />
            No run this month
          </p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {latest.run
              ? `Where the gross went · ${latest.run.period_label}`
              : "Composition"}
          </div>
          {composition.length > 0 ? (
            <DonutChart
              slices={composition}
              centerLabel="Gross"
              centerValue={usd(latest.grossUsd)}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              No processed runs yet. Once the first run finishes,
              you&apos;ll see the take-home vs statutory breakdown here.
            </p>
          )}
        </div>
      </section>

      {/* Compliance + Departments */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Statutory obligations · this run
            </div>
            {latest.run && dues.payeNssa && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                Prepared — remit by {dueDateLong(dues.payeNssa.date)}
              </span>
            )}
          </div>
          <ul className="divide-y">
            <StatRow
              icon={<ShieldCheck className="h-4 w-4 text-primary" />}
              label="PAYE (income tax)"
              value={usd2(latest.payeUsd)}
              hint="Remit to ZIMRA"
              due={dues.payeNssa}
            />
            <StatRow
              icon={<Coins className="h-4 w-4 text-fuchsia-600" />}
              label="AIDS Levy (3% of PAYE)"
              value={usd2(latest.aidsUsd)}
              hint="Bundled with PAYE remittance"
            />
            <StatRow
              icon={<Users className="h-4 w-4 text-cyan-600" />}
              label="NSSA · employee + employer"
              value={usd2(latest.nssaEmployee + latest.nssaEmployer)}
              hint={`Employee ${usd2(latest.nssaEmployee)} · Employer ${usd2(latest.nssaEmployer)}`}
              due={dues.payeNssa}
            />
            <StatRow
              icon={<TrendingUp className="h-4 w-4 text-violet-600" />}
              label="ZIMDEF (1% of gross)"
              value={usd2(latest.zimdef)}
              hint="Employer only"
              due={dues.zimdef}
            />
            {latest.taxCreditsUsd > 0 && (
              <StatRow
                icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />}
                label="Tax credits applied"
                value={`−${usd2(latest.taxCreditsUsd)}`}
                hint="Elderly + disabled + medical aid share"
              />
            )}
          </ul>
        </div>

        <BarsCard
          title="Net pay by department · this run"
          rows={latest.byDepartment.map((d) => ({ label: d.label, value: d.netUsd }))}
          color="#4f46e5"
          emptyLabel="Once a run is processed you'll see the split by department here."
        />
      </section>

      {/* Recent runs */}
      <section className="rounded-xl border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recent pay runs
          </div>
          <Link
            href={"/payroll" as Route}
            className="text-xs font-semibold text-primary hover:underline"
          >
            See all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No pay runs yet. Click <strong>+ New pay period</strong> above to
            create your first one.
          </p>
        ) : (
          <div className="divide-y">
            {recent.map((r) => (
              <Link
                key={r.name}
                href={`/payroll/${encodeURIComponent(r.name)}` as Route}
                className="flex items-center gap-4 py-3 transition hover:bg-muted/30"
              >
                <div className="flex-1">
                  <div className="font-semibold text-foreground">{r.period_label}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.name} · pay date {fmtDate(r.pay_date)}
                    {r.is_off_cycle && ` · ${r.run_type}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-foreground">
                    {usd(r.netUsdTotal ?? 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.payslipCount ?? 0} employees · {r.status[0] + r.status.slice(1).toLowerCase()}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatRow({
  icon,
  label,
  value,
  hint,
  due,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  due?: Due | null;
}) {
  return (
    <li className="flex items-start gap-3 py-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/40">
        {icon}
      </span>
      <div className="flex-1">
        <div className="flex flex-wrap items-center font-semibold text-foreground">
          {label}
          {due && <DueChip due={due} />}
        </div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      <div className="whitespace-nowrap font-bold tabular-nums text-foreground">
        {value}
      </div>
    </li>
  );
}

function CompareStat({
  label,
  now,
  prev,
}: {
  label: string;
  now: number;
  prev: number | null;
}) {
  const delta = prev === null ? null : now - prev;
  const pct = prev && prev !== 0 && delta !== null ? (delta / prev) * 100 : null;
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-[11px] font-semibold text-muted-foreground">{label}</div>
      <div className="text-lg font-bold tabular-nums text-foreground">{usd(now)}</div>
      <div className="text-[11px] tabular-nums text-muted-foreground">
        {delta === null
          ? "first processed month"
          : `${delta >= 0 ? "+" : "−"}${usd(Math.abs(delta))}${
              pct !== null ? ` (${delta >= 0 ? "+" : "−"}${Math.abs(pct).toFixed(1)}%)` : ""
            }`}
      </div>
    </div>
  );
}

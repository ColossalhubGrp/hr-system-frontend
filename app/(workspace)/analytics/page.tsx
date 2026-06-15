import Link from "next/link";
import type { Route } from "next";
import {
  BarChart3,
  Users,
  Plane,
  Receipt,
  CalendarCheck,
  GraduationCap,
  Target,
  Wallet,
  Landmark,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SummaryTile } from "@/components/common/summary-tile";
import { StatusPill } from "@/components/common/status-pill";
import { fetchAnalyticsBoard } from "@/lib/frappe/analytics";

export const metadata = { title: "Analytics & Reports · Colossal HR" };

export default async function AnalyticsPage() {
  const board = await fetchAnalyticsBoard();
  const attendanceRate =
    board.attendanceLast30 > 0
      ? Math.round((board.presentLast30 / board.attendanceLast30) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={BarChart3}
        crumb="HR · Analytics & Reports"
        title="Analytics"
        subtitle="A live snapshot across every HR module."
      />

      <Section title="Workforce">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryTile
            label="Active headcount"
            value={board.headcount.toLocaleString()}
            icon={Users}
            tone="ink"
            href="/employee?status=Active"
          />
          <SummaryTile
            label="Open leave requests"
            value={board.leavesOpen}
            icon={Plane}
            tone="amber"
            href="/hr/leaves?status=Open"
          />
          <SummaryTile
            label="Approved leaves"
            value={board.leavesApproved}
            icon={Plane}
            tone="rise"
            href="/hr/leaves?status=Approved"
          />
          <SummaryTile
            label="Attendance rate"
            value={`${attendanceRate}%`}
            hint="Present / total marked, last 30 days"
            icon={CalendarCheck}
            tone="rise"
            href="/hr/attendance"
          />
        </div>
      </Section>

      <Section title="Compensation & finance">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryTile
            label="Claims pending"
            value={board.expensesSubmitted}
            icon={Receipt}
            tone="amber"
            href="/hr/expense-claims?status=Submitted"
          />
          <SummaryTile
            label="Claims sanctioned"
            value={formatMoney(board.expensesSanctioned)}
            hint="Approved + paid"
            icon={Receipt}
            tone="rise"
            href="/hr/expense-claims?status=Approved"
          />
          <SummaryTile
            label="Payroll net"
            value={formatMoney(board.payrollNetTotal)}
            hint="All submitted slips"
            icon={Wallet}
            tone="ink"
            href="/payroll?status=Submitted"
          />
          <SummaryTile
            label="Loans outstanding"
            value={formatMoney(board.loansOutstanding)}
            icon={Landmark}
            tone="amber"
            href="/loans"
          />
        </div>
      </Section>

      <Section title="Growth & performance">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryTile
            label="Trainings scheduled"
            value={board.trainingScheduled}
            icon={GraduationCap}
            tone="amber"
            href="/hr/training?status=Scheduled"
          />
          <SummaryTile
            label="Trainings completed"
            value={board.trainingCompleted}
            icon={GraduationCap}
            tone="rise"
            href="/hr/training?status=Completed"
          />
          <SummaryTile
            label="Appraisals submitted"
            value={board.appraisalsSubmitted}
            icon={Target}
            tone="rise"
            href="/hr/performance"
          />
          <SummaryTile
            label="Goals in progress"
            value={board.goalsInProgress}
            icon={Target}
            tone="ink"
            href="/hr/performance?tab=goals&status=In Progress"
          />
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <RecentList
          title="Recent leave applications"
          empty="No leaves filed yet."
          rows={board.recentLeaves.map((l) => ({
            id: l.id,
            primary: l.employeeName ?? l.employee,
            secondary: `${l.leaveType} · ${fmtDate(l.fromDate)}`,
            employeeHref: `/employee/${encodeURIComponent(l.employee)}`,
            href: `/hr/leaves/${encodeURIComponent(l.id)}`,
            status: l.status,
          }))}
        />
        <RecentList
          title="Recent expense claims"
          empty="No claims filed yet."
          rows={board.recentClaims.map((c) => ({
            id: c.id,
            primary: c.employeeName ?? c.employee,
            secondary: `${formatMoney(c.totalClaimedAmount)} · ${fmtDate(c.postingDate)}`,
            employeeHref: `/employee/${encodeURIComponent(c.employee)}`,
            href: `/hr/expense-claims/${encodeURIComponent(c.id)}`,
            status: c.status,
          }))}
        />
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ash-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function RecentList({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: Array<{
    id: string;
    primary: string;
    secondary: string;
    href: string;
    employeeHref: string;
    status: string;
  }>;
}) {
  return (
    <section className="card flex flex-col gap-3 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-ash-500">
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-ash-500">{empty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-hairline">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
              <Link
                href={r.href as Route}
                className="flex min-w-0 flex-col focus-ring rounded-xl"
              >
                <span className="truncate font-medium text-ash-900">
                  {r.primary}
                </span>
                <span className="truncate text-xs text-ash-500">{r.secondary}</span>
              </Link>
              <StatusPill status={r.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(n: number) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

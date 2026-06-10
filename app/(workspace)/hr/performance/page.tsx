import Link from "next/link";
import type { Route } from "next";
import {
  Target,
  ChevronRight,
  Award,
  TrendingUp,
  CheckCircle2,
  FileText,
  MessageSquare,
  AlertTriangle,
  Plus,
  RefreshCcw,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SummaryTile } from "@/components/common/summary-tile";
import { FilterRow } from "@/components/common/list-shell";
import { StatusPill } from "@/components/common/status-pill";
import { SubTabs } from "@/components/common/sub-tabs";
import { DataTable } from "@/components/common/data-table";
import { EmployeeCell } from "@/components/employee/employee-cell";
import { DirectoryPagination } from "@/components/employee/directory-pagination";
import {
  APPRAISAL_STATUSES,
  GOAL_STATUSES,
  PIP_STATUSES,
  listAppraisalCycles,
  listAppraisals,
  listFeedback,
  listGoals,
  listPips,
} from "@/lib/frappe/performance";

export const metadata = { title: "Performance · Colossal HR" };

const TABS = [
  { id: "appraisals", label: "Appraisals" },
  { id: "goals", label: "Goals" },
  { id: "feedback", label: "Feedback" },
  { id: "pip", label: "PIP" },
];

type Tab = "appraisals" | "goals" | "feedback" | "pip";

function tabFrom(v: string | undefined): Tab {
  if (v === "goals" || v === "feedback" || v === "pip") return v;
  return "appraisals";
}

type SP = { tab?: string; status?: string; cycle?: string; page?: string };

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const tab = tabFrom(searchParams.tab);
  const page = Number(searchParams.page ?? 1) || 1;

  const [appraisalCycles, appraisals, goals, feedback, pips] = await Promise.all([
    listAppraisalCycles(),
    tab === "appraisals"
      ? listAppraisals({
          status: searchParams.status || undefined,
          cycle: searchParams.cycle || undefined,
          page,
          pageSize: 25,
        })
      : Promise.resolve(null),
    tab === "goals"
      ? listGoals({
          status: searchParams.status || undefined,
          page,
          pageSize: 25,
        })
      : Promise.resolve(null),
    tab === "feedback"
      ? listFeedback({
          cycle: searchParams.cycle || undefined,
          page,
          pageSize: 25,
        })
      : Promise.resolve(null),
    tab === "pip"
      ? listPips({
          status: searchParams.status || undefined,
          page,
          pageSize: 25,
        })
      : Promise.resolve(null),
  ]);

  const counts = appraisals?.counts ?? { draft: 0, submitted: 0, cancelled: 0 };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={Target}
        crumb="HR · Performance"
        title="Performance"
        subtitle="Appraisals, goals, peer feedback, and improvement plans."
        actions={<HeaderActions tab={tab} />}
      />

      <SubTabs
        tabs={TABS}
        active={tab}
        hrefFor={(id) =>
          id === "appraisals" ? "/hr/performance" : `/hr/performance?tab=${id}`
        }
      />

      {tab === "appraisals" && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryTile
              label="Total"
              value={(appraisals?.total ?? 0).toLocaleString()}
              icon={FileText}
              tone="ink"
            />
            <SummaryTile
              label="Drafts"
              value={counts.draft}
              icon={FileText}
              tone="amber"
            />
            <SummaryTile
              label="Submitted"
              value={counts.submitted}
              icon={CheckCircle2}
              tone="rise"
            />
            <SummaryTile
              label="Cancelled"
              value={counts.cancelled}
              icon={Award}
              tone="ash"
            />
          </div>

          <FilterRow
            selects={[
              { key: "status", label: "Status", options: APPRAISAL_STATUSES },
              { key: "cycle", label: "Cycle", options: appraisalCycles },
            ]}
          />

          <DataTable
            rows={appraisals?.rows ?? []}
            rowKey={(r) => r.id}
            rowHref={(r) =>
              `/hr/performance/appraisals/${encodeURIComponent(r.id)}`
            }
            empty="No appraisals match the current filters."
            columns={[
              {
                header: "Employee",
                cell: (r) => (
                  <EmployeeCell id={r.employee} name={r.employeeName} />
                ),
              },
              {
                header: "Cycle",
                className: "hidden md:table-cell text-ash-700",
                cell: (r) => r.cycle ?? "—",
              },
              {
                header: "Template",
                className: "hidden lg:table-cell text-ash-700",
                cell: (r) => r.appraisalTemplate ?? "—",
              },
              {
                header: "Status",
                cell: (r) => <StatusPill status={r.status} />,
              },
              {
                header: "Score",
                className: "text-right text-ash-900 font-medium",
                cell: (r) =>
                  r.finalScore == null ? "—" : r.finalScore.toFixed(2),
              },
            ]}
          />
        </>
      )}

      {tab === "goals" && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryTile
              label="Total"
              value={(goals?.total ?? 0).toLocaleString()}
              icon={Target}
              tone="ink"
            />
            <SummaryTile
              label="In progress"
              value={
                (goals?.rows ?? []).filter((g) => g.status === "In Progress").length
              }
              icon={TrendingUp}
              tone="ink"
            />
            <SummaryTile
              label="Completed"
              value={
                (goals?.rows ?? []).filter((g) => g.status === "Completed").length
              }
              icon={CheckCircle2}
              tone="rise"
            />
            <SummaryTile
              label="Closed"
              value={(goals?.rows ?? []).filter((g) => g.status === "Closed").length}
              icon={ChevronRight}
              tone="ash"
            />
          </div>

          <FilterRow
            selects={[{ key: "status", label: "Status", options: GOAL_STATUSES }]}
          />

          <DataTable
            rows={goals?.rows ?? []}
            rowKey={(g) => g.id}
            rowHref={(g) => `/hr/performance/goals/${encodeURIComponent(g.id)}`}
            empty="No goals match the current filters."
            columns={[
              {
                header: "Goal",
                cell: (g) => (
                  <Link
                    href={
                      `/hr/performance/goals/${encodeURIComponent(g.id)}` as Route
                    }
                    className="flex flex-col focus-ring rounded-xl"
                  >
                    <span className="font-medium text-ash-900">
                      {g.goalName}
                    </span>
                    <span className="text-xs text-ash-500">{g.id}</span>
                  </Link>
                ),
              },
              {
                header: "Owner",
                cell: (g) =>
                  g.employee ? (
                    <Link
                      href={
                        `/employee/${encodeURIComponent(g.employee)}` as Route
                      }
                      className="font-medium text-ink-800 hover:underline"
                    >
                      {g.employeeName ?? g.employee}
                    </Link>
                  ) : (
                    <span className="text-ash-500">—</span>
                  ),
              },
              {
                header: "Window",
                className: "hidden md:table-cell text-ash-700",
                cell: (g) =>
                  g.startDate && g.endDate
                    ? `${fmtDate(g.startDate)} → ${fmtDate(g.endDate)}`
                    : "—",
              },
              {
                header: "Progress",
                className: "hidden sm:table-cell",
                cell: (g) => <Progress value={g.progress ?? 0} />,
              },
              { header: "Status", cell: (g) => <StatusPill status={g.status} /> },
            ]}
          />
        </>
      )}

      {tab === "feedback" && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <SummaryTile
              label="Total"
              value={(feedback?.total ?? 0).toLocaleString()}
              icon={MessageSquare}
              tone="ink"
            />
            <SummaryTile
              label="With score"
              value={(feedback?.rows ?? []).filter((r) => r.totalScore !== null).length}
              icon={TrendingUp}
              tone="rise"
            />
            <SummaryTile
              label="Cycles tagged"
              value={
                new Set(
                  (feedback?.rows ?? [])
                    .map((r) => r.appraisalCycle)
                    .filter(Boolean),
                ).size
              }
              icon={Award}
              tone="ash"
            />
          </div>

          <FilterRow
            selects={[{ key: "cycle", label: "Cycle", options: appraisalCycles }]}
          />

          <DataTable
            rows={feedback?.rows ?? []}
            rowKey={(r) => r.id}
            rowHref={(r) =>
              `/hr/performance/feedback/${encodeURIComponent(r.id)}`
            }
            empty="No peer feedback recorded yet."
            columns={[
              {
                header: "Employee",
                cell: (r) => (
                  <EmployeeCell id={r.employee} name={r.employeeName} />
                ),
              },
              {
                header: "Reviewer",
                className: "hidden md:table-cell text-ash-700",
                cell: (r) => r.reviewerName ?? r.reviewer ?? "—",
              },
              {
                header: "Cycle",
                className: "hidden lg:table-cell text-ash-700",
                cell: (r) => r.appraisalCycle ?? "—",
              },
              {
                header: "When",
                className: "hidden sm:table-cell text-ash-700",
                cell: (r) => (r.feedbackDate ? fmtDate(r.feedbackDate) : "—"),
              },
              {
                header: "Score",
                className: "text-right text-ash-900 font-medium",
                cell: (r) =>
                  r.totalScore == null ? "—" : r.totalScore.toFixed(2),
              },
            ]}
          />

          <DirectoryPagination
            page={feedback?.page ?? 1}
            pageSize={feedback?.pageSize ?? 25}
            total={feedback?.total ?? 0}
          />
        </>
      )}

      {tab === "pip" && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <SummaryTile
              label="Total"
              value={(pips?.total ?? 0).toLocaleString()}
              icon={AlertTriangle}
              tone="ink"
            />
            <SummaryTile
              label="Open"
              value={(pips?.rows ?? []).filter((p) => p.status === "Open").length}
              icon={AlertTriangle}
              tone="amber"
            />
            <SummaryTile
              label="Completed"
              value={
                (pips?.rows ?? []).filter((p) => p.status === "Completed").length
              }
              icon={CheckCircle2}
              tone="rise"
            />
          </div>

          <FilterRow
            selects={[{ key: "status", label: "Status", options: PIP_STATUSES }]}
          />

          <DataTable
            rows={pips?.rows ?? []}
            rowKey={(r) => r.id}
            rowHref={(r) => `/hr/performance/pip/${encodeURIComponent(r.id)}`}
            empty="No improvement plans logged."
            columns={[
              {
                header: "Employee",
                cell: (r) => (
                  <EmployeeCell id={r.employee} name={r.employeeName} />
                ),
              },
              {
                header: "Window",
                className: "hidden md:table-cell text-ash-700",
                cell: (r) =>
                  r.fromDate && r.toDate
                    ? `${fmtDate(r.fromDate)} → ${fmtDate(r.toDate)}`
                    : "—",
              },
              {
                header: "Cycle",
                className: "hidden lg:table-cell text-ash-700",
                cell: (r) => r.appraisalCycle ?? "—",
              },
              { header: "Status", cell: (r) => <StatusPill status={r.status} /> },
            ]}
          />

          <DirectoryPagination
            page={pips?.page ?? 1}
            pageSize={pips?.pageSize ?? 25}
            total={pips?.total ?? 0}
          />
        </>
      )}
    </div>
  );
}

function Progress({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 rounded-full bg-hairline overflow-hidden">
        <div
          className="h-full rounded-full bg-ink-700"
          style={{ width: `${v}%` }}
        />
      </div>
      <span className="text-xs text-ash-700">{Math.round(v)}%</span>
    </div>
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

function HeaderActions({ tab }: { tab: string }) {
  const primary =
    tab === "appraisals"
      ? { href: "/hr/performance/appraisals/new", label: "New appraisal" }
      : tab === "goals"
        ? { href: "/hr/performance/goals/new", label: "New goal" }
        : tab === "feedback"
          ? { href: "/hr/performance/feedback/new", label: "Leave feedback" }
          : { href: "/hr/performance/pip/new", label: "New PIP" };
  return (
    <div className="flex items-center gap-2">
      <Link
        href={"/hr/performance/cycles/new" as Route}
        className="inline-flex h-10 items-center gap-1.5 rounded-chip border border-hairline bg-surface px-3 text-xs font-semibold text-ash-800 transition hover:bg-canvas focus-ring"
      >
        <RefreshCcw className="h-3.5 w-3.5" />
        New cycle
      </Link>
      <Link
        href={primary.href as Route}
        className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring"
      >
        <Plus className="h-4 w-4" />
        {primary.label}
      </Link>
    </div>
  );
}

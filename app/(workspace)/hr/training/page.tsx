import Link from "next/link";
import type { Route } from "next";
import {
  GraduationCap,
  CalendarClock,
  PlayCircle,
  CheckCircle2,
  CircleSlash,
  BookOpen,
  Globe,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SummaryTile } from "@/components/common/summary-tile";
import { FilterRow } from "@/components/common/list-shell";
import { StatusPill } from "@/components/common/status-pill";
import { SubTabs } from "@/components/common/sub-tabs";
import { DataTable } from "@/components/common/data-table";
import { DirectoryPagination } from "@/components/employee/directory-pagination";
import {
  listTrainingEvents,
  listTrainingPrograms,
  TRAINING_STATUSES,
} from "@/lib/frappe/training";

export const metadata = { title: "Training · Colossal HR" };

const TABS = [
  { id: "events", label: "Events" },
  { id: "programs", label: "Programs" },
];

type Tab = "events" | "programs";

type SP = { tab?: string; status?: string; page?: string };

function tabFrom(v: string | undefined): Tab {
  return v === "programs" ? "programs" : "events";
}

export default async function TrainingPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const tab = tabFrom(searchParams.tab);
  const page = Number(searchParams.page ?? 1) || 1;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={GraduationCap}
        crumb="HR · Training"
        title="Training"
        subtitle="Events that get held; programs that group them."
      />

      <SubTabs
        tabs={TABS}
        active={tab}
        hrefFor={(id) =>
          id === "events" ? "/hr/training" : `/hr/training?tab=${id}`
        }
      />

      {tab === "events" ? (
        <Events searchParams={searchParams} page={page} />
      ) : (
        <Programs page={page} />
      )}
    </div>
  );
}

async function Events({
  searchParams,
  page,
}: {
  searchParams: SP;
  page: number;
}) {
  const result = await listTrainingEvents({
    status: searchParams.status || undefined,
    page,
    pageSize: 25,
  });

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile
          label="Scheduled"
          value={result.counts.scheduled}
          icon={CalendarClock}
          tone="amber"
        />
        <SummaryTile
          label="In progress"
          value={result.counts.inProgress}
          icon={PlayCircle}
          tone="ink"
        />
        <SummaryTile
          label="Completed"
          value={result.counts.completed}
          icon={CheckCircle2}
          tone="rise"
        />
        <SummaryTile
          label="Cancelled"
          value={result.counts.cancelled}
          icon={CircleSlash}
          tone="ash"
        />
      </div>

      <FilterRow
        selects={[{ key: "status", label: "Status", options: TRAINING_STATUSES }]}
      />

      <DataTable
        rows={result.rows}
        rowKey={(r) => r.id}
        rowHref={(r) => `/hr/training/${encodeURIComponent(r.id)}`}
        empty="No training events match the current filters."
        columns={[
          {
            header: "Event",
            cell: (r) => (
              <Link
                href={`/hr/training/${encodeURIComponent(r.id)}` as Route}
                className="flex flex-col gap-0.5 focus-ring rounded-xl"
              >
                <span className="font-medium text-ash-900">{r.eventName}</span>
                <span className="text-xs text-ash-500">{r.id}</span>
              </Link>
            ),
          },
          {
            header: "Type",
            className: "hidden md:table-cell text-ash-800",
            cell: (r) => r.type ?? "—",
          },
          {
            header: "When",
            className: "text-ash-700",
            cell: (r) => (r.startTime ? fmtDateTime(r.startTime) : "—"),
          },
          {
            header: "Location",
            className: "hidden lg:table-cell text-ash-700",
            cell: (r) => r.location ?? "—",
          },
          { header: "Status", cell: (r) => <StatusPill status={r.status} /> },
        ]}
      />

      <DirectoryPagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
      />
    </>
  );
}

async function Programs({ page }: { page: number }) {
  const result = await listTrainingPrograms({ page, pageSize: 25 });

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryTile
          label="Programs"
          value={result.total.toLocaleString()}
          icon={BookOpen}
          tone="ink"
        />
        <SummaryTile
          label="Public"
          value={result.rows.filter((r) => r.isPublic).length}
          icon={Globe}
          tone="rise"
        />
        <SummaryTile
          label="Internal"
          value={result.rows.filter((r) => !r.isPublic).length}
          icon={BookOpen}
          tone="ash"
        />
      </div>

      <DataTable
        rows={result.rows}
        rowKey={(r) => r.id}
        empty="No training programs defined yet."
        columns={[
          {
            header: "Program",
            cell: (r) => (
              <>
                <p className="font-medium text-ash-900">
                  {r.trainingProgramName}
                </p>
                {r.description && (
                  <p className="text-xs text-ash-500">{r.description}</p>
                )}
              </>
            ),
          },
          {
            header: "Supplier",
            className: "hidden md:table-cell text-ash-700",
            cell: (r) => r.supplier ?? "—",
          },
          {
            header: "Visibility",
            cell: (r) => (
              <StatusPill
                status={r.isPublic ? "Public" : "Internal"}
                tones={{
                  Public: "bg-rise/10 text-rise ring-rise/20",
                  Internal: "bg-ash-100 text-ash-700 ring-ash-200",
                }}
              />
            ),
          },
        ]}
      />

      <DirectoryPagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
      />
    </>
  );
}

function fmtDateTime(s: string) {
  const d = new Date(s.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

import Link from "next/link";
import type { Route } from "next";
import {
  CalendarCheck,
  Check,
  X,
  Plane,
  Sun,
  Home,
  LogIn,
  LogOut,
  ClipboardList,
  Smartphone,
  Plus,
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
  listAttendance,
  listAttendanceRequests,
  listCheckins,
  ATTENDANCE_STATUSES,
  ATTENDANCE_REQUEST_REASONS,
} from "@/lib/frappe/attendance-list";

export const metadata = { title: "Attendance · Colossal HR" };

const ATT_TONES: Record<string, string> = {
  Present: "bg-rise/10 text-rise ring-rise/20",
  Absent: "bg-fall/10 text-fall ring-fall/20",
  "On Leave": "bg-ash-100 text-ash-700 ring-ash-200",
  "Half Day": "bg-amber-100 text-amber-800 ring-amber-200",
  "Work From Home": "bg-ink-50 text-ink-800 ring-ink-100",
};

const TABS = [
  { id: "records", label: "Records" },
  { id: "checkins", label: "Check-ins" },
  { id: "requests", label: "Requests" },
];

type Tab = "records" | "checkins" | "requests";

type SP = {
  tab?: string;
  employee?: string;
  status?: string;
  log?: string;
  reason?: string;
  from?: string;
  to?: string;
  page?: string;
};

function tabFrom(v: string | undefined): Tab {
  return v === "checkins" || v === "requests" ? v : "records";
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const tab = tabFrom(searchParams.tab);
  const page = Number(searchParams.page ?? 1) || 1;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={CalendarCheck}
        crumb="HR · Attendance"
        title="Attendance"
        subtitle="Marked records, raw check-ins, and pending requests."
        actions={<NewButton tab={tab} />}
      />

      <SubTabs
        tabs={TABS}
        active={tab}
        hrefFor={(id) =>
          id === "records" ? "/hr/attendance" : `/hr/attendance?tab=${id}`
        }
      />

      {tab === "records" && <Records searchParams={searchParams} page={page} />}
      {tab === "checkins" && <Checkins searchParams={searchParams} page={page} />}
      {tab === "requests" && <Requests searchParams={searchParams} page={page} />}
    </div>
  );
}

function NewButton({ tab }: { tab: Tab }) {
  const href =
    tab === "records"
      ? "/hr/attendance/new"
      : tab === "checkins"
        ? "/hr/attendance/checkins/new"
        : "/hr/attendance/requests/new";
  const label =
    tab === "records"
      ? "Mark attendance"
      : tab === "checkins"
        ? "Log punch"
        : "New request";
  return (
    <Link
      href={href as Route}
      className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring"
    >
      <Plus className="h-4 w-4" />
      {label}
    </Link>
  );
}

async function Records({
  searchParams,
  page,
}: {
  searchParams: SP;
  page: number;
}) {
  const result = await listAttendance({
    employee: searchParams.employee || undefined,
    status: searchParams.status || undefined,
    from: searchParams.from || undefined,
    to: searchParams.to || undefined,
    page,
    pageSize: 25,
  });

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <SummaryTile
          label="Present"
          value={result.counts.Present ?? 0}
          icon={Check}
          tone="rise"
        />
        <SummaryTile
          label="Absent"
          value={result.counts.Absent ?? 0}
          icon={X}
          tone="fall"
        />
        <SummaryTile
          label="On leave"
          value={result.counts["On Leave"] ?? 0}
          icon={Plane}
          tone="ash"
        />
        <SummaryTile
          label="Half day"
          value={result.counts["Half Day"] ?? 0}
          icon={Sun}
          tone="amber"
        />
        <SummaryTile
          label="Work from home"
          value={result.counts["Work From Home"] ?? 0}
          icon={Home}
          tone="ink"
        />
      </div>

      <FilterRow
        search={{ key: "employee", placeholder: "Filter by employee ID" }}
        selects={[
          { key: "status", label: "Status", options: [...ATTENDANCE_STATUSES] },
        ]}
      />

      <DataTable
        rows={result.rows}
        rowKey={(r) => r.id}
        rowHref={(r) => `/hr/attendance/${encodeURIComponent(r.id)}`}
        empty="No attendance records match the current filters."
        columns={[
          {
            header: "Employee",
            cell: (r) => (
              <EmployeeCell id={r.employee} name={r.employeeName} />
            ),
          },
          {
            header: "Date",
            className: "text-ash-800",
            cell: (r) => fmtDate(r.attendanceDate),
          },
          {
            header: "Status",
            cell: (r) => <StatusPill status={r.status} tones={ATT_TONES} />,
          },
          {
            header: "Shift",
            className: "hidden md:table-cell text-ash-700",
            cell: (r) => r.shift ?? "—",
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

async function Checkins({
  searchParams,
  page,
}: {
  searchParams: SP;
  page: number;
}) {
  const result = await listCheckins({
    employee: searchParams.employee || undefined,
    logType: searchParams.log || undefined,
    page,
    pageSize: 25,
  });

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryTile
          label="Total"
          value={result.total.toLocaleString()}
          icon={ClipboardList}
          tone="ink"
        />
        <SummaryTile
          label="Check-ins"
          value={result.counts.in}
          icon={LogIn}
          tone="rise"
        />
        <SummaryTile
          label="Check-outs"
          value={result.counts.out}
          icon={LogOut}
          tone="amber"
        />
      </div>

      <FilterRow
        search={{ key: "employee", placeholder: "Filter by employee ID" }}
        selects={[{ key: "log", label: "Log", options: ["IN", "OUT"] }]}
      />

      <DataTable
        rows={result.rows}
        rowKey={(r) => r.id}
        rowHref={(r) => `/hr/attendance/checkins/${encodeURIComponent(r.id)}`}
        empty="No check-ins match the current filters."
        columns={[
          {
            header: "Employee",
            cell: (r) => (
              <EmployeeCell id={r.employee} name={r.employeeName} />
            ),
          },
          {
            header: "Time",
            className: "text-ash-800",
            cell: (r) => fmtDateTime(r.time),
          },
          {
            header: "Log",
            cell: (r) => (
              <StatusPill
                status={r.logType}
                tones={{
                  IN: "bg-rise/10 text-rise ring-rise/20",
                  OUT: "bg-amber-100 text-amber-800 ring-amber-200",
                }}
              />
            ),
          },
          {
            header: "Shift",
            className: "hidden md:table-cell text-ash-700",
            cell: (r) => r.shift ?? "—",
          },
          {
            header: "Device",
            className: "hidden lg:table-cell text-ash-700",
            cell: (r) => (
              <span className="inline-flex items-center gap-1">
                <Smartphone className="h-3 w-3 text-ash-400" />
                {r.device ?? "—"}
              </span>
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

async function Requests({
  searchParams,
  page,
}: {
  searchParams: SP;
  page: number;
}) {
  const result = await listAttendanceRequests({
    employee: searchParams.employee || undefined,
    reason: searchParams.reason || undefined,
    page,
    pageSize: 25,
  });

  return (
    <>
      <FilterRow
        search={{ key: "employee", placeholder: "Filter by employee ID" }}
        selects={[
          {
            key: "reason",
            label: "Reason",
            options: [...ATTENDANCE_REQUEST_REASONS],
          },
        ]}
      />

      <DataTable
        rows={result.rows}
        rowKey={(r) => r.id}
        rowHref={(r) => `/hr/attendance/requests/${encodeURIComponent(r.id)}`}
        empty="No attendance requests yet."
        columns={[
          {
            header: "Employee",
            cell: (r) => (
              <EmployeeCell id={r.employee} name={r.employeeName} />
            ),
          },
          {
            header: "Window",
            className: "text-ash-800",
            cell: (r) => fmtRange(r.fromDate, r.toDate),
          },
          {
            header: "Reason",
            className: "hidden md:table-cell text-ash-700",
            cell: (r) => r.reason ?? "—",
          },
          {
            header: "State",
            cell: (r) => (
              <StatusPill
                status={
                  r.docstatus === 1
                    ? "Approved"
                    : r.docstatus === 2
                      ? "Rejected"
                      : "Draft"
                }
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

function fmtDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtRange(from: string, to: string) {
  if (from === to) return fmtDate(from);
  return `${fmtDate(from)} → ${fmtDate(to)}`;
}

function fmtDateTime(s: string) {
  const d = new Date(s.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

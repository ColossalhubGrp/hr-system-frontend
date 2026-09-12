import Link from "next/link";
import type { Route } from "next";
import {
  Clock,
  Plus,
  FileText,
  CheckCircle2,
  XCircle,
  Users,
  Zap,
  MapPin,
  CalendarRange,
  Layers,
  UserCog,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SummaryTile } from "@/components/common/summary-tile";
import { FilterRow, EmptyState } from "@/components/common/list-shell";
import { StatusPill } from "@/components/common/status-pill";
import { SubTabs } from "@/components/common/sub-tabs";
import { DataTable } from "@/components/common/data-table";
import { EmployeeCell } from "@/components/employee/employee-cell";
import { DirectoryPagination } from "@/components/employee/directory-pagination";
import {
  fetchShiftBoard,
  listShiftAssignments,
  listShiftRequests,
  SHIFT_ASSIGNMENT_STATUSES,
  SHIFT_REQUEST_STATUSES,
} from "@/lib/frappe/shifts";
import { listShiftLocations } from "@/lib/frappe/shift-locations";
import { frappeCall } from "@/lib/frappe/client";
import {
  listShiftScheduleAssignments,
  listShiftSchedules,
} from "@/lib/frappe/shift-schedules";

export const metadata = { title: "Shift management · Colossal HR" };

const TABS = [
  { id: "types", label: "Shift Types" },
  { id: "assignments", label: "Assignments" },
  { id: "requests", label: "Requests" },
  { id: "locations", label: "Locations" },
  { id: "schedules", label: "Schedules" },
  { id: "schedule-assignments", label: "Schedule Assignments" },
  { id: "roster", label: "Roster" },
];

type Tab =
  | "types"
  | "assignments"
  | "requests"
  | "locations"
  | "schedules"
  | "schedule-assignments"
  | "roster";

function tabFrom(v: string | undefined): Tab {
  if (
    v === "assignments" ||
    v === "requests" ||
    v === "locations" ||
    v === "schedules" ||
    v === "schedule-assignments" ||
    v === "roster"
  )
    return v;
  return "types";
}

type SP = {
  tab?: string;
  status?: string;
  employee?: string;
  page?: string;
  // Roster-only filters (mirror the tabs Frappe HR ships).
  company?: string;
  department?: string;
  branch?: string;
  designation?: string;
  shift?: string;
};

export default async function ShiftManagementPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const tab = tabFrom(searchParams.tab);
  const page = Number(searchParams.page ?? 1) || 1;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={Clock}
        crumb="HR · Shift Management"
        title="Shifts"
        subtitle="Shift types, assignments, and rotation requests."
        actions={<NewButton tab={tab} />}
      />

      <SubTabs
        tabs={TABS}
        active={tab}
        hrefFor={(id) =>
          id === "types"
            ? "/hr/shift-management"
            : `/hr/shift-management?tab=${id}`
        }
      />

      {tab === "types" && <Types />}
      {tab === "assignments" && (
        <Assignments searchParams={searchParams} page={page} />
      )}
      {tab === "requests" && (
        <Requests searchParams={searchParams} page={page} />
      )}
      {tab === "locations" && (
        <Locations searchParams={searchParams} page={page} />
      )}
      {tab === "schedules" && (
        <Schedules searchParams={searchParams} page={page} />
      )}
      {tab === "schedule-assignments" && (
        <ScheduleAssignments searchParams={searchParams} page={page} />
      )}
      {tab === "roster" && <Roster searchParams={searchParams} />}
    </div>
  );
}

function NewButton({ tab }: { tab: Tab }) {
  // Roster tab has no "New" — it's pure read. Others link to their /new path.
  const config: Record<Exclude<Tab, "roster">, { href: string; label: string }> = {
    types: { href: "/hr/shift-management/types/new", label: "New shift type" },
    assignments: {
      href: "/hr/shift-management/assignments/new",
      label: "Assign shift",
    },
    requests: { href: "/hr/shift-management/requests/new", label: "File request" },
    locations: {
      href: "/hr/shift-management/locations/new",
      label: "New location",
    },
    schedules: {
      href: "/hr/shift-management/schedules/new",
      label: "New schedule",
    },
    "schedule-assignments": {
      href: "/hr/shift-management/schedule-assignments/new",
      label: "Assign schedule",
    },
  };
  if (tab === "roster") {
    return (
      <Link
        href={"/hr/shift-management/assignments/bulk" as Route}
        className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring"
      >
        <Layers className="h-4 w-4" />
        Bulk assign
      </Link>
    );
  }
  const { href, label } = config[tab];
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

async function Types() {
  const board = await fetchShiftBoard().catch(() => ({
    types: [],
    active: [],
  }));

  return (
    <DataTable
      rows={board.types}
      rowKey={(t) => t.name}
      rowHref={(t) => `/hr/shift-management/types/${encodeURIComponent(t.name)}`}
      empty="No shift types defined yet. Create one to start assigning shifts."
      columns={[
        {
          header: "Name",
          cell: (t) => (
            <Link
              href={
                `/hr/shift-management/types/${encodeURIComponent(t.name)}` as Route
              }
              className="font-medium text-ash-900 hover:text-ink-900 hover:underline underline-offset-2 focus-ring rounded-sm"
            >
              {t.name}
            </Link>
          ),
        },
        {
          header: "Hours",
          className: "text-ash-800",
          cell: (t) => fmtHours(t.startTime, t.endTime),
        },
        {
          header: "Assigned",
          className: "hidden sm:table-cell text-ash-700",
          cell: (t) => (
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-ash-400" />
              {t.assignedCount}
            </span>
          ),
        },
        {
          header: "Auto attendance",
          className: "hidden lg:table-cell",
          cell: (t) =>
            t.enableAutoAttendance ? (
              <span className="inline-flex items-center gap-1 rounded-chip bg-rise/10 px-2 py-0.5 text-[10px] font-medium text-rise">
                <Zap className="h-3 w-3" />
                Enabled
              </span>
            ) : (
              <span className="text-xs text-ash-500">—</span>
            ),
        },
      ]}
    />
  );
}

function fmtHours(start: string | null, end: string | null): string {
  if (!start || !end) return "Hours not set";
  return `${trimTime(start)} → ${trimTime(end)}`;
}

function trimTime(t: string): string {
  // Frappe returns either "09:00:00" or "9:00:00" depending on the value;
  // strip the trailing ":SS" regardless of leading zero.
  return t.replace(/:\d{2}$/, "");
}

async function Assignments({
  searchParams,
  page,
}: {
  searchParams: SP;
  page: number;
}) {
  const result = await listShiftAssignments({
    status: searchParams.status || undefined,
    employee: searchParams.employee || undefined,
    page,
    pageSize: 25,
  });

  return (
    <>
      <FilterRow
        search={{ key: "employee", placeholder: "Filter by employee ID" }}
        selects={[
          { key: "status", label: "Status", options: SHIFT_ASSIGNMENT_STATUSES },
        ]}
      />
      <DataTable
        rows={result.rows}
        rowKey={(a) => a.id}
        rowHref={(a) =>
          `/hr/shift-management/assignments/${encodeURIComponent(a.id)}`
        }
        empty="No shift assignments match the current filters."
        columns={[
          {
            header: "Employee",
            // Match the lifecycle pattern: clicking the employee stays
            // in the row's context (the assignment record) rather than
            // hopping over to the employee master-data page.
            cell: (a) => (
              <EmployeeCell
                id={a.employee}
                name={a.employeeName}
                linkTo={`/hr/shift-management/assignments/${encodeURIComponent(a.id)}`}
              />
            ),
          },
          { header: "Shift", className: "text-ash-800", cell: (a) => a.shiftType },
          {
            header: "Start",
            className: "hidden md:table-cell text-ash-700",
            cell: (a) => fmtDate(a.startDate),
          },
          {
            header: "End",
            className: "hidden md:table-cell text-ash-700",
            cell: (a) => (a.endDate ? fmtDate(a.endDate) : "Ongoing"),
          },
          { header: "Status", cell: (a) => <StatusPill status={a.status} /> },
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
  const result = await listShiftRequests({
    status: searchParams.status || undefined,
    employee: searchParams.employee || undefined,
    page,
    pageSize: 25,
  });

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile
          label="Total"
          value={result.total.toLocaleString()}
          icon={FileText}
          tone="ink"
        />
        <SummaryTile
          label="Draft"
          value={result.counts.draft}
          icon={FileText}
          tone="amber"
        />
        <SummaryTile
          label="Approved"
          value={result.counts.approved}
          icon={CheckCircle2}
          tone="rise"
        />
        <SummaryTile
          label="Rejected"
          value={result.counts.rejected}
          icon={XCircle}
          tone="fall"
        />
      </div>
      <FilterRow
        search={{ key: "employee", placeholder: "Filter by employee ID" }}
        selects={[
          { key: "status", label: "Status", options: SHIFT_REQUEST_STATUSES },
        ]}
      />
      <DataTable
        rows={result.rows}
        rowKey={(r) => r.id}
        rowHref={(r) =>
          `/hr/shift-management/requests/${encodeURIComponent(r.id)}`
        }
        empty="No shift requests match the current filters."
        columns={[
          {
            header: "Employee",
            cell: (r) => (
              <EmployeeCell
                id={r.employee}
                name={r.employeeName}
                linkTo={`/hr/shift-management/requests/${encodeURIComponent(r.id)}`}
              />
            ),
          },
          { header: "Shift", className: "text-ash-800", cell: (r) => r.shiftType },
          {
            header: "Window",
            className: "hidden md:table-cell text-ash-700",
            cell: (r) =>
              r.toDate
                ? `${fmtDate(r.fromDate)} → ${fmtDate(r.toDate)}`
                : fmtDate(r.fromDate),
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

function fmtDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ============================================ Locations =====================

async function Locations({
  searchParams,
  page,
}: {
  searchParams: SP;
  page: number;
}) {
  const result = await listShiftLocations({
    isActive:
      searchParams.status === "Active"
        ? "Yes"
        : searchParams.status === "Inactive"
          ? "No"
          : undefined,
    page,
    pageSize: 25,
  });

  return (
    <>
      <FilterRow
        selects={[{ key: "status", label: "Status", options: ["Active", "Inactive"] }]}
      />
      <DataTable
        rows={result.rows}
        rowKey={(l) => l.id}
        rowHref={(l) =>
          `/hr/shift-management/locations/${encodeURIComponent(l.id)}`
        }
        empty="No shift locations defined. Create one so employees can geofence-check-in."
        columns={[
          {
            header: "Name",
            // Same-destination as the row's chevron so the name is a
            // real link too — matches the lifecycle list behavior HR
            // has come to expect (arrow-only was easy to miss).
            cell: (l) => (
              <Link
                href={`/hr/shift-management/locations/${encodeURIComponent(l.id)}` as Route}
                className="inline-flex items-center gap-2 font-medium text-ash-900 hover:underline focus-ring rounded-md"
              >
                <MapPin className="h-3.5 w-3.5 text-ash-400" />
                {l.locationName}
              </Link>
            ),
          },
          {
            header: "Company",
            className: "hidden md:table-cell text-ash-700",
            cell: (l) => l.company ?? "—",
          },
          {
            header: "Coords",
            className: "hidden lg:table-cell text-ash-700 font-mono text-xs",
            cell: (l) => `${l.latitude.toFixed(4)}, ${l.longitude.toFixed(4)}`,
          },
          {
            header: "Radius",
            className: "text-ash-800",
            cell: (l) => `${l.radiusMeters} m`,
          },
          {
            header: "Status",
            cell: (l) => (
              <StatusPill status={l.isActive ? "Active" : "Inactive"} />
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

// ============================================ Roster =======================

/**
 * Builds a flat employee × day grid for the next ROSTER_DAYS days, filled with
 * whatever Shift Assignments overlap that date. Submitted assignments win
 * over drafts; unassigned days render as blank cells.
 */
const ROSTER_DAYS = 14;

async function Roster({ searchParams }: { searchParams: SP }) {
  const today = new Date();
  const days = Array.from({ length: ROSTER_DAYS }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });
  const lastDay = days[days.length - 1]!;
  const firstIso = isoDate(today);
  const lastIso = isoDate(lastDay);

  // Fetch every employee matching the roster filters — this becomes the
  // FULL set of rows in the grid. Any filtered employee without an
  // assignment in the window still shows up (with empty cells the user
  // can click to file one).
  const empFilters: Array<[string, string, string]> = [
    ["status", "!=", "Left"],
  ];
  if (searchParams.company)
    empFilters.push(["company", "=", searchParams.company]);
  if (searchParams.department)
    empFilters.push(["department", "=", searchParams.department]);
  if (searchParams.branch)
    empFilters.push(["branch", "=", searchParams.branch]);
  if (searchParams.designation)
    empFilters.push(["designation", "=", searchParams.designation]);

  type EmpRow = {
    name: string;
    employee_name: string | null;
    department: string | null;
  };
  const [empRowsRaw, assignmentResult, facets] = await Promise.all([
    frappeCall<EmpRow[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Employee",
        fields: ["name", "employee_name", "department"],
        filters: JSON.stringify(empFilters),
        order_by: "employee_name asc",
        limit_page_length: 500,
      },
      as: "user",
    }).catch(() => [] as EmpRow[]),
    listShiftAssignments({ page: 1, pageSize: 500 }),
    fetchRosterFacets(),
  ]);

  const inWindow = assignmentResult.rows.filter((a) => {
    if (a.startDate > lastIso) return false;
    if (a.endDate && a.endDate < firstIso) return false;
    if (searchParams.shift && a.shiftType !== searchParams.shift) return false;
    return true;
  });

  // Row per filtered employee; start empty then paint assignments in.
  type Row = {
    employee: string;
    employeeName: string | null;
    cells: Array<{ shift: string | null; status: string | null; assignmentId: string | null }>;
  };
  const byEmp = new Map<string, Row>();
  for (const e of empRowsRaw) {
    byEmp.set(e.name, {
      employee: e.name,
      employeeName: e.employee_name,
      cells: days.map(() => ({ shift: null, status: null, assignmentId: null })),
    });
  }
  for (const a of inWindow) {
    const row = byEmp.get(a.employee);
    if (!row) continue; // outside the filtered employee set
    days.forEach((d, i) => {
      const iso = isoDate(d);
      if (iso < a.startDate) return;
      if (a.endDate && iso > a.endDate) return;
      const cur = row.cells[i]!;
      // Submitted assignments outrank drafts.
      if (cur.shift && cur.status === "Active") return;
      cur.shift = a.shiftType;
      cur.status = a.status;
      cur.assignmentId = a.id;
    });
  }
  const rows = Array.from(byEmp.values()).sort((a, b) =>
    (a.employeeName ?? a.employee).localeCompare(b.employeeName ?? b.employee),
  );

  const hasAnyFilter = Boolean(
    searchParams.company ||
      searchParams.department ||
      searchParams.branch ||
      searchParams.designation ||
      searchParams.shift,
  );

  if (rows.length === 0) {
    return (
      <>
        <RosterFilters searchParams={searchParams} facets={facets} />
        <EmptyState>
          {hasAnyFilter
            ? "No employees match these roster filters. Clear a chip to widen the view."
            : `No shift assignments overlap the next ${ROSTER_DAYS} days. File one from the Assignments tab or hit "Bulk assign".`}
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <RosterFilters searchParams={searchParams} facets={facets} />
    <div className="overflow-x-auto rounded-card border border-hairline bg-surface shadow-card">
      <table className="w-full min-w-[900px] text-xs">
        <thead>
          <tr className="border-b border-hairline bg-canvas/50 text-left text-[10px] font-medium uppercase tracking-wide text-ash-500">
            <th className="sticky left-0 z-10 bg-canvas/50 px-4 py-3 backdrop-blur">
              <span className="inline-flex items-center gap-1.5">
                <CalendarRange className="h-3 w-3" />
                Employee
              </span>
            </th>
            {days.map((d) => (
              <th
                key={d.toISOString()}
                className={`px-2 py-3 text-center ${isWeekend(d) ? "text-ink-700" : ""}`}
              >
                <p>{d.toLocaleDateString("en-GB", { weekday: "short" })}</p>
                <p className="text-ash-500">
                  {d.toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                  })}
                </p>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.employee}
              className="border-b border-hairline last:border-b-0 hover:bg-canvas/40"
            >
              <td className="sticky left-0 z-10 bg-surface px-4 py-2">
                <Link
                  href={`/employee/${encodeURIComponent(r.employee)}` as Route}
                  className="block focus-ring rounded-lg"
                >
                  <p className="font-medium text-ash-900">
                    {r.employeeName ?? r.employee}
                  </p>
                  <p className="text-[10px] text-ash-500">{r.employee}</p>
                </Link>
              </td>
              {r.cells.map((c, i) => (
                <td key={i} className="px-1.5 py-1.5">
                  {c.shift ? (
                    <Link
                      href={
                        (c.assignmentId
                          ? `/hr/shift-management/assignments/${encodeURIComponent(c.assignmentId)}`
                          : "#") as Route
                      }
                      className={`mx-auto flex h-12 flex-col items-center justify-center rounded-lg px-2 text-center text-[10px] transition ${
                        c.status === "Active"
                          ? "bg-rise/10 text-rise hover:bg-rise/20"
                          : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                      }`}
                      title={`${c.shift} · ${c.status} — click to open`}
                    >
                      <p className="line-clamp-2 leading-tight font-medium">
                        {c.shift}
                      </p>
                    </Link>
                  ) : (
                    <Link
                      href={
                        `/hr/shift-management/assignments/new?employee=${encodeURIComponent(r.employee)}&start_date=${isoDate(days[i]!)}` as Route
                      }
                      className={`group mx-auto flex h-12 items-center justify-center rounded-lg border border-dashed border-hairline text-[10px] text-ash-400 transition hover:border-ink-400 hover:bg-canvas hover:text-ink-800 focus-ring ${
                        isWeekend(days[i]!) ? "bg-canvas/60" : ""
                      }`}
                      title={`Assign a shift on ${isoDate(days[i]!)}`}
                    >
                      <span className="opacity-0 transition group-hover:opacity-100">
                        + assign
                      </span>
                    </Link>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}

// --- Roster filters + facets --------------------------------------------

type RosterFacets = {
  departments: string[];
  branches: string[];
  designations: string[];
  companies: string[];
  shiftTypes: string[];
};

async function fetchRosterFacets(): Promise<RosterFacets> {
  const [depts, branches, designs, comps, shifts] = await Promise.all([
    frappeCall<Array<{ name: string }>>({
      method: "frappe.client.get_list",
      args: { doctype: "Department", fields: ["name"], limit_page_length: 200 },
      as: "user",
    }).catch(() => []),
    frappeCall<Array<{ name: string }>>({
      method: "frappe.client.get_list",
      args: { doctype: "Branch", fields: ["name"], limit_page_length: 200 },
      as: "user",
    }).catch(() => []),
    frappeCall<Array<{ name: string }>>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Designation",
        fields: ["name"],
        limit_page_length: 500,
      },
      as: "user",
    }).catch(() => []),
    frappeCall<Array<{ name: string }>>({
      method: "frappe.client.get_list",
      args: { doctype: "Company", fields: ["name"], limit_page_length: 200 },
      as: "user",
    }).catch(() => []),
    frappeCall<Array<{ name: string }>>({
      method: "frappe.client.get_list",
      args: { doctype: "Shift Type", fields: ["name"], limit_page_length: 200 },
      as: "user",
    }).catch(() => []),
  ]);
  return {
    departments: depts.map((r) => r.name).sort(),
    branches: branches.map((r) => r.name).sort(),
    designations: designs.map((r) => r.name).sort(),
    companies: comps.map((r) => r.name).sort(),
    shiftTypes: shifts.map((r) => r.name).sort(),
  };
}

function RosterFilters({
  searchParams,
  facets,
}: {
  searchParams: SP;
  facets: RosterFacets;
}) {
  const chips: Array<{ label: string; key: keyof SP; options: string[] }> = [
    { label: "Company", key: "company", options: facets.companies },
    { label: "Department", key: "department", options: facets.departments },
    { label: "Branch", key: "branch", options: facets.branches },
    { label: "Designation", key: "designation", options: facets.designations },
    { label: "Shift", key: "shift", options: facets.shiftTypes },
  ];
  const activeCount = chips.reduce(
    (n, c) => (searchParams[c.key] ? n + 1 : n),
    0,
  );
  return (
    <form
      action="/hr/shift-management"
      method="get"
      className="mb-3 flex flex-wrap items-center gap-2"
    >
      {/* Keep the roster tab active after submit. */}
      <input type="hidden" name="tab" value="roster" />
      {chips.map((c) => (
        <label
          key={c.key}
          className="inline-flex items-center gap-1 rounded-chip border border-hairline bg-surface px-2 py-1 text-xs text-ash-700"
        >
          <span className="text-ash-500">{c.label}:</span>
          <select
            name={String(c.key)}
            defaultValue={String(searchParams[c.key] ?? "")}
            className="bg-transparent text-xs text-ink-900 focus-ring outline-none"
          >
            <option value="">Any</option>
            {c.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
      ))}
      <button
        type="submit"
        className="rounded-chip border border-hairline bg-surface px-2.5 py-1 text-xs font-medium text-ash-700 hover:border-ink-400 hover:text-ink-800 focus-ring"
      >
        Apply
      </button>
      {activeCount > 0 && (
        <Link
          href={"/hr/shift-management?tab=roster" as Route}
          className="rounded-chip px-2 py-1 text-xs text-ash-500 hover:bg-canvas hover:text-ink-800 focus-ring"
        >
          Clear
        </Link>
      )}
    </form>
  );
}

function isWeekend(d: Date): boolean {
  const w = d.getDay();
  return w === 0 || w === 6;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ============================================ Schedules ====================

async function Schedules({
  searchParams,
  page,
}: {
  searchParams: SP;
  page: number;
}) {
  const result = await listShiftSchedules({
    enabled:
      searchParams.status === "Enabled"
        ? "Yes"
        : searchParams.status === "Disabled"
          ? "No"
          : undefined,
    page,
    pageSize: 25,
  });
  return (
    <>
      <FilterRow
        selects={[
          { key: "status", label: "Status", options: ["Enabled", "Disabled"] },
        ]}
      />
      <DataTable
        rows={result.rows}
        rowKey={(r) => r.id}
        rowHref={(r) =>
          `/hr/shift-management/schedules/${encodeURIComponent(r.id)}`
        }
        empty="No schedules yet. Define one — e.g. “Morning rotation · Mon–Fri.”"
        columns={[
          {
            header: "Name",
            cell: (r) => (
              <Link
                href={`/hr/shift-management/schedules/${encodeURIComponent(r.id)}` as Route}
                className="inline-flex items-center gap-2 font-medium text-ash-900 hover:underline focus-ring rounded-md"
              >
                <CalendarRange className="h-3.5 w-3.5 text-ash-400" />
                {r.scheduleName}
              </Link>
            ),
          },
          {
            header: "Shift",
            className: "text-ash-800",
            cell: (r) => r.shiftType,
          },
          {
            header: "Days",
            className: "hidden md:table-cell text-ash-700",
            cell: (r) => r.daysSummary,
          },
          {
            header: "Company",
            className: "hidden lg:table-cell text-ash-700",
            cell: (r) => r.company ?? "—",
          },
          {
            header: "Status",
            cell: (r) => (
              <StatusPill status={r.enabled ? "Enabled" : "Disabled"} />
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

// ===================================== Schedule Assignments =================

async function ScheduleAssignments({
  searchParams,
  page,
}: {
  searchParams: SP;
  page: number;
}) {
  const result = await listShiftScheduleAssignments({
    status: searchParams.status || undefined,
    page,
    pageSize: 25,
  });
  return (
    <>
      <FilterRow
        selects={[
          { key: "status", label: "Status", options: ["Active", "Inactive"] },
        ]}
      />
      <DataTable
        rows={result.rows}
        rowKey={(r) => r.id}
        rowHref={(r) =>
          `/hr/shift-management/schedule-assignments/${encodeURIComponent(r.id)}`
        }
        empty="No schedule assignments yet. Pick a schedule and put an employee on it for a date range."
        columns={[
          {
            header: "Employee",
            cell: (r) => (
              <EmployeeCell
                id={r.employee}
                name={r.employeeName}
                linkTo={`/hr/shift-management/schedule-assignments/${encodeURIComponent(r.id)}`}
              />
            ),
          },
          {
            header: "Schedule",
            className: "inline-flex items-center gap-1.5 text-ash-800",
            cell: (r) => (
              <span className="inline-flex items-center gap-1.5">
                <UserCog className="h-3.5 w-3.5 text-ash-400" />
                {r.shiftSchedule}
              </span>
            ),
          },
          {
            header: "Start",
            className: "hidden md:table-cell text-ash-700",
            cell: (r) => fmtDate(r.startDate),
          },
          {
            header: "End",
            className: "hidden md:table-cell text-ash-700",
            cell: (r) => (r.endDate ? fmtDate(r.endDate) : "Open-ended"),
          },
          {
            header: "Status",
            cell: (r) => <StatusPill status={r.status} />,
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

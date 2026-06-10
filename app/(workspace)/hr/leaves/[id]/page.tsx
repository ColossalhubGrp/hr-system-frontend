import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, Plane } from "lucide-react";
import { FieldGrid } from "@/components/employee/field-grid";
import { LeaveStatusBadge } from "@/components/leaves/leave-status-badge";
import { LeaveDecisionBar } from "@/components/leaves/decision-bar";
import { getLeaveApplication } from "@/lib/frappe/leaves";
import {
  approveLeaveAction,
  rejectLeaveAction,
} from "../actions";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const app = await getLeaveApplication(decodeURIComponent(params.id));
  return {
    title: app
      ? `${app.employeeName ?? app.employee} · Leave · Colossal HR`
      : "Leave · Colossal HR",
  };
}

export default async function LeaveDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const app = await getLeaveApplication(id);
  if (!app) notFound();

  // Only "Open" + docstatus 0 (draft) are actionable. Submitted or cancelled
  // docs lock — Frappe would refuse the submit() anyway.
  const decidable = app.status === "Open" && app.docstatus === 0;
  const approve = approveLeaveAction.bind(null, id);
  const reject = rejectLeaveAction.bind(null, id);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <Link
          href={"/hr/leaves" as Route}
          className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to leaves
        </Link>
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <Plane className="h-3.5 w-3.5" />
          HR · Leaves · {app.id}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            {app.employeeName ?? app.employee}
          </h1>
          <LeaveStatusBadge status={app.status} />
        </div>
        <p className="text-sm text-ash-600">
          {app.leaveType} · {fmtRange(app.fromDate, app.toDate)} ·{" "}
          {app.totalDays.toFixed(app.totalDays % 1 === 0 ? 0 : 1)} day(s)
        </p>
      </header>

      {decidable && <LeaveDecisionBar approve={approve} reject={reject} />}

      <section className="card p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-ash-500">
          Application
        </h2>
        <FieldGrid
          fields={[
            {
              label: "Employee",
              value: (
                <Link
                  href={
                    `/employee/${encodeURIComponent(app.employee)}` as Route
                  }
                  className="font-medium text-ink-800 hover:underline"
                >
                  {app.employeeName ?? app.employee}
                </Link>
              ),
            },
            { label: "Department", value: app.department },
            { label: "Leave type", value: app.leaveType },
            { label: "Total days", value: app.totalDays.toString() },
            { label: "From", value: fmtDate(app.fromDate) },
            { label: "To", value: fmtDate(app.toDate) },
            { label: "Half day", value: app.halfDay ? "Yes" : "No" },
            { label: "Half day date", value: fmtDate(app.halfDayDate) },
            { label: "Approver", value: app.leaveApproverName ?? app.leaveApprover },
            { label: "Filed on", value: fmtDate(app.postingDate) },
            { label: "Reason", value: app.description, wide: true },
          ]}
        />
      </section>
    </div>
  );
}

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
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

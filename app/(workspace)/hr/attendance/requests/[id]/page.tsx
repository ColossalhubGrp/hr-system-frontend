import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DecisionBar } from "@/components/common/decision-bar";
import { StatusPill } from "@/components/common/status-pill";
import { FieldGrid } from "@/components/employee/field-grid";
import { getAttendanceRequest } from "@/lib/frappe/attendance-list";
import {
  approveAttendanceRequestAction,
  rejectAttendanceRequestAction,
} from "../../actions";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const r = await getAttendanceRequest(decodeURIComponent(params.id));
  return {
    title: r ? `${r.id} · Attendance request · Colossal HR` : "Request",
  };
}

export default async function AttendanceRequestDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const r = await getAttendanceRequest(id);
  if (!r) notFound();

  const decidable = r.docstatus === 0;
  const approve = approveAttendanceRequestAction.bind(null, id);
  const reject = rejectAttendanceRequestAction.bind(null, id);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/attendance?tab=requests" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to requests
      </Link>

      <PageHeader
        icon={ClipboardList}
        crumb={`HR · Attendance · Request · ${r.id}`}
        title={r.employeeName ?? r.employee}
        subtitle={
          <span className="flex items-center gap-2">
            <StatusPill
              status={
                r.docstatus === 1
                  ? "Approved"
                  : r.docstatus === 2
                    ? "Rejected"
                    : "Draft"
              }
            />
            <span>· {r.reason ?? "—"}</span>
          </span>
        }
      />

      {decidable && (
        <DecisionBar
          title="Decide on this attendance request"
          description="Approving submits the doc so the system updates the matching attendance days; rejection cancels the request."
          approve={approve}
          reject={reject}
        />
      )}

      <section className="card p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-ash-500">
          Request
        </h2>
        <FieldGrid
          fields={[
            {
              label: "Employee",
              value: (
                <Link
                  href={
                    `/employee/${encodeURIComponent(r.employee)}` as Route
                  }
                  className="font-medium text-ink-800 hover:underline"
                >
                  {r.employeeName ?? r.employee}
                </Link>
              ),
            },
            { label: "Reason", value: r.reason },
            { label: "From", value: fmtDate(r.fromDate) },
            { label: "To", value: fmtDate(r.toDate) },
            { label: "Half day", value: r.halfDay ? "Yes" : "No" },
            {
              label: "Half day date",
              value: r.halfDayDate ? fmtDate(r.halfDayDate) : null,
            },
            {
              label: "Includes holidays",
              value: r.includeHolidays ? "Yes" : "No",
            },
            { label: "Company", value: r.company },
            { label: "Department", value: r.department },
            { label: "Explanation", value: r.explanation, wide: true },
          ]}
        />
      </section>
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

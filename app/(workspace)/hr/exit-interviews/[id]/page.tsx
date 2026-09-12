import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, DoorOpen } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatusPill } from "@/components/common/status-pill";
import { FieldGrid } from "@/components/employee/field-grid";
import { EmployeeCell } from "@/components/employee/employee-cell";
import { ExitInterviewActionsBar } from "@/components/exit-interview/exit-interview-actions";
import { getExitInterview } from "@/lib/frappe/lifecycle-ext";
import { getMyAccess } from "@/lib/frappe/roles";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const e = await getExitInterview(decodeURIComponent(params.id));
  return { title: e ? `${e.name} · Colossal HR` : "Exit interview · Colossal HR" };
}

export default async function ExitInterviewDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const [ei, access] = await Promise.all([getExitInterview(id), getMyAccess()]);
  if (!ei) notFound();
  const canManage = Boolean(access.isHrAdmin || access.isItAdmin);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/exit-interviews" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to interviews
      </Link>

      <PageHeader
        icon={DoorOpen}
        crumb={`HR · Exit Interviews · ${ei.name}`}
        title={ei.employeeName ?? ei.employee}
        subtitle={
          <span className="flex items-center gap-2">
            <StatusPill status={ei.status} />
            {ei.employeeStatus && <span>· {ei.employeeStatus}</span>}
          </span>
        }
      />

      {canManage && (
        <section className="card p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-ash-900">Manage</p>
              <p className="text-xs text-ash-500">
                Submit locks the interview record.
              </p>
            </div>
            <ExitInterviewActionsBar id={ei.name} docstatus={ei.docstatus} />
          </div>
        </section>
      )}

      <section className="card p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-ash-500">
          Employee
        </h2>
        <div className="mb-5">
          <EmployeeCell id={ei.employee} name={ei.employeeName} />
        </div>
        <FieldGrid
          fields={[
            { label: "Department", value: ei.department },
            { label: "Designation", value: ei.designation },
            { label: "Date of joining", value: ei.dateOfJoining ? fmtDate(ei.dateOfJoining) : null },
            { label: "Relieving date", value: ei.relievingDate ? fmtDate(ei.relievingDate) : null },
            { label: "Interview date", value: ei.interviewDate ? fmtDate(ei.interviewDate) : null },
          ]}
        />
      </section>

      <section className="card p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ash-500">
          Reason for leaving
        </h2>
        <p className="text-sm text-ash-800 whitespace-pre-wrap">
          {ei.reasonForLeaving ?? "—"}
        </p>
      </section>

      <section className="card p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ash-500">
          Feedback
        </h2>
        <p className="text-sm text-ash-800 whitespace-pre-wrap">
          {ei.feedback ?? "—"}
        </p>
      </section>

      {ei.interviewers.length > 0 && (
        <section className="card p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ash-500">
            Interviewers
          </h2>
          <ul className="flex flex-col gap-1 text-sm">
            {ei.interviewers.map((i) => (
              <li key={i.interviewer} className="text-ash-800">
                {i.interviewer}
              </li>
            ))}
          </ul>
        </section>
      )}
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

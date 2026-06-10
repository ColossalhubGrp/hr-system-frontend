import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, Clock } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DecisionBar } from "@/components/common/decision-bar";
import { DeleteConfirm } from "@/components/common/delete-confirm";
import { StatusPill } from "@/components/common/status-pill";
import { FieldGrid } from "@/components/employee/field-grid";
import { getShiftRequest } from "@/lib/frappe/shifts";
import {
  approveShiftRequestAction,
  deleteShiftRequestAction,
  rejectShiftRequestAction,
} from "../../actions";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const r = await getShiftRequest(decodeURIComponent(params.id));
  return {
    title: r
      ? `${r.id} · Shift request · Colossal HR`
      : "Shift request · Colossal HR",
  };
}

export default async function ShiftRequestDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const r = await getShiftRequest(id);
  if (!r) notFound();

  const decidable = r.docstatus === 0 && r.status === "Draft";
  const approve = approveShiftRequestAction.bind(null, id);
  const reject = rejectShiftRequestAction.bind(null, id);
  const onDelete = deleteShiftRequestAction.bind(null, id);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/shift-management?tab=requests" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to requests
      </Link>

      <PageHeader
        icon={Clock}
        crumb={`HR · Shift Management · ${r.id}`}
        title={r.employeeName ?? r.employee}
        subtitle={
          <span className="flex items-center gap-2">
            <StatusPill status={r.status} />
            <span>· {r.shiftType}</span>
          </span>
        }
      />

      {decidable && (
        <DecisionBar
          title="Decide on this shift request"
          description="Approving submits the request and (typically) creates a Shift Assignment for the window."
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
            { label: "Shift type", value: r.shiftType },
            { label: "From", value: fmtDate(r.fromDate) },
            { label: "To", value: r.toDate ? fmtDate(r.toDate) : "Open-ended" },
            { label: "Status", value: r.status },
            { label: "Approver", value: r.approverName ?? r.approver },
            { label: "Company", value: r.company },
            { label: "Department", value: r.department },
          ]}
        />
      </section>

      {r.docstatus === 0 && (
        <DeleteConfirm
          title={`Delete draft request ${r.id}`}
          description="Only draft requests can be deleted. Once approved or rejected they live for the audit trail."
          action={onDelete}
        />
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

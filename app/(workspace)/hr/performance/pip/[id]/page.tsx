import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatusPill } from "@/components/common/status-pill";
import { FieldGrid } from "@/components/employee/field-grid";
import { getPip } from "@/lib/frappe/performance";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const p = await getPip(decodeURIComponent(params.id));
  return { title: p ? `${p.id} · PIP · Colossal HR` : "PIP · Colossal HR" };
}

export default async function PipDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const p = await getPip(id);
  if (!p) notFound();

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/performance?tab=pip" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to PIPs
      </Link>

      <PageHeader
        icon={AlertTriangle}
        crumb={`HR · Performance · PIP · ${p.id}`}
        title={p.employeeName ?? p.employee}
        subtitle={<StatusPill status={p.status} />}
      />

      <section className="card p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-ash-500">
          Improvement plan
        </h2>
        <FieldGrid
          fields={[
            {
              label: "Employee",
              value: (
                <Link
                  href={
                    `/employee/${encodeURIComponent(p.employee)}` as Route
                  }
                  className="font-medium text-ink-800 hover:underline"
                >
                  {p.employeeName ?? p.employee}
                </Link>
              ),
            },
            { label: "Reviewer", value: p.reviewer },
            { label: "Appraisal cycle", value: p.appraisalCycle },
            { label: "From", value: p.fromDate },
            { label: "To", value: p.toDate },
            { label: "Status", value: p.status },
            { label: "Reason for PIP", value: p.reasonForPip, wide: true },
            {
              label: "Improvement plan",
              value: p.improvementPlan,
              wide: true,
            },
          ]}
        />
      </section>
    </div>
  );
}

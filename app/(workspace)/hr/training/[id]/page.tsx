import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatusPill } from "@/components/common/status-pill";
import { FieldGrid } from "@/components/employee/field-grid";
import { getTrainingEvent } from "@/lib/frappe/training";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const e = await getTrainingEvent(decodeURIComponent(params.id));
  return { title: e ? `${e.eventName} · Colossal HR` : "Training · Colossal HR" };
}

export default async function TrainingEventPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const event = await getTrainingEvent(id);
  if (!event) notFound();

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/training" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to training
      </Link>

      <PageHeader
        icon={GraduationCap}
        crumb={`HR · Training · ${event.id}`}
        title={event.eventName}
        subtitle={
          <span className="flex items-center gap-2">
            <StatusPill status={event.status} />
            {event.type && <span>· {event.type}</span>}
          </span>
        }
      />

      <section className="card p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-ash-500">
          Event
        </h2>
        <FieldGrid
          fields={[
            { label: "Type", value: event.type },
            { label: "Location", value: event.location },
            { label: "Supplier", value: event.supplier },
            { label: "Start", value: event.startTime ? fmtDateTime(event.startTime) : null },
            { label: "End", value: event.endTime ? fmtDateTime(event.endTime) : null },
            { label: "Status", value: event.status },
            { label: "Introduction", value: event.introduction, wide: true },
            { label: "Description", value: event.description, wide: true },
          ]}
        />
      </section>

      <section className="card p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-ash-500">
          Attendees
        </h2>
        {event.attendees.length === 0 ? (
          <p className="text-sm text-ash-500">No attendees added yet.</p>
        ) : (
          <div className="overflow-hidden rounded-card border border-hairline">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline bg-canvas/50 text-left text-xs font-medium uppercase tracking-wide text-ash-500">
                  <th className="px-4 py-2.5">Employee</th>
                  <th className="px-4 py-2.5">Attendance</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {event.attendees.map((a, i) => (
                  <tr
                    key={`${a.employee}-${i}`}
                    className="border-b border-hairline last:border-b-0"
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        href={
                          `/employee/${encodeURIComponent(a.employee)}` as Route
                        }
                        className="flex flex-col gap-0.5 focus-ring rounded-xl"
                      >
                        <span className="font-medium text-ash-900">
                          {a.employeeName ?? a.employee}
                        </span>
                        <span className="text-xs text-ash-500">{a.employee}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-ash-800">
                      {a.attendance ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {a.status ? <StatusPill status={a.status} /> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
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

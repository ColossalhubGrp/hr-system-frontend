import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, RefreshCcw } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getMyAccess } from "@/lib/frappe/roles";
import { listAppraisalCyclesSummary } from "@/lib/frappe/performance";

export const metadata = { title: "Appraisal cycles · Colossal HR" };

export default async function AppraisalCyclesPage() {
  const access = await getMyAccess();
  if (!(access?.isHrAdmin || access?.isHrAny)) {
    redirect(
      "/forbidden?need=HR&from=" +
        encodeURIComponent("/hr/performance/cycles"),
    );
  }

  const rows = await listAppraisalCyclesSummary();

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/settings" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to Workspace settings
      </Link>

      <PageHeader
        icon={RefreshCcw}
        crumb="HR · Performance · Appraisal cycles"
        title="Appraisal cycles"
        subtitle="Every performance period HR runs — dates, framework, and the template new appraisals inherit from."
        actions={
          access.isHrAdmin ? (
            <Link
              href={"/hr/performance/cycles/new" as Route}
              className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring"
            >
              <Plus className="h-4 w-4" />
              New cycle
            </Link>
          ) : null
        }
      />

      <section className="card overflow-hidden p-0">
        {rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-ash-500">
            No cycles yet. Create one to start opening appraisals.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-hairline bg-canvas/50 text-left text-xs font-medium uppercase tracking-wide text-ash-500">
              <tr>
                <th className="px-4 py-2.5">Cycle</th>
                <th className="px-4 py-2.5">Dates</th>
                <th className="px-4 py-2.5">Framework</th>
                <th className="px-4 py-2.5">Template</th>
                <th className="px-4 py-2.5 text-right">Appraisals</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={
                        `/hr/performance/cycles/${encodeURIComponent(r.id)}` as Route
                      }
                      className="group flex flex-col focus-ring rounded-md"
                    >
                      <span className="font-medium text-ink-800 group-hover:underline">
                        {r.cycleName}
                      </span>
                      <span className="text-xs text-ash-500">
                        {r.company ?? "Company-wide"}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ash-700">
                    {fmtRange(r.startDate, r.endDate)}
                  </td>
                  <td className="px-4 py-3 text-ash-700">
                    {r.evaluationFramework ?? "KRA & Goals"}
                  </td>
                  <td className="px-4 py-3 text-ash-700">
                    {r.appraisalTemplate ? (
                      r.appraisalTemplate
                    ) : (
                      <span className="text-ash-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-ash-700">
                    {r.appraisalCount}
                  </td>
                  <td className="px-4 py-3">
                    {r.status ? (
                      <span className="rounded-chip bg-ink-50 px-2 py-0.5 text-[11px] font-medium text-ink-800">
                        {r.status}
                      </span>
                    ) : (
                      <span className="text-ash-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={
                        `/hr/performance/cycles/${encodeURIComponent(r.id)}` as Route
                      }
                      className="inline-flex rounded-md p-1.5 text-ash-500 transition hover:bg-canvas hover:text-ash-800 focus-ring"
                      title="Open cycle"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function fmtRange(start: string | null, end: string | null): string {
  if (!start && !end) return "—";
  return `${fmt(start) ?? "—"} → ${fmt(end) ?? "—"}`;
}

function fmt(iso: string | null): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

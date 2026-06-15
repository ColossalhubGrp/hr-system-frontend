import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, Building2, Plus, Pencil } from "lucide-react";
import { requireGroup } from "@/lib/frappe/require-role";
import { listCompanies } from "@/lib/frappe/companies";
import { getMyAccess } from "@/lib/frappe/roles";

export const metadata = {
  title: "Company profile · Settings · Colossal HR",
};

export default async function CompanySettingsPage() {
  await requireGroup("HR_ADMIN", "/settings/company");
  const [companies, access] = await Promise.all([
    listCompanies(),
    getMyAccess(),
  ]);
  // Write rights are tighter than read — HR Director / IT Admin / SysMgr.
  // The "Edit" pencil + "New company" CTA are hidden for read-only viewers
  // (HR Manager / HR Operations) per the visibility-based security model.
  const canWrite = access.isHrAdmin || access.isItAdmin;

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/settings" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to settings
      </Link>

      <header className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-ash-500">
            <Building2 className="h-3.5 w-3.5" />
            Settings · Company profile
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            Companies on this tenant
          </h1>
          <p className="text-sm text-ash-600">
            {companies.length} company record{companies.length === 1 ? "" : "s"}.
            Currency, country, abbreviation and holiday list flow downstream
            into payroll, attendance and letter generation.
          </p>
        </div>
        {canWrite && (
          <Link
            href={"/settings/company/new" as Route}
            className="mt-3 inline-flex h-10 w-fit items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring sm:mt-0"
          >
            <Plus className="h-4 w-4" />
            New company
          </Link>
        )}
      </header>

      <div className="overflow-hidden rounded-card border border-hairline bg-surface shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-canvas/60 text-xs uppercase tracking-wide text-ash-500">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Company</th>
              <th className="px-4 py-2.5 text-left font-medium">Abbr</th>
              <th className="px-4 py-2.5 text-left font-medium">Country</th>
              <th className="px-4 py-2.5 text-left font-medium">Currency</th>
              <th className="px-4 py-2.5 text-left font-medium">Holiday list</th>
              <th className="px-4 py-2.5 text-right font-medium">
                {canWrite ? "" : ""}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {companies.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-ash-500"
                >
                  No companies yet.{" "}
                  {canWrite && (
                    <>
                      Click{" "}
                      <Link
                        href={"/settings/company/new" as Route}
                        className="font-medium text-ink-800 underline"
                      >
                        New company
                      </Link>{" "}
                      to seed one.
                    </>
                  )}
                </td>
              </tr>
            ) : (
              companies.map((c) => (
                <tr key={c.id} className="hover:bg-canvas/40">
                  <td className="px-4 py-3 align-top font-medium text-ink-800">
                    {canWrite ? (
                      <Link
                        href={
                          `/settings/company/${encodeURIComponent(c.id)}` as Route
                        }
                        className="hover:underline"
                      >
                        {c.companyName}
                      </Link>
                    ) : (
                      c.companyName
                    )}
                    <div className="text-xs text-ash-500">{c.id}</div>
                  </td>
                  <td className="px-4 py-3 align-top text-ash-700">
                    {c.abbr ?? "—"}
                  </td>
                  <td className="px-4 py-3 align-top text-ash-700">
                    {c.country ?? "—"}
                  </td>
                  <td className="px-4 py-3 align-top text-ash-700">
                    {c.defaultCurrency ?? "—"}
                  </td>
                  <td className="px-4 py-3 align-top text-ash-700">
                    {c.defaultHolidayList ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right align-top">
                    {canWrite && (
                      <Link
                        href={
                          `/settings/company/${encodeURIComponent(c.id)}` as Route
                        }
                        className="inline-flex items-center gap-1 rounded-chip border border-hairline px-2 py-0.5 text-[11px] font-medium text-ash-700 transition hover:bg-canvas focus-ring"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

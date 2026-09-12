import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { CalendarX, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getMyAccess } from "@/lib/frappe/roles";
import { listCompanies } from "@/lib/frappe/lookups";
import { listLeaveBlockLists } from "@/lib/frappe/leave-admin";
import { LeaveBlockListsAdmin } from "@/components/settings/leave-block-lists-admin";
import { createLeaveBlockListAction } from "@/app/(workspace)/hr/leaves/admin/actions";

export const metadata = {
  title: "Leave block lists · Configuration · Colossal HR",
};

export default async function LeaveBlockListsPage() {
  const access = await getMyAccess();
  if (!(access.isHrAdmin || access.isItAdmin)) {
    redirect(
      "/forbidden?need=HR_ADMIN&from=" +
        encodeURIComponent("/settings/leave-block-lists"),
    );
  }
  const [rows, companies] = await Promise.all([
    listLeaveBlockLists(),
    listCompanies(),
  ]);
  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/settings" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to Configuration
      </Link>
      <PageHeader
        icon={CalendarX}
        crumb="Configuration · HR policy · Leave block lists"
        title="Leave block lists"
        subtitle="Dates on which leave applications are refused unless the applier's approver is on the bypass list. Use for year-end close, product launches, exam periods."
      />
      <LeaveBlockListsAdmin
        rows={rows}
        companies={companies}
        createAction={createLeaveBlockListAction}
      />
    </div>
  );
}

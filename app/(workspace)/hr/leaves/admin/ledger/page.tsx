import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { ChevronLeft, FileClock } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { LedgerTab } from "@/components/leaves/admin-hub";
import { listLeaveLedgerEntries } from "@/lib/frappe/leave-admin";
import { getMyAccess } from "@/lib/frappe/roles";

export const metadata = { title: "Leave ledger · Colossal HR" };

export default async function LeaveLedgerPage() {
  const access = await getMyAccess();
  if (!(access.isHrAdmin || access.isItAdmin || access.isHrAny)) {
    redirect(
      "/forbidden?need=HR_ANY&from=" +
        encodeURIComponent("/hr/leaves/admin/ledger"),
    );
  }
  const rows = await listLeaveLedgerEntries();

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/leaves/admin" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to leave admin
      </Link>
      <PageHeader
        icon={FileClock}
        crumb="HR · Leaves · Admin · Ledger"
        title="Leave audit ledger"
        subtitle="Immutable journal of every credit and debit against every leave balance. Every submitted Allocation, Application, Encashment, Comp-off request, or Adjustment posts one row here — use it for reconciliation, dispute resolution and auditor trails."
      />
      <LedgerTab rows={rows} />
    </div>
  );
}

import Link from "next/link";
import type { Route } from "next";
import { Coins, Plus, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { StatusPill } from "@/components/common/status-pill";
import { listModesOfPayment, type ModeOfPayment } from "@/lib/frappe/masters/mode-of-payment";

export const metadata = { title: "Modes of Payment · Masters · Accounting · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function ModesOfPaymentPage() {
  const rows = await listModesOfPayment();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Accounting
        </Link>
      </div>
      <PageHeader
        icon={Coins}
        crumb="Accounting · Masters · Modes of Payment"
        title="Modes of Payment"
        subtitle={`${rows.length.toLocaleString()} configured — Payment Entry and Invoices link here.`}
        actions={
          <Link
            href={"/accounting/masters/modes-of-payment/new" as Route}
            className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring"
          >
            <Plus className="h-4 w-4" />
            New mode
          </Link>
        }
      />

      <DataTable<ModeOfPayment>
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/accounting/masters/modes-of-payment/${encodeURIComponent(r.name)}`}
        empty={
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Coins className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No modes yet. Add Cash, Bank Transfer, EcoCash, Mukuru — whatever your business uses.</p>
          </div>
        }
        columns={[
          { header: "Name", cell: (r) => <Link href={`/accounting/masters/modes-of-payment/${encodeURIComponent(r.name)}` as Route} className="font-semibold text-foreground hover:underline">{r.modeOfPayment}</Link> },
          { header: "Type", cell: (r) => r.type },
          { header: "Status", cell: (r) => <StatusPill status={r.enabled ? "Enabled" : "Disabled"} /> },
        ]}
      />
    </div>
  );
}

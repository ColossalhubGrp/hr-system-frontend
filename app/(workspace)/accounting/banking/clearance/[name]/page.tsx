import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ArrowLeftRight, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatusPill } from "@/components/common/status-pill";
import { getBankClearance } from "@/lib/frappe/banking/bank-clearance";
import { BankClearanceDetail } from "@/components/accounting/bank-clearance-detail";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Bank Clearance · Colossal HR` };
}

export default async function BankClearancePage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name);
  const doc = await getBankClearance(name);
  if (!doc) notFound();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/banking/clearance" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Bank Clearance
        </Link>
      </div>
      <PageHeader
        icon={ArrowLeftRight}
        crumb={`Accounting · Banking · Clearance · ${doc.name}`}
        title={doc.name}
        subtitle={`${doc.account} · ${doc.fromDate} → ${doc.toDate}`}
        actions={<StatusPill status={doc.docstatus === 0 ? "Draft" : doc.docstatus === 1 ? "Submitted" : "Cancelled"} />}
      />
      <BankClearanceDetail name={doc.name} initialRows={doc.payments} docstatus={doc.docstatus} />
    </div>
  );
}

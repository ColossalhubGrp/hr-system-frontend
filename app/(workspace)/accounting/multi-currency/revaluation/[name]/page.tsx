import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { RefreshCw, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatusPill } from "@/components/common/status-pill";
import { getRevaluation } from "@/lib/frappe/multi-currency/revaluation";
import { RevaluationDetail } from "@/components/accounting/revaluation-detail";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Exchange Rate Revaluation · Colossal HR` };
}

export default async function RevaluationDetailPage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name);
  const doc = await getRevaluation(name);
  if (!doc) notFound();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/multi-currency/revaluation" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Revaluation
        </Link>
      </div>
      <PageHeader
        icon={RefreshCw}
        crumb={`Accounting · Multi-Currency · Revaluation · ${doc.name}`}
        title={doc.name}
        subtitle={`${doc.company} · ${doc.postingDate}`}
        actions={<StatusPill status={doc.docstatus === 0 ? "Draft" : doc.docstatus === 1 ? "Submitted" : "Cancelled"} />}
      />
      <RevaluationDetail name={doc.name} docstatus={doc.docstatus} rows={doc.accounts} totalGainLoss={doc.totalGainLoss} />
    </div>
  );
}

import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ArrowRightLeft, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatusPill } from "@/components/common/status-pill";
import { listCompanies, listAccounts } from "@/lib/frappe/accounting";
import { listShareholders } from "@/lib/frappe/shares/shareholder";
import { getShareTransfer } from "@/lib/frappe/shares/share-transfer";
import { ShareTransferForm } from "@/components/accounting/share-transfer-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Share Transfer · Colossal HR` };
}

export default async function EditShareTransferPage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name);
  const [doc, companies, shareholders] = await Promise.all([getShareTransfer(name), listCompanies(), listShareholders()]);
  if (!doc) notFound();
  const accounts = await listAccounts(doc.company, { limit: 200 });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/shares/transfers" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Share Transfers
        </Link>
      </div>
      <PageHeader
        icon={ArrowRightLeft}
        crumb={`Accounting · Shares · Transfers · ${doc.name}`}
        title={doc.name}
        subtitle={`${doc.transferType} · ${doc.date} · ${doc.company}`}
        actions={<StatusPill status={doc.docstatus === 0 ? "Draft" : doc.docstatus === 1 ? "Submitted" : "Cancelled"} />}
      />
      <ShareTransferForm
        mode="edit"
        name={doc.name}
        companies={companies.map((c) => c.name)}
        shareholders={shareholders.map((s) => s.name)}
        accounts={accounts}
        defaultDate={doc.date}
        initial={doc}
      />
    </div>
  );
}

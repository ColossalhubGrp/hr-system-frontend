import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { Users, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies } from "@/lib/frappe/accounting";
import { getShareholder } from "@/lib/frappe/shares/shareholder";
import { ShareholderForm } from "@/components/accounting/shareholder-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Shareholder · Colossal HR` };
}

export default async function EditShareholderPage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name);
  const [doc, companies] = await Promise.all([getShareholder(name), listCompanies()]);
  if (!doc) notFound();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/shares/shareholders" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Shareholders
        </Link>
      </div>
      <PageHeader icon={Users} crumb={`Accounting · Shares · Shareholders · ${doc.title}`} title={doc.title} subtitle={`${doc.company}${doc.folioNo ? ` · Folio ${doc.folioNo}` : ""}`} />
      <ShareholderForm mode="edit" name={doc.name} companies={companies.map((c) => c.name)} initial={doc} />
    </div>
  );
}

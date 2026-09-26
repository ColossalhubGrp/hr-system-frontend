import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { Building, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listAccounts } from "@/lib/frappe/accounting";
import { getCompanyMaster } from "@/lib/frappe/masters/company";
import { EditCompanyForm } from "@/components/accounting/edit-company-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Company · Colossal HR` };
}

export default async function EditCompanyPage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name);
  const doc = await getCompanyMaster(name);
  if (!doc) notFound();
  const accounts = await listAccounts(doc.name, { limit: 200 });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/masters/companies" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Companies
        </Link>
      </div>
      <PageHeader
        icon={Building}
        crumb={`Accounting · Masters · Companies · ${doc.companyName}`}
        title={doc.companyName}
        subtitle={`${doc.abbr} · ${doc.defaultCurrency}${doc.country ? ` · ${doc.country}` : ""}${doc.disabled ? " · Disabled" : ""}`}
      />
      <EditCompanyForm initial={doc} accounts={accounts} />
    </div>
  );
}

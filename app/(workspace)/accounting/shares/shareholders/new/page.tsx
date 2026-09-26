import { Users, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies } from "@/lib/frappe/accounting";
import { ShareholderForm } from "@/components/accounting/shareholder-form";
import Link from "next/link";
import type { Route } from "next";

export const metadata = { title: "New Shareholder · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewShareholderPage() {
  const companies = await listCompanies();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/shares/shareholders" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Shareholders
        </Link>
      </div>
      <PageHeader
        icon={Users}
        crumb="Accounting · Shares · Shareholders · New"
        title="New Shareholder"
        subtitle="Add a name to the register."
      />
      <ShareholderForm mode="create" companies={companies.map((c) => c.name)} />
    </div>
  );
}

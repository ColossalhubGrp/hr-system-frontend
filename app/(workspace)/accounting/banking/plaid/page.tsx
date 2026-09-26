import Link from "next/link";
import type { Route } from "next";
import { ScrollText, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getPlaidSettings } from "@/lib/frappe/banking/plaid-settings";
import { PlaidForm } from "@/components/accounting/plaid-form";

export const metadata = { title: "Plaid Settings · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function PlaidPage() {
  const initial = await getPlaidSettings();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Accounting
        </Link>
      </div>
      <PageHeader
        icon={ScrollText}
        crumb="Accounting · Banking · Plaid"
        title="Plaid Settings"
        subtitle="Credentials for linking external US bank accounts via Plaid."
      />
      <PlaidForm initial={initial} />
    </div>
  );
}

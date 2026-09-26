import Link from "next/link";
import type { Route } from "next";
import { ScrollText, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getAccountsSettings } from "@/lib/frappe/masters/accounts-settings";
import { AccountsSettingsForm } from "@/components/accounting/accounts-settings-form";

export const metadata = { title: "Accounts Settings · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function AccountsSettingsPage() {
  const initial = await getAccountsSettings();
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
        crumb="Accounting · Masters · Accounts Settings"
        title="Accounts Settings"
        subtitle="Site-wide switches: perpetual inventory, credit control, cancellation policy, deferred revenue, print options."
      />
      <AccountsSettingsForm initial={initial} />
    </div>
  );
}

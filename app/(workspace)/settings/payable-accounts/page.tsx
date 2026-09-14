import { redirect } from "next/navigation";
import { Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SettingsBackLink } from "@/components/settings/settings-back-link";
import { PayableAccountsAdmin } from "@/components/settings/payable-accounts-admin";
import {
  getDefaultCompanyForMe,
  listPayableAccountsForCompany,
} from "@/lib/frappe/payable-accounts";
import { listCompanies } from "@/lib/frappe/lookups";
import { getMyAccess } from "@/lib/frappe/roles";

export const metadata = { title: "Payable accounts · Settings · Colossal HR" };

type SP = { company?: string };

export default async function PayableAccountsPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const access = await getMyAccess();
  if (!(access.isHrAdmin || access.isItAdmin || access.isHrAny)) {
    redirect(
      "/forbidden?need=HR_ANY&from=" +
        encodeURIComponent("/settings/payable-accounts"),
    );
  }
  const [companies, defaultCompany] = await Promise.all([
    listCompanies(),
    getDefaultCompanyForMe(),
  ]);
  const activeCompany =
    (searchParams.company && companies.includes(searchParams.company)
      ? searchParams.company
      : null) ||
    defaultCompany ||
    companies[0] ||
    "";
  const rows = activeCompany
    ? await listPayableAccountsForCompany(activeCompany)
    : [];
  const canManage = Boolean(access.isHrAdmin || access.isItAdmin);
  return (
    <div className="flex flex-col gap-5">
      <SettingsBackLink />
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Wallet className="h-3.5 w-3.5" />
          Settings · Payable accounts
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Payable accounts
        </h1>
        <p className="text-sm text-muted-foreground">
          The Liability accounts the Expense Claim form (and any future
          payables flow) can post against. Manage them here without opening the
          ERPNext Accounting UI.
        </p>
      </header>
      <Card>
        <CardContent className="p-0">
          <PayableAccountsAdmin
            initial={rows}
            companies={companies}
            activeCompany={activeCompany}
            canManage={canManage}
          />
        </CardContent>
      </Card>
    </div>
  );
}

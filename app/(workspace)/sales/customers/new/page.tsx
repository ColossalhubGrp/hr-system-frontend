import Link from "next/link";
import type { Route } from "next";
import { Users, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCurrencies } from "@/lib/frappe/multi-currency/currency";
import { listPaymentTerms } from "@/lib/frappe/masters/payment-term";
import { listCustomerGroups } from "@/lib/frappe/sales/customer-group";
import { listTerritories } from "@/lib/frappe/sales/customer";
import { CustomerForm } from "@/components/sales/customer-form";

export const metadata = { title: "New Customer · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewCustomerPage() {
  const [groups, territories, currencies, terms] = await Promise.all([
    listCustomerGroups(),
    listTerritories(),
    listCurrencies(),
    listPaymentTerms(),
  ]);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/sales/customers" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Customers
        </Link>
      </div>
      <PageHeader
        icon={Users}
        crumb="Sales · Customers · New"
        title="New Customer"
        subtitle="Capture a new customer so you can bill them."
      />
      <CustomerForm
        mode="create"
        customerGroups={groups.map((g) => g.name)}
        territories={territories}
        currencies={currencies.filter((c) => c.enabled).map((c) => c.name)}
        paymentTerms={terms.map((t) => t.name)}
      />
    </div>
  );
}

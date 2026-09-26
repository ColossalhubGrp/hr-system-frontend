import Link from "next/link";
import type { Route } from "next";
import { Truck, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCurrencies } from "@/lib/frappe/multi-currency/currency";
import { listPaymentTerms } from "@/lib/frappe/masters/payment-term";
import { listSupplierGroups } from "@/lib/frappe/buying/supplier-group";
import { listCountries } from "@/lib/frappe/masters/company";
import { SupplierForm } from "@/components/buying/supplier-form";

export const metadata = { title: "New Supplier · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewSupplierPage() {
  const [groups, countries, currencies, terms] = await Promise.all([
    listSupplierGroups(),
    listCountries(),
    listCurrencies(),
    listPaymentTerms(),
  ]);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/buying/suppliers" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Suppliers
        </Link>
      </div>
      <PageHeader
        icon={Truck}
        crumb="Buying · Suppliers · New"
        title="New Supplier"
        subtitle="Capture a new supplier so you can record their bills."
      />
      <SupplierForm
        mode="create"
        supplierGroups={groups.map((g) => g.name)}
        countries={countries}
        currencies={currencies.filter((c) => c.enabled).map((c) => c.name)}
        paymentTerms={terms.map((t) => t.name)}
      />
    </div>
  );
}

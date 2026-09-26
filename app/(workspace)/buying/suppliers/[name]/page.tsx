import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { Truck, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCurrencies } from "@/lib/frappe/multi-currency/currency";
import { listPaymentTermsTemplates } from "@/lib/frappe/masters/payment-terms-template";
import {
  listLanguages,
  listPriceLists,
  listTaxCategories,
} from "@/lib/frappe/masters/link-lookups";
import { listSupplierGroups } from "@/lib/frappe/buying/supplier-group";
import { listCountries } from "@/lib/frappe/masters/company";
import { getSupplier } from "@/lib/frappe/buying/supplier";
import { SupplierForm } from "@/components/buying/supplier-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Supplier · Colossal HR` };
}

export default async function EditSupplierPage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name);
  const [doc, groups, countries, currencies, termsTemplates, languages, priceLists, taxCategories] = await Promise.all([
    getSupplier(name),
    listSupplierGroups(),
    listCountries(),
    listCurrencies(),
    listPaymentTermsTemplates(),
    listLanguages(),
    listPriceLists(),
    listTaxCategories(),
  ]);
  if (!doc) notFound();

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
        crumb={`Buying · Suppliers · ${doc.supplierName}`}
        title={doc.supplierName}
        subtitle={`${doc.supplierType}${doc.supplierGroup ? ` · ${doc.supplierGroup}` : ""}${doc.country ? ` · ${doc.country}` : ""}`}
      />
      <SupplierForm
        mode="edit"
        name={doc.name}
        supplierGroups={groups.map((g) => g.name)}
        countries={countries}
        currencies={currencies.map((c) => c.name)}
        paymentTerms={termsTemplates.map((t) => t.name)}
        languages={languages}
        priceLists={priceLists}
        taxCategories={taxCategories}
        initial={doc}
      />
    </div>
  );
}

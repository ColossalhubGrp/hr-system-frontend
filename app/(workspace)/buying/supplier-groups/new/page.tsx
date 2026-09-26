import Link from "next/link";
import type { Route } from "next";
import { Layers, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listSupplierGroups } from "@/lib/frappe/buying/supplier-group";
import { SupplierGroupForm } from "@/components/buying/supplier-group-form";

export const metadata = { title: "New Supplier Group · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewSupplierGroupPage() {
  const parents = await listSupplierGroups();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/buying/supplier-groups" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Supplier Groups
        </Link>
      </div>
      <PageHeader
        icon={Layers}
        crumb="Buying · Supplier Groups · New"
        title="New Supplier Group"
        subtitle="Bucket for supplier records."
      />
      <SupplierGroupForm mode="create" parents={parents.filter((p) => p.isGroup).map((p) => p.name)} />
    </div>
  );
}

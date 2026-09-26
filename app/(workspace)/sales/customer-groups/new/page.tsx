import Link from "next/link";
import type { Route } from "next";
import { Layers, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCustomerGroups } from "@/lib/frappe/sales/customer-group";
import { CustomerGroupForm } from "@/components/sales/customer-group-form";

export const metadata = { title: "New Customer Group · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewCustomerGroupPage() {
  const parents = await listCustomerGroups();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/sales/customer-groups" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Customer Groups
        </Link>
      </div>
      <PageHeader
        icon={Layers}
        crumb="Sales · Customer Groups · New"
        title="New Customer Group"
        subtitle="Bucket for customer records."
      />
      <CustomerGroupForm mode="create" parents={parents.filter((p) => p.isGroup).map((p) => p.name)} />
    </div>
  );
}

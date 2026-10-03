import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { Package, ChevronLeft } from "lucide-react";
import Image from "next/image";
import { PageHeader } from "@/components/common/page-header";
import { StatusPill } from "@/components/common/status-pill";
import { getItem } from "@/lib/frappe/item";
import { ItemActions } from "@/components/accounting/item-actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Item · Colossal HR` };
}

export default async function ItemDetailPage({
  params,
}: {
  params: { name: string };
}) {
  const name = decodeURIComponent(params.name);
  const doc = await getItem(name);
  if (!doc) notFound();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link
          href={"/accounting/items" as Route}
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Items
        </Link>
      </div>

      <PageHeader
        icon={Package}
        crumb={`Accounting · Items · ${doc.itemCode}`}
        title={doc.itemName}
        subtitle={`${doc.itemCode} · ${doc.itemGroup ?? "—"} · ${doc.stockUom}`}
        actions={
          <div className="flex items-center gap-3">
            <StatusPill status={doc.disabled ? "Disabled" : "Active"} />
            <ItemActions name={doc.name} disabled={doc.disabled} />
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <section className="rounded-2xl border border-border/60 bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Basics
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Item Code" value={doc.itemCode} mono />
            <Detail label="Item Name" value={doc.itemName} />
            <Detail label="Item Group" value={doc.itemGroup ?? "—"} />
            <Detail label="Unit of Measure" value={doc.stockUom} mono />
            <Detail label="Standard Rate" value={fmt(doc.standardRate)} />
            <Detail
              label="Weight / unit"
              value={doc.weightPerUnit ? `${fmt(doc.weightPerUnit)} ${doc.weightUom ?? ""}`.trim() : "—"}
            />
          </div>
          {doc.description && (
            <div className="mt-4 rounded-xl border border-border/40 bg-muted/20 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Description
              </div>
              <div
                className="prose prose-sm mt-1 max-w-none text-sm text-foreground"
                // Frappe's Text Editor fields are already sanitised at save time.
                dangerouslySetInnerHTML={{ __html: doc.description }}
              />
            </div>
          )}
        </section>

        <section className="flex items-center justify-center rounded-2xl border border-border/60 bg-card p-3">
          {doc.image ? (
            <Image
              src={doc.image}
              alt={doc.itemName}
              width={240}
              height={240}
              className="h-auto max-h-56 w-auto rounded-lg object-contain"
              unoptimized
            />
          ) : (
            <div className="grid h-56 w-full place-items-center rounded-lg bg-muted/40 text-xs text-muted-foreground">
              No image
            </div>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-border/60 bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Flags & Inventory
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Maintain stock" value={doc.isStockItem ? "Yes" : "No"} />
          <Detail label="Fixed asset" value={doc.isFixedAsset ? "Yes" : "No"} />
          <Detail label="Variants" value={doc.hasVariants ? "Yes" : "No"} />
          <Detail label="Batch tracked" value={doc.hasBatchNo ? "Yes" : "No"} />
          <Detail label="Serial tracked" value={doc.hasSerialNo ? "Yes" : "No"} />
          <Detail label="Opening stock" value={fmt(doc.openingStock)} />
          <Detail label="Valuation rate" value={fmt(doc.valuationRate)} />
          <Detail
            label="Shelf life"
            value={doc.shelfLifeInDays ? `${doc.shelfLifeInDays} days` : "—"}
          />
          <Detail label="End of life" value={doc.endOfLife ?? "—"} />
        </div>
      </section>

      {doc.itemDefaults.length > 0 && (
        <section className="rounded-2xl border border-border/60 bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Per-company defaults
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-x-4 border-spacing-y-0 text-sm">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="border-b border-border/60 py-2 text-left">Company</th>
                  <th className="border-b border-border/60 py-2 text-left">Default Warehouse</th>
                  <th className="border-b border-border/60 py-2 text-left">Income Account</th>
                  <th className="border-b border-border/60 py-2 text-left">Expense Account</th>
                </tr>
              </thead>
              <tbody>
                {doc.itemDefaults.map((d, i) => (
                  <tr key={i}>
                    <td className="py-2 font-medium">{d.company}</td>
                    <td className="py-2 text-muted-foreground">{d.defaultWarehouse ?? "—"}</td>
                    <td className="py-2 text-muted-foreground">{d.incomeAccount ?? "—"}</td>
                    <td className="py-2 text-muted-foreground">{d.expenseAccount ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-sm text-foreground ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

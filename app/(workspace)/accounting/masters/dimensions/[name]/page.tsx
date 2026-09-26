import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { Layers, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getAccountingDimension } from "@/lib/frappe/masters/accounting-dimension";
import { DimensionForm } from "@/components/accounting/dimension-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Accounting Dimension · Colossal HR` };
}

export default async function EditDimensionPage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name);
  const doc = await getAccountingDimension(name);
  if (!doc) notFound();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/masters/dimensions" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Accounting Dimensions
        </Link>
      </div>
      <PageHeader
        icon={Layers}
        crumb={`Accounting · Masters · Accounting Dimensions · ${doc.label}`}
        title={doc.label}
        subtitle={`${doc.documentType} · ${doc.fieldname}${doc.disabled ? " · Disabled" : ""}`}
      />
      <DimensionForm
        mode="edit"
        name={doc.name}
        initial={{ label: doc.label, documentType: doc.documentType, fieldname: doc.fieldname, disabled: doc.disabled }}
      />

      {doc.dimensionDefaults.length > 0 && (
        <section className="rounded-2xl border border-border/60 bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Per-company defaults</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 text-left">Company</th>
                  <th className="py-2 text-left">Reference doc</th>
                  <th className="py-2 text-left">Default</th>
                  <th className="py-2 text-left">Required on BS?</th>
                  <th className="py-2 text-left">Required on P&L?</th>
                </tr>
              </thead>
              <tbody>
                {doc.dimensionDefaults.map((d) => (
                  <tr key={d.idx} className="border-b border-border/30 last:border-0">
                    <td className="py-2 pr-2">{d.company}</td>
                    <td className="py-2 pr-2 text-muted-foreground">{d.referenceDocument}</td>
                    <td className="py-2 pr-2 font-medium">{d.defaultDimension}</td>
                    <td className="py-2 pr-2">{d.mandatoryForBs ? "Yes" : "No"}</td>
                    <td className="py-2 pr-2">{d.mandatoryForPl ? "Yes" : "No"}</td>
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

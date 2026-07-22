import { Construction } from "lucide-react";

/**
 * Semantic layer explorer — planned surface for browsing metric and
 * dimension definitions, editing formulas, and viewing lineage. Placeholder
 * page while the underlying tooling is built out; the nav entry is live so
 * discoverability starts now.
 */

export const metadata = {
  title: "Semantics · Business Intelligence · Colossal HR",
};

export default function SemanticsPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <span className="mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Construction className="h-8 w-8" />
      </span>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Semantic layer — Under Construction
      </h1>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground">
        This is where the catalog of metrics, dimensions, and their SQL
        definitions will be browsable and editable in-app. Ask (AI) already
        reads from the semantic layer today — this admin surface is next.
      </p>
      <div className="mt-8 grid w-full max-w-2xl gap-3 text-left sm:grid-cols-2">
        <PlannedCard
          title="Metric catalog"
          body="Browse and edit every governed metric, its SQL template, allowed dimensions, and access policy."
        />
        <PlannedCard
          title="Dimension inventory"
          body="See where each dimension comes from — source doctype, field, joins — and which metrics can slice by it."
        />
        <PlannedCard
          title="Lineage view"
          body="Trace a KPI back through its formula, source tables, and any derived metrics that depend on it."
        />
        <PlannedCard
          title="Change history"
          body="Who edited a metric definition and why. Every change is audited via the standard Frappe timeline."
        />
      </div>
    </div>
  );
}

function PlannedCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-input bg-card/60 p-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}

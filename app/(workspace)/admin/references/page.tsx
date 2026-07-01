import Link from "next/link";
import type { Route } from "next";
import { Database, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { listMasters, listAvailableModules } from "@/lib/references/server";
import { NewMasterDialog } from "@/components/references/new-master-dialog";

export const metadata = { title: "Reference data · Admin · Colossal HR" };

export default async function ReferenceMastersPage() {
  const [masters, modules] = await Promise.all([
    listMasters(),
    listAvailableModules(),
  ]);
  const grouped = groupByModule(masters);
  const totalRows = masters.reduce((s, m) => s + m.rowCount, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Database}
        crumb="Admin · Reference data"
        title="Reference masters"
        subtitle={
          masters.length === 0
            ? "No masters created yet. The bench-wide framework creates them as Select fields get promoted to Link."
            : `${masters.length} master${masters.length === 1 ? "" : "s"} · ${totalRows.toLocaleString()} total row${totalRows === 1 ? "" : "s"} across the bench.`
        }
        actions={<NewMasterDialog modules={modules} />}
      />

      {masters.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Database className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground max-w-md">
              When a hardcoded dropdown gets promoted to admin-managed
              reference data, the resulting master DocType shows up here
              automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([module, items]) => (
          <section key={module} className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {module}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((m) => (
                <Link
                  key={m.name}
                  href={`/admin/references/${encodeURIComponent(m.name)}` as Route}
                  className="group rounded-xl border bg-card p-4 transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {m.name}
                      </p>
                      {m.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {m.description}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Badge variant="secondary">{m.rowCount} rows</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function groupByModule(
  masters: Awaited<ReturnType<typeof listMasters>>,
): Record<string, Awaited<ReturnType<typeof listMasters>>> {
  const out: Record<string, typeof masters> = {};
  for (const m of masters) {
    const k = m.module || "Other";
    (out[k] ??= []).push(m);
  }
  for (const k of Object.keys(out)) {
    out[k]!.sort((a, b) => a.name.localeCompare(b.name));
  }
  return out;
}

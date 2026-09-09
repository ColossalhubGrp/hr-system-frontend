import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, ChevronRight, Database } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/common/page-header";
import { listMasters, listAvailableModules } from "@/lib/references/server";
import { NewMasterDialog } from "@/components/references/new-master-dialog";

// Masters configured at the code level (not through this UI) — hidden
// from every persona in the tenant, including platform operators. If
// the engineer needs to edit them they go through Frappe Desk directly.
const CODE_LEVEL_MASTERS = new Set(["AI Model Provider"]);

export const metadata = { title: "Reference data · Configuration · Colossal HR" };

export default async function ReferenceMastersPage() {
  const [allMasters, modules] = await Promise.all([
    listMasters(),
    listAvailableModules(),
  ]);
  const masters = allMasters
    .filter((m) => !CODE_LEVEL_MASTERS.has(m.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  const totalRows = masters.reduce((s, m) => s + m.rowCount, 0);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={"/settings" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to Configuration
      </Link>
      <PageHeader
        icon={Database}
        crumb="Configuration · Company-wide · Reference data"
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
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Master</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Rows</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {masters.map((m) => {
                  const href = `/admin/references/${encodeURIComponent(m.name)}` as Route;
                  return (
                    <TableRow key={m.name} className="group">
                      <TableCell className="align-top font-medium">
                        <Link href={href} className="text-foreground hover:underline">
                          {m.name}
                        </Link>
                      </TableCell>
                      <TableCell className="align-top text-muted-foreground">
                        <Link href={href} className="block">
                          {m.description || "—"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right align-top text-muted-foreground">
                        <Link href={href} className="block">
                          {m.rowCount.toLocaleString()}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right align-top">
                        <Link
                          href={href}
                          className="inline-flex text-muted-foreground group-hover:text-foreground"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


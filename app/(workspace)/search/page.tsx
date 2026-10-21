import Link from "next/link";
import type { Route } from "next";
import { Search as SearchIcon } from "lucide-react";
import { frappeCall } from "@/lib/frappe/client";

export const metadata = { title: "Search · Colossal ERP" };
export const dynamic = "force-dynamic";

type Hit = { doctype: string; name: string; label: string; href: string };

const SCOPES: Array<{
  doctype: string;
  display: string;
  labelField: string;
  hrefTemplate: (name: string) => string;
}> = [
  { doctype: "Employee",                 display: "Employees",        labelField: "employee_name",  hrefTemplate: (n) => `/employee/${encodeURIComponent(n)}` },
  { doctype: "Customer",                 display: "Customers",        labelField: "customer_name",  hrefTemplate: (n) => `/sales/customers/${encodeURIComponent(n)}` },
  { doctype: "Supplier",                 display: "Suppliers",        labelField: "supplier_name",  hrefTemplate: (n) => `/buying/suppliers/${encodeURIComponent(n)}` },
  { doctype: "Item",                     display: "Items",            labelField: "item_name",      hrefTemplate: (n) => `/accounting/items/${encodeURIComponent(n)}` },
  { doctype: "Colossal Sales Invoice",   display: "Sales invoices",   labelField: "customer_name",  hrefTemplate: (n) => `/accounting/sales-invoices/${encodeURIComponent(n)}` },
  { doctype: "Colossal Purchase Invoice",display: "Purchase invoices",labelField: "supplier_name",  hrefTemplate: (n) => `/accounting/purchase-invoices/${encodeURIComponent(n)}` },
  { doctype: "Colossal Account",         display: "Accounts",         labelField: "account_name",   hrefTemplate: (n) => `/accounting/chart-of-accounts/${encodeURIComponent(n)}` },
];

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams?.q ?? "").trim();

  const groups = q.length >= 2 ? await runSearch(q) : [];
  const totalHits = groups.reduce((a, g) => a + g.hits.length, 0);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">— Search</div>
        <h1 className="mt-1 text-[22px] font-bold leading-tight tracking-tight text-foreground">
          Search results
        </h1>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
          Looking across employees, customers, suppliers, items, invoices and accounts.
        </p>
      </div>

      <form action="/search" method="get" className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xl">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Type part of a name, invoice number, or ID…"
            autoFocus
            className="h-10 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm focus-ring"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-10 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Search
        </button>
      </form>

      {q.length < 2 && (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Type at least two characters to search.
        </div>
      )}

      {q.length >= 2 && totalHits === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Nothing matched <strong className="font-semibold">&ldquo;{q}&rdquo;</strong>. Try a shorter or different phrase.
        </div>
      )}

      {groups.map((g) => (
        <section key={g.doctype} className="rounded-xl border border-border bg-card">
          <header className="flex items-center justify-between border-b border-border px-4 py-2">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{g.display}</h2>
            <span className="text-[11px] text-muted-foreground">{g.hits.length}</span>
          </header>
          <ul className="divide-y divide-border/60">
            {g.hits.map((h) => (
              <li key={`${h.doctype}:${h.name}`}>
                <Link
                  href={h.href as Route}
                  className="flex items-center justify-between gap-3 px-4 py-2 text-[13px] hover:bg-muted/40"
                >
                  <span className="truncate font-medium text-foreground">{h.label}</span>
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{h.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

type Group = { doctype: string; display: string; hits: Hit[] };

async function runSearch(q: string): Promise<Group[]> {
  // One query per scope, in parallel. Each uses `like %q%` so a user
  // typing a partial name/code gets hits. Scopes that fail (permission,
  // doctype missing on this tenant) quietly drop out instead of
  // breaking the whole search.
  const needle = `%${q}%`;
  const results = await Promise.all(
    SCOPES.map(async (s) => {
      try {
        const rows = await frappeCall<Array<Record<string, unknown>>>({
          method: "frappe.client.get_list",
          as: "user",
          args: {
            doctype: s.doctype,
            fields: ["name", s.labelField],
            // Match on either `name` (id) OR the label field (e.g.
            // employee_name, customer_name). Frappe v15 ANDs
            // `filters` with `or_filters`, so passing both would
            // require BOTH to match — we want either.
            or_filters: [
              ["name", "like", needle],
              [s.labelField, "like", needle],
            ],
            limit_page_length: 10,
            order_by: "modified desc",
          },
        });
        const hits: Hit[] = (rows ?? []).map((r) => ({
          doctype: s.doctype,
          name: String(r.name ?? ""),
          label: String(r[s.labelField] ?? r.name ?? ""),
          href: s.hrefTemplate(String(r.name ?? "")),
        }));
        return { doctype: s.doctype, display: s.display, hits };
      } catch {
        return { doctype: s.doctype, display: s.display, hits: [] };
      }
    }),
  );
  return results.filter((g) => g.hits.length > 0);
}

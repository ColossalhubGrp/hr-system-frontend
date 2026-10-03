import Link from "next/link";
import type { Route } from "next";
import { Layers, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listItemGroups } from "@/lib/frappe/item";
import { createItemGroupAction } from "@/app/(workspace)/accounting/items/actions";
import { ItemGroupRow } from "@/components/accounting/item-group-row";

export const metadata = { title: "Item Groups · Accounting · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function ItemGroupsPage() {
  const groups = await listItemGroups();

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
        icon={Layers}
        crumb="Accounting · Items · Groups"
        title="Item Groups"
        subtitle={`${groups.length.toLocaleString()} groups. New items pick one of these.`}
      />

      <section className="rounded-2xl border border-border/60 bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          New group
        </h2>
        <form action={createItemGroupAction} className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-[200px] flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="group_name">
              Name
            </label>
            <input
              id="group_name"
              name="group_name"
              required
              placeholder="e.g. Services"
              className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
            />
          </div>
          <div className="flex min-w-[200px] flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="parent">
              Parent
            </label>
            <select
              id="parent"
              name="parent"
              defaultValue="All Item Groups"
              className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="All Item Groups">All Item Groups</option>
              {groups.map((g) => (
                <option key={g.name} value={g.name}>{g.name}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="h-10 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white hover:bg-ink-700"
          >
            Add group
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Existing groups
        </h2>
        {groups.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No groups yet. Add one above so new items have somewhere to live.
          </p>
        ) : (
          <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g) => (
              <ItemGroupRow key={g.name} name={g.name} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

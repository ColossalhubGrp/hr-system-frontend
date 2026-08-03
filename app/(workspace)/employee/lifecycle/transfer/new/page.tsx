import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, ChevronRight, GitBranch } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { TRANSFER_TYPES } from "@/lib/frappe/transfer-types";

export const metadata = {
  title: "Pick transfer type · Colossal HR",
};

/**
 * Step 1 of the typed transfer flow: HR picks WHICH Employee field is
 * changing. Each card links to /transfer/new/<slug> which renders the
 * tailored form. Static route beats the dynamic /[kind]/new for
 * `transfer`, so the other lifecycle kinds are unaffected.
 */
export default function NewTransferTypePickerPage() {
  const types = Object.values(TRANSFER_TYPES);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/employee/lifecycle/transfer" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to transfer
      </Link>

      <PageHeader
        icon={GitBranch}
        crumb="Employee · Lifecycle · New transfer"
        title="What kind of transfer?"
        subtitle="Each type changes one Employee field. Pick the one that fits — the next step captures the target value."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {types.map((t) => {
          const Icon = t.icon;
          const href = `/employee/lifecycle/transfer/new/${t.slug}` as Route;
          return (
            <Link
              key={t.slug}
              href={href}
              className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Card className="h-full transition hover:border-primary/40 hover:shadow-md">
                <CardContent className="flex h-full flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {t.label}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

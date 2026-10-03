"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { Pencil, Ban, CheckCircle2, AlertCircle } from "lucide-react";
import { setItemDisabledAction } from "@/app/(workspace)/accounting/items/actions";
import { cn } from "@/lib/cn";

export function ItemActions({
  name,
  disabled,
}: {
  name: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = () => {
    setError(null);
    startTransition(async () => {
      const res = await setItemDisabledAction(name, !disabled);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <Link
          href={`/accounting/items/${encodeURIComponent(name)}/edit` as Route}
          className="inline-flex h-9 items-center gap-1.5 rounded-chip border border-input bg-transparent px-3 text-sm font-semibold hover:bg-muted/40 focus-ring"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Link>
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-chip border px-3 text-sm font-semibold disabled:opacity-60",
            disabled
              ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              : "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100",
          )}
        >
          {disabled ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
          {pending ? "…" : disabled ? "Re-enable" : "Disable"}
        </button>
      </div>
      {error && (
        <div className="flex items-start gap-1 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DoorOpen, FileSpreadsheet } from "lucide-react";
import { createFnfFromSeparationAction } from "@/app/(workspace)/hr/full-and-final/actions";

export function SeparationDownstreamActions({
  separationId,
  employee,
  canManage,
}: {
  separationId: string;
  employee: string | null;
  canManage: boolean;
}) {
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const router = useRouter();

  const onCreateFnf = () =>
    start(async () => {
      const r = await createFnfFromSeparationAction(separationId);
      if (!r.ok) setStatus(r.error);
      else {
        setStatus(
          r.existing
            ? "Opened the existing statement."
            : "Statement created — pulled outstanding items.",
        );
        router.push(`/hr/full-and-final/${encodeURIComponent(r.name)}`);
      }
    });

  return (
    <section className="card p-5">
      <div className="mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ash-500">
          Downstream
        </h2>
        <p className="text-xs text-ash-500">
          Wrap up the separation with an exit interview and a settlement.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={
            (`/hr/exit-interviews/new${employee ? `?employee=${encodeURIComponent(employee)}` : ""}`) as Route
          }
          className="inline-flex h-10 items-center gap-1.5 rounded-chip border border-hairline bg-surface px-3 text-sm font-medium text-ash-800 transition hover:bg-canvas focus-ring"
        >
          <DoorOpen className="h-4 w-4" />
          Schedule exit interview
        </Link>
        {canManage && (
          <button
            type="button"
            onClick={onCreateFnf}
            disabled={pending}
            className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-3 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring disabled:opacity-60"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {pending ? "Working…" : "Create full & final statement"}
          </button>
        )}
      </div>
      {status && <p className="mt-2 text-xs text-ash-500">{status}</p>}
    </section>
  );
}

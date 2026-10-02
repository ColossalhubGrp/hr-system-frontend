"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";
import type {
  ComplianceKnob,
  ComplianceSnapshot,
} from "@/lib/frappe/payroll-compliance";

function fmtDate(iso: string | null): string {
  if (!iso) return "Never";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function ageLabel(iso: string | null): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const days = Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000));
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

/**
 * ZIMRA compliance view — READ-ONLY.
 *
 * Shows every knob the payroll engine runs on + when it was last
 * confirmed against the published ZIMRA / NSSA schedules. All edits
 * (value changes AND staleness-clock resets) happen in Frappe Desk
 * on Company Payroll Settings, not here. Keeping this view data-only
 * removes the risk of someone wrecking tax arithmetic from the HR
 * side; the admin console enforces its own audit trail.
 */
export function CompliancePanel({ snapshot }: { snapshot: ComplianceSnapshot }) {
  const staleCount = snapshot.knobs.filter((k) => k.stale).length;

  return (
    <div className="flex flex-col gap-5">
      <Card className="border-amber-200 bg-amber-50 p-4">
        <div className="flex flex-wrap items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-amber-700" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900">
              ZIMRA compliance health — read-only
            </p>
            <p className="mt-1 text-sm text-amber-800">
              Every knob the payroll engine relies on, with the value it&apos;s
              running on today and when it was last confirmed against ZIMRA&apos;s
              published schedule. This page is informational only — changing
              a value or resetting the staleness clock is done by an
              administrator in the admin console.
              {staleCount > 0 ? (
                <>
                  {" "}
                  <strong>
                    {staleCount} {staleCount === 1 ? "item" : "items"} not
                    confirmed in the past 12 months.
                  </strong>
                </>
              ) : null}
            </p>
            <p className="mt-2 text-xs text-amber-800">
              To edit: open <strong>Company Payroll Settings</strong> in the
              admin console. All changes there flow back to this view on next
              reload.
            </p>
          </div>
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4">Knob</TableHead>
              <TableHead className="px-4 text-right">Current value</TableHead>
              <TableHead className="px-4">Last confirmed</TableHead>
              <TableHead className="px-4">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {snapshot.knobs.map((k) => (
              <KnobRow key={k.key} knob={k} />
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function KnobRow({ knob: k }: { knob: ComplianceKnob }) {
  return (
    <TableRow className={cn(k.stale ? "bg-amber-50/40" : undefined)}>
      <TableCell className="px-4 align-middle">
        <div className="font-semibold text-foreground">{k.label}</div>
        <div className="text-xs text-muted-foreground">{k.hint}</div>
      </TableCell>
      <TableCell className="px-4 align-middle text-right">
        <span className="font-mono text-sm text-foreground">{k.value}</span>
      </TableCell>
      <TableCell className="px-4 align-middle">
        <div>{fmtDate(k.lastUpdated)}</div>
        {k.lastUpdated ? (
          <div className="text-[10px] text-muted-foreground">
            {ageLabel(k.lastUpdated)}
          </div>
        ) : null}
      </TableCell>
      <TableCell className="px-4 align-middle">
        {k.stale ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            <AlertTriangle className="h-3 w-3" />
            {k.lastUpdated ? "Stale (>12mo)" : "Not yet confirmed"}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            Current
          </span>
        )}
      </TableCell>
    </TableRow>
  );
}

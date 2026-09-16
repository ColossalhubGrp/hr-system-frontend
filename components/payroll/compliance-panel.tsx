"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Route } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { toast } from "@/components/ui/sonner";
import type {
  ComplianceKnob,
  ComplianceSnapshot,
} from "@/lib/frappe/payroll-compliance";
import {
  confirmComplianceField,
  updateComplianceKnob,
} from "@/app/(workspace)/payroll/payruns-actions";

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

export function CompliancePanel({ snapshot }: { snapshot: ComplianceSnapshot }) {
  const staleCount = snapshot.knobs.filter((k) => k.stale).length;

  return (
    <div className="flex flex-col gap-5">
      <Card className="border-amber-200 bg-amber-50 p-4">
        <div className="flex flex-wrap items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-amber-700" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900">
              ZIMRA compliance health
            </p>
            <p className="mt-1 text-sm text-amber-800">
              Every knob the payroll engine relies on, with the value it&apos;s
              running on today and when HR last confirmed it against ZIMRA&apos;s
              published schedule. Confirm each after every January budget +
              any mid-year update.
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
              Cross-check against{" "}
              <a
                href="https://www.zimra.co.zw"
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
              >
                zimra.co.zw
                <ExternalLink className="h-3 w-3" />
              </a>
              . After confirming, click <strong>Confirm current</strong> on the
              corresponding row to reset the staleness clock.
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
              <TableHead className="px-4 text-right">Action</TableHead>
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
  const [pending, start] = useTransition();
  const [lastUpdated, setLastUpdated] = useState<string | null>(k.lastUpdated);
  const [stale, setStale] = useState<boolean>(k.stale);

  async function confirm() {
    if (!k.confirmField) return;
    start(async () => {
      try {
        await confirmComplianceField(k.confirmField!);
        const today = new Date().toISOString().slice(0, 10);
        setLastUpdated(today);
        setStale(false);
        toast.success(`Confirmed — staleness clock reset for ${k.label}.`);
      } catch (err) {
        toast.error(
          (err as { message?: string })?.message ?? "Confirm failed.",
        );
      }
    });
  }

  return (
    <TableRow className={cn(stale ? "bg-amber-50/40" : undefined)}>
      <TableCell className="px-4 align-middle">
        <div className="font-semibold text-foreground">{k.label}</div>
        <div className="text-xs text-muted-foreground">{k.hint}</div>
      </TableCell>
      <TableCell className="px-4 align-middle text-right">
        {k.editField ? (
          <KnobEditor knob={k} />
        ) : k.editHref ? (
          <div className="flex items-center justify-end gap-2">
            <span className="font-mono text-sm text-foreground">{k.value}</span>
            <Link
              href={k.editHref as Route}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Edit →
            </Link>
          </div>
        ) : (
          <span className="font-mono text-sm">{k.value}</span>
        )}
      </TableCell>
      <TableCell className="px-4 align-middle">
        <div>{fmtDate(lastUpdated)}</div>
        {lastUpdated ? (
          <div className="text-[10px] text-muted-foreground">
            {ageLabel(lastUpdated)}
          </div>
        ) : null}
      </TableCell>
      <TableCell className="px-4 align-middle">
        {stale ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            <AlertTriangle className="h-3 w-3" />
            {lastUpdated ? "Stale (>12mo)" : "Not yet confirmed"}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            Current
          </span>
        )}
      </TableCell>
      <TableCell className="px-4 align-middle text-right">
        {k.confirmField ? (
          <button
            type="button"
            onClick={confirm}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-transparent px-2.5 py-1 text-xs font-semibold text-foreground transition hover:bg-muted/40 disabled:opacity-60"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Confirm current
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">Auto</span>
        )}
      </TableCell>
    </TableRow>
  );
}

/**
 * Inline editor for a Compliance knob. Saves on blur; converts
 * display → stored via `displayFactor` (100 for decimal-stored
 * percentages like nssa_pct = 0.045, 1 for direct-stored values).
 * Suffix hint matches the currency so HR reads the right unit.
 */
function KnobEditor({ knob }: { knob: ComplianceKnob }) {
  const factor = knob.displayFactor ?? 1;
  const initial = knob.editableValue ?? 0;
  const [local, setLocal] = useState<string>(
    initial ? String(initial) : "",
  );
  const [pending, setPending] = useState(false);
  const lastCommittedRef = useRef<number>(initial);

  useEffect(() => {
    setLocal(initial ? String(initial) : "");
    lastCommittedRef.current = initial;
  }, [initial]);

  const suffix =
    knob.currency === "PCT" ? "%"
    : knob.currency === "USD" ? "US$"
    : knob.currency === "MULT" ? "×"
    : "";

  async function commit() {
    const parsed = parseFloat(local || "0");
    if (!Number.isFinite(parsed)) return;
    if (parsed === lastCommittedRef.current) return;
    const old = lastCommittedRef.current;
    setPending(true);
    try {
      const stored = parsed / factor;
      await updateComplianceKnob(knob.editField!, stored);
      lastCommittedRef.current = parsed;
      toast.success(`Saved ${knob.label}.`);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Save failed.");
      setLocal(old ? String(old) : "");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-1">
      {suffix && knob.currency === "USD" ? (
        <span className="text-xs text-muted-foreground">{suffix}</span>
      ) : null}
      <input
        type="number"
        step={knob.step ?? "0.01"}
        min="0"
        value={local}
        disabled={pending}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="w-28 rounded-md border px-2 py-1 text-right text-sm disabled:bg-muted disabled:text-muted-foreground"
        placeholder="0"
      />
      {suffix && knob.currency !== "USD" ? (
        <span className="text-xs text-muted-foreground">{suffix}</span>
      ) : null}
      {pending ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : null}
    </div>
  );
}

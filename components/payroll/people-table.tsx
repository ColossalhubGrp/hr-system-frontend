"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";

export interface PersonRow {
  id: string;
  name: string;
  title: string;
  department: string;
  /** SALARY | HOURLY | CONTRACTOR */
  payType: string;
  /** Annual salary, hourly rate, or flat-pay-per-period depending on payType. */
  comp: number;
  /** Currency this employee is paid in (defaults to the company currency). */
  payCurrency: string | null;
  state: string;
  missing: number;
}

/**
 * Rippling-style People table:
 *   - Search box on the left
 *   - All / Salary / Hourly / Contractor filter pills next to it
 *   - "Showing X of Y" counter on the right
 *   - Rows with circular initials avatar + name (link) + title stacked
 *   - Compensation column auto-formats per pay type
 *   - Status: amber "Missing N details" or emerald "Ready"
 */
export function PeopleTable({ people }: { people: PersonRow[] }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState<"ALL" | "SALARY" | "HOURLY" | "CONTRACTOR">("ALL");

  const filtered = people.filter((p) => {
    const m =
      !q ||
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      p.title.toLowerCase().includes(q.toLowerCase()) ||
      p.department.toLowerCase().includes(q.toLowerCase());
    const t = type === "ALL" || p.payType === type;
    return m && t;
  });

  return (
    <Card className="overflow-hidden p-0">
      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search people"
          className="h-9 w-56"
        />
        <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-0.5">
          {(["ALL", "SALARY", "HOURLY", "CONTRACTOR"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-semibold transition",
                type === t
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "ALL" ? "All" : t[0] + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <span className="ml-auto text-sm text-muted-foreground">
          Showing {filtered.length} of {people.length}
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-5">Name</TableHead>
            <TableHead className="px-5">Department</TableHead>
            <TableHead className="px-5">Type</TableHead>
            <TableHead className="px-5">Compensation</TableHead>
            <TableHead className="px-5">Pay currency</TableHead>
            <TableHead className="px-5">Payroll status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                No people match {q ? `"${q}"` : "the current filter"}.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="px-5 align-middle">
                  <div className="flex items-center gap-3">
                    <Avatar name={p.name} />
                    <div>
                      <Link
                        href={`/employee/${encodeURIComponent(p.id)}` as Route}
                        className="font-semibold text-foreground hover:text-primary"
                      >
                        {p.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">{p.title}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-5 align-middle text-sm">{p.department}</TableCell>
                <TableCell className="px-5 align-middle text-sm">
                  {p.payType[0] + p.payType.slice(1).toLowerCase()}
                </TableCell>
                <TableCell className="px-5 align-middle font-semibold">{compensation(p)}</TableCell>
                <TableCell className="px-5 align-middle text-sm">
                  {p.payCurrency ?? "—"}
                </TableCell>
                <TableCell className="px-5 align-middle">
                  {p.missing > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                      ⚠ Missing {p.missing} details
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      Ready
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

function compensation(p: PersonRow): string {
  if (p.payType === "SALARY") return `${money(p.comp)}/yr`;
  if (p.payType === "HOURLY") return `${money(p.comp)}/hr`;
  return `${money(p.comp)} · 1099`;
}

function money(n: number): string {
  return `$${n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Avatar({ name }: { name: string }) {
  const parts = name.split(" ").filter(Boolean);
  const i = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  // Stable color per name from a small palette
  const palette = [
    "bg-rose-100 text-rose-700",
    "bg-amber-100 text-amber-700",
    "bg-emerald-100 text-emerald-700",
    "bg-sky-100 text-sky-700",
    "bg-violet-100 text-violet-700",
    "bg-fuchsia-100 text-fuchsia-700",
  ];
  const hash = Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0);
  const cls = palette[hash % palette.length];
  return (
    <div
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold uppercase",
        cls,
      )}
      aria-hidden
    >
      {i || "?"}
    </div>
  );
}

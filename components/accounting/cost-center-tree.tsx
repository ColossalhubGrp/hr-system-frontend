"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { ChevronRight, Folder, Building2, Ban } from "lucide-react";
import type { CostCenterNode } from "@/lib/frappe/cost-centers";
import { cn } from "@/lib/cn";

export function CostCenterTree({ nodes, company }: { nodes: CostCenterNode[]; company: string }) {
  return (
    <ul className="flex flex-col">
      {nodes.map((n) => (
        <TreeItem key={n.name} node={n} company={company} initiallyOpen depth={0} />
      ))}
    </ul>
  );
}

function TreeItem({
  node,
  company,
  initiallyOpen,
  depth,
}: {
  node: CostCenterNode;
  company: string;
  initiallyOpen?: boolean;
  depth: number;
}) {
  const [open, setOpen] = useState(!!initiallyOpen && depth < 2);
  const hasChildren = node.children.length > 0;
  const Icon = node.isGroup ? Folder : Building2;

  return (
    <li>
      <div
        className="group flex items-center gap-1 rounded-lg px-1 py-1 hover:bg-muted/40"
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            aria-label={open ? "Collapse" : "Expand"}
          >
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
          </button>
        ) : (
          <span className="w-4" />
        )}
        <Icon className={cn("h-3.5 w-3.5 shrink-0", node.isGroup ? "text-primary" : "text-muted-foreground")} />
        {node.isGroup ? (
          <span className="truncate text-sm font-semibold text-foreground">{node.costCenterName}</span>
        ) : (
          <Link
            href={`/accounting/cost-centers/${encodeURIComponent(node.name)}?company=${encodeURIComponent(company)}` as Route}
            className="truncate text-sm text-foreground hover:text-primary hover:underline"
          >
            {node.costCenterName}
          </Link>
        )}
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {node.disabled && <Ban className="h-3 w-3 text-fall" aria-label="Disabled" />}
          <span className="font-mono text-[10px] uppercase text-muted-foreground">{node.name}</span>
        </div>
      </div>

      {hasChildren && open && (
        <ul className="flex flex-col">
          {node.children.map((c) => (
            <TreeItem key={c.name} node={c} company={company} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

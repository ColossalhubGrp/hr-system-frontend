"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Tree, TreeNode } from "react-organizational-chart";
import {
  AlertCircle,
  Building2,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { EmployeeAvatar } from "@/components/employee/avatar";
import type { OrgEmployee } from "@/lib/frappe/org-chart";

type Node = (OrgEmployee | SyntheticRoot) & {
  children: Node[];
  descendantCount: number;
  depth: number;
  isSynthetic?: boolean;
};

/**
 * A pseudo-employee used when many top-level employees have no
 * reports_to. Anchors them under one visual root so the chart reads
 * as a company org chart instead of 15 vertical stacks.
 */
type SyntheticRoot = {
  id: string;
  employeeName: string;
  designation: string | null;
  department: string | null;
  image: string | null;
  reportsTo: null;
  status: string;
};

const SYNTHETIC_ROOT_ID = "__company_root__";
/** Depth at which nodes start collapsed. Level 0 = company root, level 1
 *  = its direct reports (all visible), everything ≥ 2 collapsed on load. */
const DEFAULT_EXPAND_DEPTH = 1;

/**
 * Recursive org chart rendered from Employee.reports_to. Roots are
 * employees with no reports_to (or one that isn't in the visible set).
 *
 * Behaviours:
 *  - Click a card → open that employee's profile.
 *  - Expand/collapse per node so large trees stay legible.
 *  - Search box filters branches: any node whose name / designation /
 *    department matches — plus its ancestors — stays visible.
 */
export function OrgTree({
  employees,
  companyName = "Company",
}: {
  employees: OrgEmployee[];
  companyName?: string;
}) {
  const [query, setQuery] = useState("");

  const { forest, unmanagedCount } = useMemo(
    () => buildForest(employees),
    [employees],
  );

  // If more than one root, group them under a synthetic company node so
  // the chart reads as one tree instead of a vertical stack.
  const displayRoot: Node | null = useMemo(() => {
    if (forest.length === 0) return null;
    if (forest.length === 1) return forest[0];
    const synthetic: Node = {
      id: SYNTHETIC_ROOT_ID,
      employeeName: companyName,
      designation: null,
      department: null,
      image: null,
      reportsTo: null,
      status: "Active",
      children: forest,
      descendantCount: forest.reduce((s, r) => s + 1 + r.descendantCount, 0),
      depth: 0,
      isSynthetic: true,
    };
    // Reparent depths since forest was computed with own depth=0.
    for (const r of forest) bumpDepth(r, 1);
    return synthetic;
  }, [forest, companyName]);

  // Default-collapse state — everything deeper than the initial expand
  // depth starts closed so a wide company doesn't overwhelm the reader.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    if (displayRoot) seedCollapsed(displayRoot, init);
    return init;
  });

  const filteredRoot = useMemo(() => {
    if (!displayRoot) return null;
    const q = query.trim().toLowerCase();
    if (!q) return displayRoot;
    return filterTree(displayRoot, q);
  }, [displayRoot, query]);

  if (employees.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-hairline bg-canvas/40 px-4 py-10 text-center text-sm text-ash-500">
        No employees to chart yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 rounded-card border border-hairline bg-surface px-3 py-2">
        <Search className="h-3.5 w-3.5 text-ash-500" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by name, designation, department…"
          className="h-8 flex-1 bg-transparent text-sm outline-none placeholder:text-ash-400"
        />
        <span className="text-xs text-ash-500">
          {employees.length} employee{employees.length === 1 ? "" : "s"}
        </span>
      </div>

      {unmanagedCount > 1 && (
        <p className="flex items-center gap-2 rounded-card border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>
            <strong>{unmanagedCount}</strong> employee
            {unmanagedCount === 1 ? "" : "s"} have no manager set — they&apos;re
            grouped under the company root. Set &ldquo;Reports to&rdquo; on each
            employee&apos;s profile to draw the real reporting line.
          </span>
        </p>
      )}

      <div className="overflow-x-auto rounded-card border border-hairline bg-canvas/30 p-6">
        {!filteredRoot ? (
          <p className="p-8 text-center text-sm text-ash-500">
            No matches for &ldquo;{query}&rdquo;.
          </p>
        ) : (
          <Tree
            lineWidth={"2px"}
            lineColor={"#d4d4d8"}
            lineBorderRadius={"8px"}
            label={
              <Card
                node={filteredRoot}
                collapsed={collapsed}
                onToggle={(id) =>
                  setCollapsed((c) => ({ ...c, [id]: !c[id] }))
                }
              />
            }
          >
            {!collapsed[filteredRoot.id] &&
              filteredRoot.children.map((c) => (
                <TreeChild
                  key={c.id}
                  node={c}
                  collapsed={collapsed}
                  onToggle={(id) =>
                    setCollapsed((cc) => ({ ...cc, [id]: !cc[id] }))
                  }
                />
              ))}
          </Tree>
        )}
      </div>
    </div>
  );
}

function TreeChild({
  node,
  collapsed,
  onToggle,
}: {
  node: Node;
  collapsed: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  return (
    <TreeNode
      label={<Card node={node} collapsed={collapsed} onToggle={onToggle} />}
    >
      {!collapsed[node.id] &&
        node.children.map((c) => (
          <TreeChild
            key={c.id}
            node={c}
            collapsed={collapsed}
            onToggle={onToggle}
          />
        ))}
    </TreeNode>
  );
}

function Card({
  node,
  collapsed,
  onToggle,
}: {
  node: Node;
  collapsed: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  const isCollapsed = collapsed[node.id];
  const hasChildren = node.children.length > 0;

  if (node.isSynthetic) {
    return (
      <div
        className={cn(
          "mx-auto inline-flex w-56 flex-col rounded-xl border border-ink-300 bg-ink-50 p-3 text-left shadow-sm",
          "dark:bg-ink-900/40",
        )}
      >
        <div className="flex items-start gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink-800 text-white">
            <Building2 className="h-4 w-4" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold text-ink-900">
              {node.employeeName}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-ash-500">
              {node.children.length} direct report
              {node.children.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        {hasChildren && (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            className={cn(
              "mt-2 inline-flex items-center justify-center gap-1 rounded-full border border-hairline bg-surface px-2 py-0.5 text-[10px] font-medium text-ash-600",
              "hover:bg-canvas hover:text-ink-800 focus-ring",
            )}
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronUp className="h-3 w-3" />
            )}
            {isCollapsed ? "Show" : "Hide"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mx-auto inline-flex w-56 flex-col rounded-xl border border-hairline bg-surface p-3 text-left shadow-sm",
        "hover:border-ink-300 hover:shadow-md",
      )}
    >
      <div className="flex items-start gap-2">
        <EmployeeAvatar name={node.employeeName} imageUrl={node.image} size="sm" />
        <div className="flex min-w-0 flex-1 flex-col">
          <Link
            href={`/employee/${encodeURIComponent(node.id)}` as Route}
            className="truncate text-sm font-semibold text-ink-900 hover:underline"
            title={node.employeeName}
          >
            {node.employeeName}
          </Link>
          {node.designation && (
            <span className="truncate text-[11px] text-ash-600" title={node.designation}>
              {node.designation}
            </span>
          )}
          {node.department && (
            <span
              className="truncate text-[10px] text-ash-500"
              title={node.department}
            >
              {node.department}
            </span>
          )}
        </div>
      </div>
      {hasChildren && (
        <button
          type="button"
          onClick={() => onToggle(node.id)}
          className={cn(
            "mt-2 inline-flex items-center justify-center gap-1 rounded-full border border-hairline px-2 py-0.5 text-[10px] font-medium text-ash-600",
            "hover:bg-canvas hover:text-ink-800 focus-ring",
          )}
          title={isCollapsed ? "Expand direct reports" : "Collapse direct reports"}
        >
          {isCollapsed ? (
            <>
              <ChevronDown className="h-3 w-3" />
              {node.descendantCount} report{node.descendantCount === 1 ? "" : "s"}
            </>
          ) : (
            <>
              <ChevronUp className="h-3 w-3" />
              {node.children.length} direct
            </>
          )}
        </button>
      )}
    </div>
  );
}

function buildForest(employees: OrgEmployee[]): {
  forest: Node[];
  unmanagedCount: number;
} {
  const byId = new Map<string, Node>();
  for (const e of employees) {
    byId.set(e.id, {
      ...e,
      children: [],
      descendantCount: 0,
      depth: 0,
    });
  }
  const forest: Node[] = [];
  let unmanagedCount = 0;
  for (const n of byId.values()) {
    const parent = n.reportsTo ? byId.get(n.reportsTo) : null;
    if (parent) {
      parent.children.push(n);
    } else {
      forest.push(n);
      // Count as "unmanaged" only when the employee has no reports_to
      // at all (the true HR data gap). Employees whose reports_to
      // points at someone outside the visible set still count.
      if (!n.reportsTo) unmanagedCount++;
    }
  }
  // Deterministic sort + populate descendantCount + depth.
  const sortAndCount = (n: Node, depth: number): number => {
    n.depth = depth;
    n.children.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
    let total = n.children.length;
    for (const c of n.children) total += sortAndCount(c, depth + 1);
    n.descendantCount = total;
    return total;
  };
  forest.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  for (const r of forest) sortAndCount(r, 0);
  return { forest, unmanagedCount };
}

function bumpDepth(n: Node, by: number): void {
  n.depth += by;
  for (const c of n.children) bumpDepth(c, by);
}

function seedCollapsed(n: Node, out: Record<string, boolean>): void {
  if (n.depth > DEFAULT_EXPAND_DEPTH && n.children.length > 0) {
    out[n.id] = true;
  }
  for (const c of n.children) seedCollapsed(c, out);
}

function filterTree(node: Node, q: string): Node | null {
  const matched =
    node.employeeName.toLowerCase().includes(q) ||
    (node.designation?.toLowerCase().includes(q) ?? false) ||
    (node.department?.toLowerCase().includes(q) ?? false) ||
    node.id.toLowerCase().includes(q);
  const filteredChildren = node.children
    .map((c) => filterTree(c, q))
    .filter((c): c is Node => c !== null);
  if (matched || filteredChildren.length > 0) {
    return { ...node, children: filteredChildren };
  }
  return null;
}

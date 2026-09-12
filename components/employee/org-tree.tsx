"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Tree, TreeNode } from "react-organizational-chart";
import { ChevronDown, ChevronUp, Search, User } from "lucide-react";
import { cn } from "@/lib/cn";
import type { OrgEmployee } from "@/lib/frappe/org-chart";

type Node = OrgEmployee & { children: Node[]; descendantCount: number };

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
export function OrgTree({ employees }: { employees: OrgEmployee[] }) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const roots = useMemo(() => buildForest(employees), [employees]);

  const visibleRoots = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roots;
    return roots
      .map((r) => filterTree(r, q))
      .filter((r): r is Node => r !== null);
  }, [roots, query]);

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
          {employees.length} employees · {roots.length} root{roots.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="overflow-x-auto rounded-card border border-hairline bg-canvas/30 p-6">
        {visibleRoots.length === 0 ? (
          <p className="p-8 text-center text-sm text-ash-500">
            No matches for &ldquo;{query}&rdquo;.
          </p>
        ) : (
          <div className="flex flex-col gap-8">
            {visibleRoots.map((root) => (
              <Tree
                key={root.id}
                lineWidth={"2px"}
                lineColor={"#d4d4d8"}
                lineBorderRadius={"8px"}
                label={
                  <Card
                    node={root}
                    collapsed={collapsed}
                    onToggle={(id) =>
                      setCollapsed((c) => ({ ...c, [id]: !c[id] }))
                    }
                  />
                }
              >
                {!collapsed[root.id] &&
                  root.children.map((c) => (
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
            ))}
          </div>
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
  return (
    <div
      className={cn(
        "mx-auto inline-flex w-56 flex-col rounded-xl border border-hairline bg-surface p-3 text-left shadow-sm",
        "hover:border-ink-300 hover:shadow-md",
      )}
    >
      <div className="flex items-start gap-2">
        <Avatar name={node.employeeName} image={node.image} />
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

function Avatar({ name, image }: { name: string; image: string | null }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={image}
        alt={name}
        className="h-8 w-8 shrink-0 rounded-full object-cover"
      />
    );
  }
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join("");
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink-100 text-[11px] font-semibold text-ink-800">
      {initials || <User className="h-3.5 w-3.5" />}
    </span>
  );
}

function buildForest(employees: OrgEmployee[]): Node[] {
  const byId = new Map<string, Node>();
  for (const e of employees) {
    byId.set(e.id, { ...e, children: [], descendantCount: 0 });
  }
  const roots: Node[] = [];
  for (const n of byId.values()) {
    const parent = n.reportsTo ? byId.get(n.reportsTo) : null;
    if (parent) parent.children.push(n);
    else roots.push(n);
  }
  // Deterministic sort at every level + populate descendant counts.
  const sortAndCount = (n: Node): number => {
    n.children.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
    let total = n.children.length;
    for (const c of n.children) total += sortAndCount(c);
    n.descendantCount = total;
    return total;
  };
  roots.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  for (const r of roots) sortAndCount(r);
  return roots;
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

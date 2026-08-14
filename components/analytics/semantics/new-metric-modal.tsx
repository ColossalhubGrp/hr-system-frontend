"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { SemanticDomain } from "./types";

/**
 * "+ New metric" modal wired onto the /analytics/semantics header.
 * Lets an HR / Data Steward add a brand-new metric definition
 * without needing an engineer to add it to the seed script.
 *
 * Two supported computation shapes for MVP:
 *   * Simple aggregation — pick a source table, an aggregation
 *     (count / sum / avg / min / max), an optional column and
 *     optional filters. Covers ~80% of what users need.
 *   * Custom SQL — for the power user who has a specific query in
 *     mind (e.g. multi-table joins the simple form can't express).
 *
 * "Computed" (formula referencing other metrics) is available in
 * the schema but hidden from the MVP form — most callers don't need
 * it, and it's easy to slip in via the override flow later.
 *
 * A "+ Create new domain" option is inlined in the domain dropdown
 * so users can add e.g. "Retention" without leaving the modal.
 */

type Domain = Pick<SemanticDomain, "code" | "title">;

const KIND_LABEL: Record<"simple" | "sql", string> = {
  simple: "Count / sum / average of a column",
  sql: "Custom SQL query",
};

const AGGREGATIONS = [
  { value: "count", label: "Count of rows" },
  { value: "count_distinct", label: "Count of unique values" },
  { value: "sum", label: "Sum" },
  { value: "avg", label: "Average" },
  { value: "min", label: "Minimum" },
  { value: "max", label: "Maximum" },
] as const;

const FORMATS = [
  { value: "integer", label: "Whole number (5, 42)" },
  { value: "decimal", label: "Decimal (5.25, 42.1)" },
  { value: "currency", label: "Currency ($5,000.00)" },
  { value: "percentage", label: "Percentage (25%)" },
  { value: "duration_days", label: "Duration in days (14, 30)" },
] as const;

export function NewMetricModal({
  domains,
  editable,
  onCreated,
}: {
  domains: Domain[];
  editable: boolean;
  onCreated: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Basic info
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [domain, setDomain] = useState<string>("");

  // Shape
  const [kind, setKind] = useState<"simple" | "sql">("simple");

  // Simple-shape fields
  const [sourceTable, setSourceTable] = useState("");
  const [aggregation, setAggregation] = useState<string>("count");
  const [aggregationField, setAggregationField] = useState("name");
  const [filtersJson, setFiltersJson] = useState("");

  // SQL-shape
  const [customSql, setCustomSql] = useState("");

  // Formatting
  const [unit, setUnit] = useState("");
  const [format, setFormat] = useState<string>("integer");
  const [higherIsBetter, setHigherIsBetter] = useState(true);

  // Inline domain creation
  const [creatingDomain, setCreatingDomain] = useState(false);
  const [newDomainTitle, setNewDomainTitle] = useState("");
  const [newDomainDescription, setNewDomainDescription] = useState("");
  const [savingDomain, setSavingDomain] = useState(false);
  const [domainList, setDomainList] = useState<Domain[]>(domains);

  // Source-table + column dropdown data — lazy-loaded so the modal
  // opens instantly and only fetches when the user actually needs
  // the pickers.
  type SourceTable = { value: string; label: string; module: string };
  type SourceColumn = { fieldname: string; label: string; fieldtype: string };
  const [sourceTables, setSourceTables] = useState<SourceTable[] | null>(null);
  const [sourceColumns, setSourceColumns] = useState<SourceColumn[] | null>(null);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [columnsLoading, setColumnsLoading] = useState(false);

  // Fetch tables once when the modal opens for the first time.
  useEffect(() => {
    if (!open || sourceTables !== null || tablesLoading) return;
    setTablesLoading(true);
    void fetch("/api/analytics/semantics/source-tables", { cache: "no-store" })
      .then((r) => r.json())
      .then((body: { tables?: SourceTable[]; error?: string }) => {
        if (body.error) throw new Error(body.error);
        setSourceTables(body.tables ?? []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Couldn't load source tables.");
      })
      .finally(() => setTablesLoading(false));
  }, [open, sourceTables, tablesLoading]);

  // Re-fetch columns whenever the source table changes.
  useEffect(() => {
    if (!sourceTable) {
      setSourceColumns(null);
      return;
    }
    setColumnsLoading(true);
    void fetch(
      `/api/analytics/semantics/source-columns?table=${encodeURIComponent(sourceTable)}`,
      { cache: "no-store" },
    )
      .then((r) => r.json())
      .then((body: { columns?: SourceColumn[]; error?: string }) => {
        if (body.error) throw new Error(body.error);
        setSourceColumns(body.columns ?? []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Couldn't load columns.");
      })
      .finally(() => setColumnsLoading(false));
  }, [sourceTable]);

  const reset = () => {
    setTitle("");
    setDescription("");
    setDomain("");
    setKind("simple");
    setSourceTable("");
    setAggregation("count");
    setAggregationField("name");
    setFiltersJson("");
    setCustomSql("");
    setUnit("");
    setFormat("integer");
    setHigherIsBetter(true);
    setError(null);
    setCreatingDomain(false);
    setNewDomainTitle("");
    setNewDomainDescription("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        title,
        domain,
        description,
        computation_type: kind,
        unit: unit || undefined,
        format,
        higher_is_better: higherIsBetter ? 1 : 0,
      };
      if (kind === "simple") {
        Object.assign(payload, {
          source_doctype: sourceTable,
          aggregation,
          aggregation_field: aggregationField,
          base_filters: filtersJson.trim() || undefined,
        });
      } else {
        payload.custom_sql = customSql;
      }
      const res = await fetch("/api/analytics/semantics/metric", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as
        | { code: string; title: string }
        | { error: string };
      if (!res.ok || "error" in body) {
        throw new Error(
          ("error" in body && body.error) || `HTTP ${res.status}`,
        );
      }
      onCreated(body.code);
      setOpen(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create metric.");
    } finally {
      setSaving(false);
    }
  };

  const submitNewDomain = async () => {
    if (!newDomainTitle.trim()) {
      setError("Give the new domain a name.");
      return;
    }
    setSavingDomain(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics/semantics/domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newDomainTitle.trim(),
          description: newDomainDescription.trim(),
        }),
      });
      const body = (await res.json()) as
        | { code: string; title: string }
        | { error: string };
      if (!res.ok || "error" in body) {
        throw new Error(
          ("error" in body && body.error) || `HTTP ${res.status}`,
        );
      }
      const newDomain = body as Domain;
      setDomainList((prev) => [...prev, newDomain]);
      setDomain(newDomain.code);
      setCreatingDomain(false);
      setNewDomainTitle("");
      setNewDomainDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create domain.");
    } finally {
      setSavingDomain(false);
    }
  };

  const canSubmit = useMemo(() => {
    if (!title.trim() || !domain) return false;
    if (kind === "simple") return Boolean(sourceTable.trim() && aggregation);
    return Boolean(customSql.trim());
  }, [title, domain, kind, sourceTable, aggregation, customSql]);

  if (!editable) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          New metric
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[90vh] max-w-2xl overflow-y-auto"
        // Radix Select / Popover content portals to <body>, which the
        // Dialog treats as "outside click" and dismisses. Whitelist
        // clicks that land inside any Radix popper so the modal
        // survives while a dropdown is open.
        onInteractOutside={(e) => {
          const el = e.target as HTMLElement | null;
          if (
            el?.closest?.("[data-radix-popper-content-wrapper]") ||
            el?.closest?.("[role='listbox']")
          ) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>New metric</DialogTitle>
          <DialogDescription>
            Add a new metric to the catalog. It becomes available in
            Ask (AI) immediately and shows up on the sidebar under the
            domain you pick.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5 pt-2">
          {/* Basics */}
          <div className="space-y-3">
            <Field
              label="Name"
              hint="What users see in the metric list. Keep it short and descriptive."
              required
            >
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Average overtime hours per employee"
                required
              />
            </Field>

            <Field
              label="Description"
              hint="What this metric means and when to use it. Shown in Ask (AI) tooltips."
            >
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain what this measures — the AI uses this to decide when to answer with it."
                rows={2}
              />
            </Field>

            <Field
              label="Domain"
              hint="Which sidebar bucket this metric belongs to."
              required
            >
              {creatingDomain ? (
                <div className="space-y-2 rounded-md border border-dashed p-3">
                  <Input
                    value={newDomainTitle}
                    onChange={(e) => setNewDomainTitle(e.target.value)}
                    placeholder="Domain name (e.g. Retention)"
                    autoFocus
                  />
                  <Input
                    value={newDomainDescription}
                    onChange={(e) => setNewDomainDescription(e.target.value)}
                    placeholder="Short description (optional)"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={submitNewDomain}
                      disabled={savingDomain}
                      className="gap-1.5"
                    >
                      {savingDomain ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      Add domain
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCreatingDomain(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select value={domain} onValueChange={setDomain}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Pick a domain" />
                    </SelectTrigger>
                    <SelectContent>
                      {domainList.map((d) => (
                        <SelectItem key={d.code} value={d.code}>
                          {d.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCreatingDomain(true)}
                    className="gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New
                  </Button>
                </div>
              )}
            </Field>
          </div>

          {/* Computation shape */}
          <div className="space-y-3 rounded-md border p-4">
            <p className="text-xs font-medium text-muted-foreground">
              How is this calculated?
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(["simple", "sql"] as const).map((k) => (
                <label
                  key={k}
                  className={`cursor-pointer rounded-md border p-3 text-sm ${
                    kind === k
                      ? "border-primary bg-primary/5"
                      : "border-input hover:bg-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name="kind"
                    value={k}
                    checked={kind === k}
                    onChange={() => setKind(k)}
                    className="sr-only"
                  />
                  <span className="font-medium">{KIND_LABEL[k]}</span>
                </label>
              ))}
            </div>

            {kind === "simple" ? (
              <div className="space-y-3 pt-2">
                <Field
                  label="Source table"
                  required
                  hint="Which data table to count from. Curated to HR / payroll data — use Custom SQL if you need something more exotic."
                >
                  <Select
                    value={sourceTable}
                    onValueChange={(v) => {
                      setSourceTable(v);
                      // Reset column so the user picks a fresh one for the new table
                      setAggregationField("name");
                    }}
                    disabled={tablesLoading || !sourceTables}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          tablesLoading
                            ? "Loading tables…"
                            : "Pick a source table"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {(sourceTables ?? []).map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field
                  label="What to measure"
                  required
                  hint="Pick an aggregation, then a column. COUNT uses 'Row ID (name)' by default; SUM / AVG / MIN / MAX need a numeric column."
                >
                  <div className="grid grid-cols-[1fr_1.5fr] gap-2">
                    <Select value={aggregation} onValueChange={setAggregation}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AGGREGATIONS.map((a) => (
                          <SelectItem key={a.value} value={a.value}>
                            {a.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={aggregationField}
                      onValueChange={setAggregationField}
                      disabled={!sourceTable || columnsLoading}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !sourceTable
                              ? "Pick a source table first"
                              : columnsLoading
                                ? "Loading columns…"
                                : "Pick a column"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {(sourceColumns ?? []).map((c) => (
                          <SelectItem key={c.fieldname} value={c.fieldname}>
                            {c.label}
                            <span className="ml-2 text-[10px] text-muted-foreground">
                              {c.fieldtype}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </Field>

                <Field
                  label="Filters"
                  hint={`Restrict which rows count. JSON object, e.g. {"status": "Active"}. Leave empty to count all rows.`}
                >
                  <Textarea
                    value={filtersJson}
                    onChange={(e) => setFiltersJson(e.target.value)}
                    placeholder={`{"status": "Active"}`}
                    rows={2}
                    className="font-mono text-xs"
                  />
                </Field>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <Field
                  label="Custom SQL"
                  required
                  hint="Full SELECT that returns a single row with an 'value' column. Advanced — for metrics the simple form can't express."
                >
                  <Textarea
                    value={customSql}
                    onChange={(e) => setCustomSql(e.target.value)}
                    placeholder={`SELECT COUNT(DISTINCT department) AS value FROM \`tabEmployee\` WHERE status='Active'`}
                    rows={5}
                    className="font-mono text-xs"
                  />
                </Field>
              </div>
            )}
          </div>

          {/* Formatting */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Unit" hint="Shown next to the number (e.g. USD, employees, hours). Optional.">
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="employees"
              />
            </Field>
            <Field label="Format" hint="How the number is displayed.">
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMATS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={higherIsBetter}
              onChange={(e) => setHigherIsBetter(e.target.checked)}
              className="rounded"
            />
            Higher values are better (used to colour trend arrows)
          </label>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 break-words">{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || saving} className="gap-1.5">
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  Create metric
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium">
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

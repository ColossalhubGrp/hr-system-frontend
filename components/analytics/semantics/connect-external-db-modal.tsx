"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Database,
  Loader2,
  Table as TableIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import type {
  CreateDatasetFromTableResponse,
  CreateExternalResponse,
  DataSourceType,
  ExternalTableInfo,
  ListTablesResponse,
} from "./types";

/**
 * Two-step wizard the Data tab opens when a Steward clicks "Connect
 * database":
 *
 *   Step 1 — form: pick source type + connection details, hit "Test
 *            connection" to prove the creds work before saving. On
 *            "Save & continue", the backend creates the Data Source
 *            (which also health-checks — the same green/red badge
 *            we see for Test Connection is what determines whether
 *            we advance to step 2).
 *
 *   Step 2 — table picker: list the remote tables, pick one, name
 *            the Dataset, hit "Create dataset". The backend registers
 *            the Dataset and profiles its columns into the Field
 *            Semantic Catalog. On success, we close and refresh the
 *            parent's list — the new dataset shows up like a CSV
 *            upload does, and per-column quick-metric buttons work
 *            unchanged.
 *
 * Password lives only in component state until "Save & continue";
 * it's sent to the backend over HTTPS and stored in the Data Source's
 * encrypted Password field. The modal never fetches it back.
 */

const DEFAULT_PORTS: Record<DataSourceType, number> = {
  postgres: 5432,
  mysql: 3306,
  sqlserver: 1433,
};

const DEFAULT_SCHEMAS: Record<DataSourceType, string> = {
  postgres: "public",
  sqlserver: "dbo",
  mysql: "",
};

const SUPPORTED: Array<{ value: DataSourceType; label: string; ready: boolean }> = [
  { value: "postgres",  label: "PostgreSQL",  ready: true },
  { value: "mysql",     label: "MySQL",       ready: true },    // Phase 2.6b
  { value: "sqlserver", label: "SQL Server",  ready: false },   // Phase 2.6c
];

interface FormState {
  source_type: DataSourceType;
  code: string;
  title: string;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  schema: string;
  sslmode: string;
  description: string;
}

const EMPTY_FORM: FormState = {
  source_type: "postgres",
  code: "",
  title: "",
  host: "",
  port: String(DEFAULT_PORTS.postgres),
  database: "",
  username: "",
  password: "",
  schema: DEFAULT_SCHEMAS.postgres,
  sslmode: "",
  description: "",
};

type Step = "form" | "pick-table";

interface HealthState {
  ok: boolean | null;   // null = not yet tested
  message: string;
  latency_ms?: number | null;
  server_version?: string | null;
}

export function ConnectExternalDbModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  /** Called after a Dataset is successfully created so the parent can reload. */
  onCreated: (created: CreateDatasetFromTableResponse) => void;
}) {
  // Reference to `doAdvance` is used by the FormStep's post-save
  // Continue button (rare — only when the backend's on-save health
  // check disagrees with the pre-save Test).
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [savedCode, setSavedCode] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthState>({ ok: null, message: "" });
  const [error, setError] = useState<string | null>(null);

  // Reset when the modal is closed so re-opens don't leak previous state
  // (esp. the password).
  useEffect(() => {
    if (!open) {
      setStep("form");
      setForm(EMPTY_FORM);
      setSaving(false);
      setTesting(false);
      setSavedCode(null);
      setHealth({ ok: null, message: "" });
      setError(null);
    }
  }, [open]);

  // Adapt sensible defaults when the source type changes — but never
  // stomp on a value the user has already customized.
  const setType = (t: DataSourceType) => {
    setForm((f) => ({
      ...f,
      source_type: t,
      port: f.port === String(DEFAULT_PORTS[f.source_type] ?? "") ? String(DEFAULT_PORTS[t] ?? "") : f.port,
      schema: f.schema === (DEFAULT_SCHEMAS[f.source_type] ?? "") ? (DEFAULT_SCHEMAS[t] ?? "") : f.schema,
    }));
  };

  const canSubmit = useMemo(() => {
    return (
      form.source_type.length > 0 &&
      form.code.trim().length > 0 &&
      form.title.trim().length > 0 &&
      form.host.trim().length > 0 &&
      form.database.trim().length > 0 &&
      form.username.trim().length > 0
    );
  }, [form]);

  const buildPayload = () => ({
    source_type: form.source_type,
    code: form.code.trim(),
    title: form.title.trim(),
    host: form.host.trim(),
    port: form.port.trim() ? Number(form.port.trim()) : undefined,
    database: form.database.trim(),
    username: form.username.trim(),
    password: form.password,
    schema: form.schema.trim() || undefined,
    sslmode: form.sslmode.trim() || undefined,
    description: form.description.trim() || undefined,
  });

  const doTest = async () => {
    setTesting(true);
    setError(null);
    setHealth({ ok: null, message: "Testing…" });
    try {
      // Two paths — pre-save and post-save. Pre-save hits
      // test_credentials with the raw form values (no Data Source
      // persisted). Post-save re-pings the persisted row via
      // test_connection so the DocType's last_connected_at gets
      // updated. Same response shape either way.
      const url = savedCode
        ? "/api/analytics/semantics/data-sources/test-connection"
        : "/api/analytics/semantics/data-sources/test-credentials";
      const body = savedCode ? { code: savedCode } : buildPayload();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        latency_ms?: number;
        server_version?: string;
        error?: string;
      } | null;
      if (!res.ok) throw new Error(payload?.error ?? `HTTP ${res.status}`);
      setHealth({
        ok: !!payload?.ok,
        message: payload?.message ?? "",
        latency_ms: payload?.latency_ms ?? null,
        server_version: payload?.server_version ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test failed.");
    } finally {
      setTesting(false);
    }
  };

  const doSave = async () => {
    setSaving(true);
    setError(null);
    // Don't wipe the green pill from the pre-save test — we want
    // the user to see "connected" persist through the save spinner.
    try {
      const res = await fetch("/api/analytics/semantics/data-sources/create-external", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const body = (await res.json().catch(() => null)) as
        | (CreateExternalResponse & { error?: string })
        | null;
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      if (!body) throw new Error("Empty response.");
      setSavedCode(body.code);
      setHealth({
        ok: body.health.ok,
        message: body.health.message,
        latency_ms: body.health.latency_ms,
        server_version: body.health.server_version,
      });
      // Save was gated on a green Test so this almost always fires.
      // If the backend's own health-check on save disagrees with
      // the pre-save test (rare — creds rotated in the millisecond
      // between them, or a fleeting network blip), we still stay
      // on this step so the user can Test again from the persisted
      // row and click Continue when it clears.
      if (body.health.ok) setStep("pick-table");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" />
            {step === "form" ? "Connect external database" : "Pick a table"}
          </DialogTitle>
        </DialogHeader>

        {step === "form" && (
          <FormStep
            onAdvance={() => setStep("pick-table")}
            form={form}
            onFormChange={(patch) => {
              // Any field edit invalidates the last test result —
              // a green pill from an earlier config shouldn't
              // still gate Save after the user changed the port.
              if (!savedCode && (health.ok === true || health.ok === false)) {
                setHealth({ ok: null, message: "" });
              }
              setForm({ ...form, ...patch });
            }}
            onTypeChange={(t) => {
              if (!savedCode && (health.ok === true || health.ok === false)) {
                setHealth({ ok: null, message: "" });
              }
              setType(t);
            }}
            canSubmit={canSubmit}
            saving={saving}
            testing={testing}
            health={health}
            error={error}
            savedCode={savedCode}
            onTest={doTest}
            onSave={doSave}
            onCancel={onClose}
          />
        )}

        {step === "pick-table" && savedCode && (
          <PickTableStep
            dataSourceCode={savedCode}
            sourceType={form.source_type}
            onBack={() => setStep("form")}
            onCancel={onClose}
            onCreated={(created) => {
              onCreated(created);
              onClose();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Form step ─────────────────────────────────────────────────────

function FormStep({
  form,
  onFormChange,
  onTypeChange,
  canSubmit,
  saving,
  testing,
  health,
  error,
  savedCode,
  onTest,
  onSave,
  onAdvance,
  onCancel,
}: {
  form: FormState;
  onFormChange: (patch: Partial<FormState>) => void;
  onTypeChange: (t: DataSourceType) => void;
  canSubmit: boolean;
  saving: boolean;
  testing: boolean;
  health: HealthState;
  error: string | null;
  savedCode: string | null;
  onTest: () => void;
  onSave: () => void;
  onAdvance: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {SUPPORTED.map((s) => (
          <button
            key={s.value}
            type="button"
            disabled={!s.ready || saving}
            onClick={() => onTypeChange(s.value)}
            className={cn(
              "rounded-md border px-2 py-2 text-xs transition-colors",
              form.source_type === s.value
                ? "border-primary bg-primary/10 text-foreground"
                : "border-input bg-card text-muted-foreground hover:bg-muted/30",
              !s.ready && "cursor-not-allowed opacity-50",
            )}
            title={s.ready ? "" : "Coming soon"}
          >
            <div className="font-medium">{s.label}</div>
            {!s.ready && (
              <div className="mt-0.5 text-[10px] italic">Coming soon</div>
            )}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Code" required hint="Stable identifier — lowercase snake_case, unique.">
          <input
            value={form.code}
            onChange={(e) => onFormChange({ code: e.target.value })}
            className={cn(inputClass, "font-mono text-[11px]")}
            placeholder="pg_warehouse"
            disabled={saving || !!savedCode}
          />
        </Field>
        <Field label="Title" required>
          <input
            value={form.title}
            onChange={(e) => onFormChange({ title: e.target.value })}
            className={inputClass}
            placeholder="Warehouse (Postgres)"
            disabled={saving || !!savedCode}
          />
        </Field>
        <Field label="Host" required className="sm:col-span-2">
          <input
            value={form.host}
            onChange={(e) => onFormChange({ host: e.target.value })}
            className={inputClass}
            placeholder="db.internal.example.com"
            disabled={saving || !!savedCode}
          />
        </Field>
        <Field label="Port">
          <input
            value={form.port}
            onChange={(e) => onFormChange({ port: e.target.value })}
            className={cn(inputClass, "font-mono text-[11px]")}
            inputMode="numeric"
            disabled={saving || !!savedCode}
          />
        </Field>
        <Field label="Database" required>
          <input
            value={form.database}
            onChange={(e) => onFormChange({ database: e.target.value })}
            className={inputClass}
            placeholder="analytics"
            disabled={saving || !!savedCode}
          />
        </Field>
        <Field label="Username" required>
          <input
            value={form.username}
            onChange={(e) => onFormChange({ username: e.target.value })}
            className={inputClass}
            autoComplete="off"
            disabled={saving || !!savedCode}
          />
        </Field>
        <Field label="Password" required={!savedCode}>
          <input
            type="password"
            value={form.password}
            onChange={(e) => onFormChange({ password: e.target.value })}
            className={inputClass}
            autoComplete="new-password"
            disabled={saving || !!savedCode}
            placeholder={savedCode ? "•••••• (stored)" : ""}
          />
        </Field>
        <Field label="Schema" hint="Search-path for unqualified table names.">
          <input
            value={form.schema}
            onChange={(e) => onFormChange({ schema: e.target.value })}
            className={cn(inputClass, "font-mono text-[11px]")}
            placeholder={DEFAULT_SCHEMAS[form.source_type] ?? ""}
            disabled={saving || !!savedCode}
          />
        </Field>
        {form.source_type === "postgres" && (
          <Field label="SSL mode" hint="Optional. e.g. require, prefer, disable.">
            <input
              value={form.sslmode}
              onChange={(e) => onFormChange({ sslmode: e.target.value })}
              className={cn(inputClass, "font-mono text-[11px]")}
              placeholder="prefer"
              disabled={saving || !!savedCode}
            />
          </Field>
        )}
        <Field label="Description" className="sm:col-span-2">
          <textarea
            value={form.description}
            onChange={(e) => onFormChange({ description: e.target.value })}
            rows={2}
            className={inputClass}
            disabled={saving || !!savedCode}
            placeholder="Optional. Shown to Ask (AI) when the source is used."
          />
        </Field>
      </div>

      {health.message && (
        <HealthPill health={health} />
      )}
      {error && (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/5 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 border-t pt-3">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onTest}
          disabled={testing || saving || !canSubmit}
          title={
            !canSubmit
              ? "Fill in code, title, host, database, username first."
              : ""
          }
        >
          {testing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
          Test connection
        </Button>
        {savedCode ? (
          // Post-save: the Data Source already exists. Re-hitting
          // Save would 409 on duplicate code, so surface a Continue
          // button that skips forward to the picker instead. Gated
          // on health.ok so the user can't advance with a broken
          // connection.
          <Button
            size="sm"
            onClick={onAdvance}
            disabled={health.ok !== true}
            title={
              health.ok !== true
                ? "Fix the connection first (Test connection)."
                : ""
            }
          >
            Continue <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={onSave}
            disabled={!canSubmit || saving || health.ok !== true}
            title={
              health.ok !== true
                ? "Run Test connection first — Save is enabled once the pill goes green."
                : ""
            }
          >
            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            Save &amp; continue <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Pick-table step ───────────────────────────────────────────────

function PickTableStep({
  dataSourceCode,
  sourceType,
  onBack,
  onCancel,
  onCreated,
}: {
  dataSourceCode: string;
  sourceType: DataSourceType;
  onBack: () => void;
  onCancel: () => void;
  onCreated: (created: CreateDatasetFromTableResponse) => void;
}) {
  const [tables, setTables] = useState<ExternalTableInfo[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [datasetTitle, setDatasetTitle] = useState("");
  const [datasetCode, setDatasetCode] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/analytics/semantics/data-sources/list-tables?code=${encodeURIComponent(dataSourceCode)}`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
        const payload = (await res.json()) as ListTablesResponse;
        setTables(payload.tables);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to list tables.");
      } finally {
        setLoading(false);
      }
    })();
  }, [dataSourceCode]);

  // Auto-suggest a Dataset title + code the moment the user picks a
  // table, but let them override.
  useEffect(() => {
    if (picked) {
      const stem = picked.replace(/[^A-Za-z0-9_]+/g, "_").toLowerCase();
      setDatasetTitle(`${picked} (${sourceType})`);
      setDatasetCode(`${dataSourceCode}_${stem}`.slice(0, 60));
    }
  }, [picked, dataSourceCode, sourceType]);

  const doCreate = async () => {
    if (!picked) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics/semantics/data-sources/create-dataset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data_source_code: dataSourceCode,
          table: picked,
          title: datasetTitle.trim() || `${picked} (${sourceType})`,
          dataset_code: datasetCode.trim() || undefined,
        }),
      });
      const body = (await res.json().catch(() => null)) as
        | (CreateDatasetFromTableResponse & { error?: string })
        | null;
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      if (body) onCreated(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create dataset failed.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Data Source <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">{dataSourceCode}</code>.
        Pick a table to expose as a Dataset — its columns will be
        catalogued immediately and per-column metric shortcuts will
        work just like a CSV upload.
      </p>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Fetching tables…
        </div>
      )}

      {error && (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/5 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}

      {tables && tables.length === 0 && !loading && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="mr-1 inline h-3 w-3" />
          No tables found in the configured schema. Double-check the
          schema on the Data Source form and try again.
        </p>
      )}

      {tables && tables.length > 0 && (
        <>
          <div className="max-h-64 overflow-y-auto rounded-md border bg-card">
            <ul className="divide-y">
              {tables.map((t) => (
                <li key={t.name}>
                  <button
                    type="button"
                    onClick={() => setPicked(t.name)}
                    className={cn(
                      "flex w-full items-start gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-muted/40",
                      picked === t.name && "bg-primary/10",
                    )}
                  >
                    <TableIcon className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-[11px] text-foreground">{t.name}</p>
                      {t.description && (
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                          {t.description}
                        </p>
                      )}
                    </div>
                    {picked === t.name && <Check className="h-3.5 w-3.5 text-primary" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {picked && (
            <div className="grid gap-3 rounded-md border border-primary/30 bg-primary/[0.03] p-3 sm:grid-cols-2">
              <Field label="Dataset title" required>
                <input
                  value={datasetTitle}
                  onChange={(e) => setDatasetTitle(e.target.value)}
                  className={inputClass}
                  disabled={creating}
                />
              </Field>
              <Field label="Dataset code" hint="Auto-generated; edit if you need a stable ID.">
                <input
                  value={datasetCode}
                  onChange={(e) => setDatasetCode(e.target.value)}
                  className={cn(inputClass, "font-mono text-[11px]")}
                  disabled={creating}
                />
              </Field>
            </div>
          )}
        </>
      )}

      <div className="flex justify-end gap-2 border-t pt-3">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={creating}>
          Back
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={creating}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={doCreate}
          disabled={!picked || creating || !datasetTitle.trim()}
        >
          {creating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
          Create dataset
        </Button>
      </div>
    </div>
  );
}

// ── Bits ──────────────────────────────────────────────────────────

function HealthPill({ health }: { health: HealthState }) {
  const ok = health.ok === true;
  const bad = health.ok === false;
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-[11px]",
        ok && "border-emerald-500/40 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300",
        bad && "border-rose-500/40 bg-rose-500/5 text-rose-800 dark:text-rose-300",
        health.ok === null && "border-input bg-muted/30 text-muted-foreground",
      )}
    >
      {ok && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
      {bad && <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
      {health.ok === null && <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" />}
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {ok && "Connected"}
          {bad && "Connection failed"}
          {health.ok === null && "Working…"}
          {typeof health.latency_ms === "number" && ok && (
            <span className="ml-2 font-normal text-muted-foreground">
              {health.latency_ms}ms
            </span>
          )}
        </p>
        <p className="mt-0.5 break-words font-mono text-[10px] leading-snug opacity-80">
          {health.message}
        </p>
        {health.server_version && ok && (
          <p className="mt-0.5 text-[10px] opacity-70">{health.server_version}</p>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-[11px] font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-rose-600">*</span>}
      </span>
      {children}
      {hint && <span className="mt-0.5 block text-[10px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

const inputClass =
  "block w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60";

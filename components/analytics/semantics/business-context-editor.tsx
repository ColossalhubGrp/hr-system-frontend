"use client";

import { useEffect, useState } from "react";
import { Check, Info, Loader2, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/**
 * Business Context editor — the third tab under /analytics/semantics.
 *
 * Fields map 1:1 to the BI Business Context Singleton:
 *   fiscal_year_start_month  — anchors "this fiscal year" phrases
 *   default_timezone         — anchors "today" / "yesterday"
 *   base_currency            — currency formatting fallback
 *   currency_notes           — free-form for Steward context
 *   code_system_notes        — free-form for coding conventions
 *   profile_apps             — comma-separated app scope override
 *
 * The response's `resolved` block shows what the accessor returns
 * TODAY (with defaults applied for any empty raw fields), so a
 * Steward can see the difference between "what's in the DB" and
 * "what Ask actually reads".
 */

type ContextResponse = {
  raw: {
    fiscal_year_start_month: string | null;
    default_timezone: string | null;
    base_currency: string | null;
    currency_notes: string | null;
    code_system_notes: string | null;
    profile_apps: string | null;
    last_profiled_at: string | null;
    last_profile_stats: string | null;
  };
  resolved: {
    fiscal_year_start_month: number;
    default_timezone: string;
    base_currency: string;
    currency_notes: string;
    code_system_notes: string;
    profile_apps: string[];
  };
  editable: boolean;
};

export function BusinessContextEditor() {
  const [data, setData] = useState<ContextResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state — starts from the fetch, updated locally as the user types.
  const [form, setForm] = useState({
    fiscal_year_start_month: 1,
    default_timezone: "",
    base_currency: "",
    currency_notes: "",
    code_system_notes: "",
    profile_apps: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics/semantics/business-context", {
        cache: "no-store",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const payload = (await res.json()) as ContextResponse;
      setData(payload);
      // Seed the form from the RESOLVED values so a first-open shows
      // the effective settings, not "empty because unset".
      setForm({
        fiscal_year_start_month: payload.resolved.fiscal_year_start_month,
        default_timezone: payload.resolved.default_timezone,
        base_currency: payload.resolved.base_currency,
        currency_notes: payload.raw.currency_notes ?? "",
        code_system_notes: payload.raw.code_system_notes ?? "",
        profile_apps: (payload.raw.profile_apps ?? payload.resolved.profile_apps.join(", ")),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/analytics/semantics/business-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      setSaved(true);
      await load();
      // Reset the "Saved!" flash after a couple seconds.
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading context…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-rose-500/30 bg-rose-500/5 p-6 text-center">
        <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
          Couldn't load business context
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{error}</p>
        <Button onClick={load} variant="outline" size="sm" className="mt-4">
          <RefreshCw className="mr-2 h-3.5 w-3.5" /> Retry
        </Button>
      </div>
    );
  }
  if (!data) return null;

  const editable = data.editable;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pt-2">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Semantic layer / Business context
        </p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">
          Business context
        </h2>
        <p className="mt-1 max-w-xl text-xs text-muted-foreground">
          Organization-level facts the profiler and Ask (AI) can't
          infer from schema. Empty fields fall back to sensible
          defaults shown next to each control.
        </p>
      </header>

      <section className="space-y-4">
        <Row
          label="Fiscal year starts in month"
          hint="1 = January (calendar year). 4 = April, etc. Anchors 'this fiscal year' phrases."
          fallback={String(data.resolved.fiscal_year_start_month)}
          control={
            <select
              value={form.fiscal_year_start_month}
              onChange={(e) =>
                setForm({ ...form, fiscal_year_start_month: Number(e.target.value) })
              }
              disabled={!editable}
              className={inputClass}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>{monthLabel(m)}</option>
              ))}
            </select>
          }
        />

        <Row
          label="Default timezone"
          hint="IANA name (e.g. Africa/Harare, Europe/London, America/New_York). Anchors 'today' / 'yesterday' phrases."
          fallback={data.resolved.default_timezone}
          control={
            <input
              type="text"
              value={form.default_timezone}
              onChange={(e) => setForm({ ...form, default_timezone: e.target.value })}
              disabled={!editable}
              className={inputClass}
              placeholder="Africa/Harare"
            />
          }
        />

        <Row
          label="Base currency"
          hint="Currency code for figures without an explicit unit. Must be a valid Frappe Currency."
          fallback={data.resolved.base_currency}
          control={
            <input
              type="text"
              value={form.base_currency}
              onChange={(e) => setForm({ ...form, base_currency: e.target.value.toUpperCase() })}
              disabled={!editable}
              className={inputClass}
              placeholder="USD"
              maxLength={12}
            />
          }
        />

        <Row
          label="Currency notes"
          hint="Free-form context for the AI. E.g. 'gross_usd is always USD, gross_zig is ZWL'."
          fallback="—"
          control={
            <textarea
              value={form.currency_notes}
              onChange={(e) => setForm({ ...form, currency_notes: e.target.value })}
              disabled={!editable}
              rows={2}
              className={inputClass}
            />
          }
        />

        <Row
          label="Code system notes"
          hint="Anything the AI won't figure out from schema alone. E.g. 'branch field uses ISO country codes'."
          fallback="—"
          control={
            <textarea
              value={form.code_system_notes}
              onChange={(e) => setForm({ ...form, code_system_notes: e.target.value })}
              disabled={!editable}
              rows={2}
              className={inputClass}
            />
          }
        />

        <Row
          label="Apps to profile"
          hint="Comma-separated list of installed Frappe apps the profiler should scan. Empty = use built-in default set."
          fallback={data.resolved.profile_apps.join(", ")}
          control={
            <input
              type="text"
              value={form.profile_apps}
              onChange={(e) => setForm({ ...form, profile_apps: e.target.value })}
              disabled={!editable}
              className={cn(inputClass, "font-mono text-[11px]")}
              placeholder="colossal_bi, human_resources, ..."
            />
          }
        />
      </section>

      <section className="rounded-xl border border-input bg-muted/20 px-4 py-3 text-[11px] text-muted-foreground">
        <div className="mb-1 flex items-center gap-1 text-foreground">
          <Info className="h-3 w-3" />
          <span className="font-semibold">Profiling status</span>
        </div>
        <div>
          <span>Last run: </span>
          <span className="font-mono text-foreground">
            {data.raw.last_profiled_at ?? "never"}
          </span>
        </div>
        {data.raw.last_profile_stats && (
          <div className="mt-1 break-all">
            <span>Last stats: </span>
            <code className="font-mono">{data.raw.last_profile_stats}</code>
          </div>
        )}
      </section>

      {error && (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/5 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {editable ? (
        <div className="flex items-center justify-end gap-2">
          {saved && (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300">
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={load} disabled={saving}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reload
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-3.5 w-3.5" /> Save changes
              </>
            )}
          </Button>
        </div>
      ) : (
        <p className="text-[11px] italic text-muted-foreground">
          Read-only — only BI Data Steward and System Manager can edit business context.
        </p>
      )}
    </div>
  );
}

// ── Row + shared style ─────────────────────────────────────────────

function Row({
  label,
  hint,
  fallback,
  control,
}: {
  label: string;
  hint: string;
  fallback: string;
  control: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[max-content_1fr] sm:gap-x-6">
      <div className="min-w-[200px] pt-1.5">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
          {hint}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          fallback: <span className="font-mono text-foreground">{fallback}</span>
        </p>
      </div>
      <div>{control}</div>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60";

function monthLabel(m: number): string {
  const names = ["", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  return `${m} — ${names[m]}`;
}

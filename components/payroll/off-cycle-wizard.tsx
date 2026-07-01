"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { toast } from "@/components/ui/sonner";
import { createOffCycleRun } from "@/app/(workspace)/payroll/payruns-actions";

/**
 * 3-step off-cycle wizard (Belina parity):
 *   1. Title + run type (BONUS / COMMISSION / TERMINAL)
 *   2. Amount basis (ONE_MONTH / FLAT $USD) + pay date
 *   3. Review + submit
 *
 * On submit calls createOffCycleRun which creates a Payroll Run +
 * seeds the special-earning Transactions per payable employee, then
 * redirects to /payroll/[id]?offcycle=1.
 */
export function OffCycleWizard() {
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [d, setD] = useState({
    title: "Annual Bonus Run",
    runType: "BONUS" as "BONUS" | "COMMISSION" | "TERMINAL",
    basis: "ONE_MONTH" as "ONE_MONTH" | "FLAT",
    flatUsd: "500",
    payDate: defaultPayDate(),
  });
  const set = (p: Partial<typeof d>) => setD((s) => ({ ...s, ...p }));

  const steps = [
    <div key="0" className="space-y-6">
      <Q label="What should we call this special run?">
        <input
          value={d.title}
          onChange={(e) => set({ title: e.target.value })}
          className="h-10 w-full max-w-md rounded-md border border-input bg-transparent px-3 text-sm"
        />
      </Q>
      <Q label="What type of run is this?">
        <Radios
          name="runType"
          value={d.runType}
          onChange={(v) => set({ runType: v as typeof d.runType })}
          options={[
            { value: "BONUS", label: "Bonus / 13th cheque", tag: "Tax-free portion applies" },
            { value: "COMMISSION", label: "Commission run" },
            { value: "TERMINAL", label: "Terminal / final pay" },
          ]}
        />
      </Q>
    </div>,
    <div key="1" className="space-y-6">
      <Q label="How is the amount determined?">
        <Radios
          name="basis"
          value={d.basis}
          onChange={(v) => set({ basis: v as typeof d.basis })}
          options={[
            { value: "ONE_MONTH", label: "One month's basic pay (per employee, USD + ZiG)" },
            { value: "FLAT", label: "A flat amount for everyone" },
          ]}
        />
      </Q>
      {d.basis === "FLAT" && (
        <Q label="Flat amount (US$)">
          <input
            type="number"
            value={d.flatUsd}
            onChange={(e) => set({ flatUsd: e.target.value })}
            className="h-10 w-full max-w-xs rounded-md border border-input bg-transparent px-3 text-sm"
          />
        </Q>
      )}
      <Q label="Pay date">
        <input
          type="date"
          value={d.payDate}
          onChange={(e) => set({ payDate: e.target.value })}
          className="h-10 w-full max-w-xs rounded-md border border-input bg-transparent px-3 text-sm"
        />
      </Q>
    </div>,
    <div key="2" className="space-y-3">
      <h3 className="font-bold text-foreground">Review</h3>
      <div className="divide-y rounded-xl border bg-card text-sm">
        <Row k="Name" v={d.title} />
        <Row k="Run type" v={d.runType[0] + d.runType.slice(1).toLowerCase()} />
        <Row
          k="Amount basis"
          v={d.basis === "FLAT" ? `Flat US$${d.flatUsd}` : "One month's basic"}
        />
        <Row k="Pay date" v={d.payDate} />
        <Row k="Who's paid" v="All active employees with complete statutory info" />
      </div>
      <p className="text-xs text-muted-foreground">
        We&apos;ll create the run with each employee&apos;s special earning, ready
        for you to review &amp; process.
        {d.runType === "BONUS" && " The ZIMRA tax-free bonus portion is applied automatically."}
      </p>
    </div>,
  ];

  const last = step === steps.length - 1;

  function submit() {
    const fd = new FormData();
    fd.set("title", d.title);
    fd.set("runType", d.runType);
    fd.set("basis", d.basis);
    fd.set("flatUsd", d.flatUsd);
    fd.set("payDate", d.payDate);
    startTransition(async () => {
      try {
        await createOffCycleRun(fd);
        // redirect throws NEXT_REDIRECT — caught below as non-error
      } catch (err) {
        const msg = (err as { message?: string })?.message ?? "";
        if (msg.includes("NEXT_REDIRECT")) throw err;
        toast.error(msg || "Couldn't create the off-cycle run.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-bold text-foreground">
        Create an off-cycle pay run
      </h1>
      <div className="mb-6 text-sm text-muted-foreground">
        Step {step + 1} of {steps.length}
      </div>
      <div className="mb-8 h-1 w-full rounded bg-muted">
        <div
          className="h-1 rounded bg-primary transition-all"
          style={{ width: `${((step + 1) / steps.length) * 100}%` }}
        />
      </div>

      {steps[step]}

      <div className="mt-10 flex justify-between">
        <button
          type="button"
          disabled={step === 0 || pending}
          onClick={() => setStep((s) => s - 1)}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-transparent px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/40 disabled:opacity-60"
        >
          ‹ Back
        </button>
        {last ? (
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            {pending ? "Creating…" : "Create off-cycle run"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Move to next step
          </button>
        )}
      </div>
    </div>
  );
}

function defaultPayDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

function Q({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-foreground">{label}</p>
      {children}
    </div>
  );
}

function Radios({
  name, value, onChange, options,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; tag?: string }[];
}) {
  return (
    <div className="space-y-2">
      {options.map((o) => (
        <label
          key={o.value}
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm",
            value === o.value
              ? "border-primary bg-primary/[0.06]"
              : "border-input hover:bg-muted/40",
          )}
        >
          <input
            type="radio"
            name={name}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="h-4 w-4"
          />
          <span className="flex-1">{o.label}</span>
          {o.tag && (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              {o.tag}
            </span>
          )}
        </label>
      ))}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-semibold text-foreground">{v}</span>
    </div>
  );
}

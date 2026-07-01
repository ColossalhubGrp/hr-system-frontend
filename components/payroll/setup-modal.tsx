"use client";

import { useState, useTransition } from "react";
import { toast } from "@/components/ui/sonner";

export interface SetupField {
  name: string;
  label: string;
  type?: "text" | "number" | "select";
  options?: string[];
  defaultValue?: string | number;
  placeholder?: string;
}

/**
 * Modal-based Add/Edit form for the Setup lookup tables. Mirrors the
 * Belina UX: centered overlay, two-column grid for short fields,
 * select fields span full width, Cancel + Save buttons.
 */
export function AddRecordModal({
  title,
  buttonLabel,
  action,
  fields,
  successMessage,
}: {
  title: string;
  buttonLabel: string;
  action: (formData: FormData) => Promise<void> | void;
  fields: SetupField[];
  successMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, run] = useFormSubmit({
    action,
    onSuccess: () => {
      toast.success(successMessage ?? "Added.");
      setOpen(false);
    },
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
      >
        {buttonLabel}
      </button>
    );
  }

  return (
    <Overlay onClose={() => (pending ? null : setOpen(false))}>
      <Header title={title} onClose={() => setOpen(false)} />
      <form onSubmit={run} className="grid grid-cols-2 gap-4">
        {fields.map((f) => (
          <FieldRow key={f.name} f={f} />
        ))}
        <Footer
          onCancel={() => setOpen(false)}
          submit={pending ? "Adding…" : "Add"}
          disabled={pending}
        />
      </form>
    </Overlay>
  );
}

export function EditRecordModal({
  id,
  title,
  action,
  fields,
  successMessage,
}: {
  id: string;
  title: string;
  action: (formData: FormData) => Promise<void> | void;
  fields: SetupField[];
  successMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, run] = useFormSubmit({
    action,
    onSuccess: () => {
      toast.success(successMessage ?? "Saved.");
      setOpen(false);
    },
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-primary hover:underline"
      >
        Edit
      </button>
    );
  }

  return (
    <Overlay onClose={() => (pending ? null : setOpen(false))}>
      <Header title={title} onClose={() => setOpen(false)} />
      <form onSubmit={run} className="grid grid-cols-2 gap-4">
        <input type="hidden" name="id" value={id} />
        {fields.map((f) => (
          <FieldRow key={f.name} f={f} />
        ))}
        <Footer
          onCancel={() => setOpen(false)}
          submit={pending ? "Saving…" : "Save changes"}
          disabled={pending}
        />
      </form>
    </Overlay>
  );
}

// ── shared bits ──────────────────────────────────────────────────

function Overlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-lg">
        {children}
      </div>
    </div>
  );
}

function Header({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      <button
        type="button"
        onClick={onClose}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Close"
      >
        ✕
      </button>
    </div>
  );
}

function FieldRow({ f }: { f: SetupField }) {
  const wide = f.type === "select" ? "col-span-2" : "col-span-1";
  return (
    <label className={`text-sm ${wide}`}>
      <span className="mb-1 block font-semibold text-foreground">{f.label}</span>
      {f.type === "select" ? (
        <select
          name={f.name}
          defaultValue={f.defaultValue}
          className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
        >
          {(f.options ?? []).map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input
          name={f.name}
          type={f.type ?? "text"}
          defaultValue={f.defaultValue}
          placeholder={f.placeholder}
          step={f.type === "number" ? "any" : undefined}
          className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
        />
      )}
    </label>
  );
}

function Footer({
  onCancel,
  submit,
  disabled,
}: {
  onCancel: () => void;
  submit: string;
  disabled?: boolean;
}) {
  return (
    <div className="col-span-2 mt-2 flex justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={disabled}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-transparent px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/40 disabled:opacity-60"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={disabled}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
      >
        {submit}
      </button>
    </div>
  );
}

/**
 * Wraps a Server Action so the modal can react to success/failure:
 * runs the action in a React transition, captures any thrown error
 * for a toast, calls onSuccess on clean completion.
 */
function useFormSubmit({
  action,
  onSuccess,
}: {
  action: (formData: FormData) => Promise<void> | void;
  onSuccess: () => void;
}): [boolean, (e: React.FormEvent<HTMLFormElement>) => void] {
  const [pending, startTransition] = useTransition();
  function run(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await action(fd);
        onSuccess();
      } catch (err) {
        const msg =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: unknown }).message)
            : "Save failed.";
        toast.error(msg);
      }
    });
  }
  return [pending, run];
}

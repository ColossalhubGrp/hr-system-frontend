import { FrappeRequestError } from "./client";

/**
 * Standard shape every form Server Action returns: a top-level `error` and
 * per-field map. The picker components and `useFormState` already understand
 * this shape.
 */
export type StdFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * Map a Frappe REST failure into the shape forms render. Frappe surfaces
 * validation messages through `_server_messages` (a double-JSON-encoded list
 * of `{message, title}` objects); we extract the first one verbatim because
 * it's already user-facing.
 */
export function toFormState(err: unknown): StdFormState {
  if (err instanceof FrappeRequestError) {
    const detail = err.detail as
      | { _server_messages?: string; message?: string }
      | undefined;
    if (detail?._server_messages) {
      try {
        const arr = JSON.parse(detail._server_messages) as string[];
        const first = arr[0]
          ? (JSON.parse(arr[0]) as { message?: string })
          : undefined;
        if (first?.message) return { error: stripHtml(first.message) };
      } catch {
        /* fall through */
      }
    }
    if (typeof detail?.message === "string") return { error: detail.message };
    return { error: err.message };
  }
  return { error: "Something went wrong. Try again." };
}

export function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim();
}

/**
 * Pull plain-string entries out of a FormData. Skips File entries (those
 * belong to dedicated upload actions, not form parsers).
 */
export function formToRecord(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of form.entries()) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

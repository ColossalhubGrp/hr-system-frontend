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
/** Frappe titles that carry no useful information — treat them as
 *  "no message" so we keep digging for the real error text. */
const GENERIC_MESSAGES = new Set([
  "Invalid Request",
  "Message",
  "Internal Server Error",
  "",
]);

export function toFormState(err: unknown): StdFormState {
  // Next.js signals redirect() / notFound() by THROWING internal errors that
  // the framework catches at the outer boundary — the digest starts with
  // NEXT_REDIRECT or equals NEXT_NOT_FOUND. If a Server Action's try/catch
  // swallows one of these, the redirect never fires and the user sees a
  // generic "Something went wrong" toast instead of the destination page.
  // Re-throw so the framework can process it.
  if (typeof err === "object" && err !== null) {
    const digest = (err as { digest?: unknown }).digest;
    if (
      typeof digest === "string" &&
      (digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND")
    ) {
      throw err;
    }
  }
  if (err instanceof FrappeRequestError) {
    const detail = err.detail as
      | {
          _server_messages?: string;
          message?: string;
          exception?: string;
          exc_type?: string;
          exc?: string;
        }
      | undefined;

    // Prefer _server_messages — that's where frappe.throw /
    // frappe.msgprint(raise_exception=True) put user-facing text.
    // Collect ALL of them; validate() sometimes accumulates a few.
    if (detail?._server_messages) {
      try {
        const arr = JSON.parse(detail._server_messages) as string[];
        const messages: string[] = [];
        for (const raw of arr) {
          try {
            const parsed = JSON.parse(raw) as {
              message?: string;
              title?: string;
            };
            const msg = stripHtml(parsed.message ?? "");
            if (msg && !GENERIC_MESSAGES.has(msg)) {
              const title = stripHtml(parsed.title ?? "");
              // Prepend the title only when it adds context beyond
              // Frappe's defaults ("Message", "Invalid Request", …).
              messages.push(
                title && !GENERIC_MESSAGES.has(title)
                  ? `${title}: ${msg}`
                  : msg,
              );
            }
          } catch {
            /* ignore this entry */
          }
        }
        if (messages.length > 0) return { error: messages.join(" · ") };
      } catch {
        /* fall through */
      }
    }

    // Fall back to detail.message — but skip Frappe's generic HTTP
    // titles ("Invalid Request" etc.) that hide the real cause.
    const message = typeof detail?.message === "string" ? detail.message : "";
    if (message && !GENERIC_MESSAGES.has(message)) {
      return { error: message };
    }

    // Last resort: Frappe includes the exception name + traceback tail
    // in `exception` — pull the final line, which is usually the
    // actual "SomethingError: real message" text the API refused to
    // surface upfront.
    const exception =
      typeof detail?.exception === "string" ? detail.exception : "";
    if (exception) {
      const lastLine = exception
        .trim()
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .pop();
      if (lastLine && !GENERIC_MESSAGES.has(lastLine)) {
        return { error: stripHtml(lastLine) };
      }
    }

    const excType = typeof detail?.exc_type === "string" ? detail.exc_type : "";
    if (excType) {
      return { error: `${excType}${message ? ` — ${message}` : ""}` };
    }

    return { error: message || err.message };
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

"use client";

import { Printer, Copy, Check } from "lucide-react";
import { useState } from "react";

/**
 * Tiny client-side toolbar for the letter preview page:
 *  - "Print / Save as PDF" → window.print() (browser handles the rest)
 *  - "Copy HTML" → puts the rendered letter on the clipboard (for pasting
 *    into email or a doc)
 */
export function LetterPreviewActions({
  /** Inner HTML of the .letter-body element. */
  htmlBody,
  subject,
}: {
  htmlBody: string;
  subject: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      // Compose a minimal HTML doc so when pasted into email clients it
      // keeps the structure.
      const composed = `<!doctype html><html><head><meta charset="utf-8"/><title>${subject}</title></head><body>${htmlBody}</body></html>`;
      await navigator.clipboard.writeText(composed);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can fail in non-HTTPS contexts; ignore silently.
    }
  }

  return (
    <div className="no-print flex gap-2">
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex h-9 items-center gap-1.5 rounded-chip bg-ink-800 px-3 text-xs font-semibold text-white transition hover:bg-ink-700 focus-ring"
      >
        <Printer className="h-3.5 w-3.5" />
        Print / Save as PDF
      </button>
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex h-9 items-center gap-1.5 rounded-chip border border-hairline px-3 text-xs font-medium text-ash-700 transition hover:bg-canvas focus-ring"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-rise" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            Copy HTML
          </>
        )}
      </button>
    </div>
  );
}

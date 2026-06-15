import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, FileText, Lock } from "lucide-react";
import { getEmployee } from "@/lib/frappe/employees";
import { getMyAccess } from "@/lib/frappe/roles";
import { readSession } from "@/lib/frappe/session";
import {
  LETTER_TYPES,
  buildLetterContext,
  renderLetter,
  type LetterKind,
} from "@/lib/frappe/letters";
import { LetterPreviewActions } from "@/components/employee/letter-preview-actions";

export const metadata = { title: "Letter preview · Colossal HR" };

const VALID_KINDS: LetterKind[] = ["offer", "employment", "experience"];

function isLetterKind(s: string): s is LetterKind {
  return (VALID_KINDS as string[]).includes(s);
}

export default async function LetterPreviewPage({
  params,
}: {
  params: { id: string; kind: string };
}) {
  const id = decodeURIComponent(params.id);
  const kind = decodeURIComponent(params.kind);
  if (!isLetterKind(kind)) notFound();

  const access = await getMyAccess();
  if (!access.isHrAny) {
    redirect(
      `/forbidden?need=HR_ANY&from=${encodeURIComponent(
        `/employee/${id}/letters/${kind}`,
      )}`,
    );
  }

  const emp = await getEmployee(id);
  if (!emp) notFound();

  // Refuse to render a letter for a state it isn't valid in — e.g. an
  // experience letter for an Active employee. The index page already filters
  // these out, but a direct URL would slip past it.
  const t = LETTER_TYPES.find((x) => x.kind === kind);
  if (!t || !t.availableWhen(emp)) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href={`/employee/${encodeURIComponent(emp.id)}/letters` as Route}
          className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to letters
        </Link>
        <p className="rounded-card border border-dashed border-hairline bg-canvas/50 px-6 py-10 text-center text-sm text-ash-700">
          <Lock className="mx-auto mb-2 h-4 w-4 text-ash-500" />
          {t?.unavailableReason ?? "This letter isn't available for this employee."}
        </p>
      </div>
    );
  }

  // Issuing officer defaults to the signed-in HR user.
  const session = readSession();
  const ctx = await buildLetterContext(emp, {
    name: session.fullName ?? session.userId ?? "HR Office",
    title: "Human Resources",
  });
  const letter = renderLetter(kind, emp, ctx);

  return (
    <>
      {/* Page chrome — hidden when the user prints. The .no-print class is
          referenced in globals.css and in the inline style below. */}
      <div className="no-print flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/employee/${encodeURIComponent(emp.id)}/letters` as Route}
            className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to letters
          </Link>
          <LetterPreviewActions
            htmlBody={letter.bodyHtml}
            subject={letter.subject}
          />
        </div>
        <header className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs text-ash-500">
            <FileText className="h-3.5 w-3.5" />
            HR · Letter preview · {t.label}
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-ink-900">
            {letter.subject}
          </h1>
          <p className="text-xs text-ash-500">
            Filename suggestion: <code>{letter.filenameSlug}.pdf</code>
          </p>
        </header>
      </div>

      {/* The letter itself. Print stylesheet inlined here so the page is
          self-contained — when the user hits Print, only this block renders,
          full-bleed on an A4 page. */}
      <style>{LETTER_PRINT_CSS}</style>

      <article
        className="letter-page mx-auto mt-6 max-w-[820px] rounded-card border border-hairline bg-surface shadow-card"
        aria-label={letter.subject}
      >
        <header className="letter-head">
          <div>
            <p className="letter-brand">{emp.company ?? "Colossal HR"}</p>
            {ctx.companyAddress && (
              <p className="letter-brand-address">{ctx.companyAddress}</p>
            )}
          </div>
        </header>
        <div
          className="letter-body"
          dangerouslySetInnerHTML={{ __html: letter.bodyHtml }}
        />
      </article>
    </>
  );
}

const LETTER_PRINT_CSS = `
.letter-page {
  padding: 64px 72px;
  color: #1a1c2c;
  font-family: "Georgia", "Times New Roman", serif;
  line-height: 1.55;
  font-size: 12pt;
}
.letter-head {
  border-bottom: 1px solid #d6d6e0;
  padding-bottom: 16px;
  margin-bottom: 32px;
}
.letter-brand {
  font-family: "Inter", system-ui, sans-serif;
  font-size: 14pt;
  font-weight: 600;
  letter-spacing: 0.5px;
  margin: 0;
  color: #1E1B53;
}
.letter-brand-address {
  font-family: "Inter", system-ui, sans-serif;
  font-size: 9pt;
  color: #7a7a8a;
  margin: 4px 0 0;
}
.letter-body p { margin: 0 0 14px; }
.letter-date { color: #555; font-size: 11pt; margin-bottom: 24px; }
.letter-to { margin-bottom: 24px; }
.letter-subject { margin-bottom: 20px; }
.letter-signature {
  margin-top: 48px;
  border-top: 1px solid transparent;
}
.letter-signature p { margin: 0; }
.letter-signature-name { margin-top: 36px; }
.letter-company-address {
  font-size: 10pt;
  color: #7a7a8a;
  margin-top: 6px;
}
@media print {
  /* Only the letter article prints — strip everything else. */
  body * { visibility: hidden; }
  .letter-page, .letter-page * { visibility: visible; }
  .letter-page {
    position: absolute;
    inset: 0;
    margin: 0;
    border: 0;
    box-shadow: none;
    max-width: none;
    padding: 24mm 22mm;
  }
  .no-print { display: none !important; }
  @page { size: A4; margin: 0; }
}
`;

import "server-only";
import type { EmployeeFull } from "./employees";
import { frappeCall } from "./client";

/**
 * HR letter generation.
 *
 * Three templates are bundled with the app today: offer (pre-hire), employment
 * (proof for active employees), experience (post-exit testimonial). Each one
 * is rendered server-side into a print-ready HTML body with the employee's
 * fields substituted into `{{handlebars}}` placeholders.
 *
 * Why TypeScript templates and not a Frappe doctype:
 *   - Zero schema rollout — HR can issue letters the moment they hit the page.
 *   - The templates rarely change; when they do, it's a code change a reviewer
 *     should see.
 *   - v2 can lift this into a `HR Letter Template` doctype if HR wants to edit
 *     without code — the `renderLetter()` shape is forward-compatible.
 *
 * Output is intentionally simple HTML, not PDF: the browser's Print dialog
 * (Cmd/Ctrl+P → Save as PDF) handles export reliably across every platform
 * without us shipping puppeteer or relying on Frappe's PDF service. The
 * preview page has a clean `@media print` style.
 */

export type LetterKind = "offer" | "employment" | "experience";

export const LETTER_TYPES: Array<{
  kind: LetterKind;
  label: string;
  description: string;
  /** When to surface this letter on the Employee profile. */
  availableWhen: (emp: EmployeeFull) => boolean;
  unavailableReason?: string;
}> = [
  {
    kind: "offer",
    label: "Offer letter",
    description:
      "Pre-hire offer — confirms role, joining date and headline salary. Suitable to send before the contract.",
    availableWhen: () => true, // Always issuable; HR may revise before the candidate joins.
  },
  {
    kind: "employment",
    label: "Employment letter",
    description:
      "Proof of employment for visa / bank / landlord use. Confirms designation, joining date and current status.",
    availableWhen: (emp) => emp.status === "Active",
    unavailableReason:
      "Employment letters are only issuable for active employees.",
  },
  {
    kind: "experience",
    label: "Experience letter",
    description:
      "Post-exit testimonial — confirms tenure and last designation. Issuable once the employee is marked Left.",
    availableWhen: (emp) => emp.status === "Left",
    unavailableReason:
      "Experience letters are only issuable after the employee has exited.",
  },
];

export type LetterContext = {
  /** ISO date the letter is issued (today by default). */
  issueDate: string;
  /** Optional issuing officer (name + title) — defaults to HR Office. */
  issuingOfficer?: { name: string; title?: string | null };
  /** Optional company defaults — pulled live where possible. */
  companyAddress?: string | null;
  /** Detected current annual / monthly compensation, if available. */
  compensation?: { gross: number; currency: string; frequency: string } | null;
};

export type RenderedLetter = {
  kind: LetterKind;
  subject: string;
  /** Print-ready inner HTML body. Already has its own structural CSS. */
  bodyHtml: string;
  /** Filename-safe slug for download. */
  filenameSlug: string;
};

/**
 * Resolve a small bundle of company / compensation context that letters
 * commonly reference. Best-effort — every miss falls back to a friendly
 * placeholder so the letter is still issuable.
 */
export async function buildLetterContext(
  emp: EmployeeFull,
  issuingOfficer?: { name: string; title?: string | null },
): Promise<LetterContext> {
  // Use the reference "current date" so the docs are deterministic against
  // the rest of the workspace (see CLAUDE memory `currentDate`).
  const today = "2026-06-13";

  let companyAddress: string | null = null;
  if (emp.company) {
    try {
      const c = await frappeCall<{
        country?: string | null;
        city?: string | null;
        default_currency?: string | null;
      }>({
        method: "frappe.client.get",
        args: { doctype: "Company", name: emp.company },
        as: "user",
      });
      const parts = [c.city, c.country].filter(Boolean) as string[];
      companyAddress = parts.length > 0 ? parts.join(", ") : null;
    } catch {
      companyAddress = null;
    }
  }

  // Best-effort: pick up the latest active Salary Structure Assignment to
  // surface gross compensation in the offer letter. Frappe rejects assignments
  // queries for non-payroll roles, so this is a soft try.
  let compensation: LetterContext["compensation"] = null;
  try {
    type SSA = {
      base?: number | null;
      variable?: number | null;
      currency?: string | null;
      payroll_frequency?: string | null;
    };
    const rows = await frappeCall<SSA[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Salary Structure Assignment",
        fields: ["base", "variable", "currency", "payroll_frequency"],
        filters: JSON.stringify([
          ["employee", "=", emp.id],
          ["docstatus", "=", 1],
        ]),
        order_by: "from_date desc",
        limit_page_length: 1,
      },
      as: "user",
    });
    const r = rows[0];
    if (r) {
      const gross = Number(r.base ?? 0) + Number(r.variable ?? 0);
      compensation = {
        gross,
        currency: r.currency ?? "USD",
        frequency: r.payroll_frequency ?? "Monthly",
      };
    }
  } catch {
    compensation = null;
  }

  return { issueDate: today, issuingOfficer, companyAddress, compensation };
}

/**
 * Render a letter to print-ready HTML. The body is wrapped by the preview page;
 * we return ONLY the inner content (no <html>/<head>) so the page can apply
 * letterhead + print stylesheet around it.
 */
export function renderLetter(
  kind: LetterKind,
  emp: EmployeeFull,
  ctx: LetterContext,
): RenderedLetter {
  switch (kind) {
    case "offer":
      return renderOfferLetter(emp, ctx);
    case "employment":
      return renderEmploymentLetter(emp, ctx);
    case "experience":
      return renderExperienceLetter(emp, ctx);
  }
}

// ---------------------------------------------------------------------------
// Per-letter templates. Inline string templates are deliberately simple —
// readability over abstraction. If we lift templates into a doctype later,
// each one becomes a `body` field in `HR Letter Template`.
// ---------------------------------------------------------------------------

function renderOfferLetter(
  emp: EmployeeFull,
  ctx: LetterContext,
): RenderedLetter {
  const dateLine = fmtDateLong(ctx.issueDate);
  const dojLine = emp.dateOfJoining
    ? fmtDateLong(emp.dateOfJoining)
    : "(joining date to be confirmed)";
  const grossLine = ctx.compensation
    ? `${ctx.compensation.currency} ${ctx.compensation.gross.toLocaleString()} per ${(ctx.compensation.frequency ?? "Monthly").toLowerCase()}`
    : "(compensation to be detailed in the contract)";
  const designation = emp.designation ?? "(designation to be confirmed)";

  return {
    kind: "offer",
    subject: `Offer of employment — ${emp.name}`,
    filenameSlug: slug(`offer-${emp.id}-${emp.name}`),
    bodyHtml: `
      <p class="letter-date">${dateLine}</p>

      <div class="letter-to">
        <p><strong>${escapeHtml(emp.name)}</strong></p>
        ${emp.currentAddress ? `<p>${escapeHtml(emp.currentAddress).replace(/\n/g, "<br/>")}</p>` : ""}
      </div>

      <p class="letter-subject"><strong>Subject: Offer of employment as ${escapeHtml(designation)}</strong></p>

      <p>Dear ${escapeHtml(firstName(emp.name))},</p>

      <p>
        We are pleased to extend an offer for the position of
        <strong>${escapeHtml(designation)}</strong>
        ${emp.department ? `within the ${escapeHtml(emp.department)} department ` : ""}at
        ${escapeHtml(emp.company ?? "the company")}, with an anticipated start date of
        <strong>${dojLine}</strong>.
      </p>

      <p>
        Your starting compensation will be <strong>${escapeHtml(grossLine)}</strong>, paid in line with
        the company's standard payroll calendar. Additional benefits, leave entitlements and
        deductions are governed by the policies in force at the time of payment.
      </p>

      <p>
        This offer is subject to satisfactory completion of any pre-employment checks the company
        may carry out and to your acceptance of the terms in the accompanying contract.
      </p>

      <p>
        Please confirm acceptance by signing and returning a copy of this letter at your earliest
        convenience, and not later than seven (7) calendar days from the date above.
      </p>

      ${signatureBlock(ctx)}
    `,
  };
}

function renderEmploymentLetter(
  emp: EmployeeFull,
  ctx: LetterContext,
): RenderedLetter {
  const dateLine = fmtDateLong(ctx.issueDate);
  const dojLine = emp.dateOfJoining ? fmtDateLong(emp.dateOfJoining) : "(joining date not on file)";

  return {
    kind: "employment",
    subject: `Letter of employment — ${emp.name}`,
    filenameSlug: slug(`employment-${emp.id}-${emp.name}`),
    bodyHtml: `
      <p class="letter-date">${dateLine}</p>

      <p class="letter-subject"><strong>To whom it may concern</strong></p>

      <p>
        This is to certify that <strong>${escapeHtml(emp.name)}</strong> (Employee ID:
        <code>${escapeHtml(emp.id)}</code>) has been employed with
        <strong>${escapeHtml(emp.company ?? "the company")}</strong> as
        <strong>${escapeHtml(emp.designation ?? "an employee")}</strong>
        ${emp.department ? `in the ${escapeHtml(emp.department)} department ` : ""}since
        <strong>${dojLine}</strong>, and continues to be in active employment as at the date of this
        letter.
      </p>

      <p>
        This letter is issued at the employee's request for the purpose of verifying current employment
        status. It does not constitute an offer, contract, or commitment beyond what is already provided
        for in the employee's contract of employment.
      </p>

      <p>
        For any verification queries, please contact the HR Office at the address below.
      </p>

      ${signatureBlock(ctx)}
    `,
  };
}

function renderExperienceLetter(
  emp: EmployeeFull,
  ctx: LetterContext,
): RenderedLetter {
  const dateLine = fmtDateLong(ctx.issueDate);
  const dojLine = emp.dateOfJoining ? fmtDateLong(emp.dateOfJoining) : "(joining date not on file)";
  const dorLine = emp.relievingDate
    ? fmtDateLong(emp.relievingDate)
    : "(relieving date not on file)";
  const tenure = computeTenure(emp.dateOfJoining, emp.relievingDate);

  return {
    kind: "experience",
    subject: `Experience letter — ${emp.name}`,
    filenameSlug: slug(`experience-${emp.id}-${emp.name}`),
    bodyHtml: `
      <p class="letter-date">${dateLine}</p>

      <p class="letter-subject"><strong>To whom it may concern</strong></p>

      <p>
        This is to certify that <strong>${escapeHtml(emp.name)}</strong> (Employee ID:
        <code>${escapeHtml(emp.id)}</code>) was employed with
        <strong>${escapeHtml(emp.company ?? "the company")}</strong> as
        <strong>${escapeHtml(emp.designation ?? "an employee")}</strong>
        ${emp.department ? `in the ${escapeHtml(emp.department)} department ` : ""}from
        <strong>${dojLine}</strong> to <strong>${dorLine}</strong>${
          tenure ? `, a total tenure of <strong>${tenure}</strong>` : ""
        }.
      </p>

      <p>
        During their time with us, ${escapeHtml(firstName(emp.name))} discharged their responsibilities
        with diligence and was a valued member of the team. We wish them well in their future endeavours.
      </p>

      <p>
        This letter is issued at the employee's request for general reference purposes.
      </p>

      ${signatureBlock(ctx)}
    `,
  };
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function signatureBlock(ctx: LetterContext): string {
  const officer = ctx.issuingOfficer ?? { name: "HR Office", title: "Human Resources" };
  const titleLine = officer.title ? `<p>${escapeHtml(officer.title)}</p>` : "";
  return `
    <div class="letter-signature">
      <p>Sincerely,</p>
      <p class="letter-signature-name"><strong>${escapeHtml(officer.name)}</strong></p>
      ${titleLine}
      ${ctx.companyAddress ? `<p class="letter-company-address">${escapeHtml(ctx.companyAddress)}</p>` : ""}
    </div>
  `;
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

function fmtDateLong(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function computeTenure(
  doj: string | null | undefined,
  dor: string | null | undefined,
): string | null {
  if (!doj || !dor) return null;
  const start = new Date(doj);
  const end = new Date(dor);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());
  if (months < 0) return null;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (years === 0) return `${remMonths} months`;
  if (remMonths === 0) return `${years} year${years === 1 ? "" : "s"}`;
  return `${years} year${years === 1 ? "" : "s"} ${remMonths} month${remMonths === 1 ? "" : "s"}`;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

"use client";

import { useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, ImagePlus, Trash2 } from "lucide-react";
import {
  uploadCompanyLogoAction,
  removeCompanyLogoAction,
  type FormState,
} from "@/app/(workspace)/settings/company/actions";

const EMPTY: FormState = {};

/**
 * Company logo card. Sits OUTSIDE the main company form (its own
 * <form>, since forms can't nest) and uploads on file pick. The logo
 * shows on printed documents — invoices, vouchers, reports, payslips.
 */
export function CompanyLogoUploader({
  companyId,
  logoUrl,
}: {
  companyId: string;
  /** Absolute URL of the current logo, or null. */
  logoUrl: string | null;
}) {
  const [state, dispatch] = useFormState(
    uploadCompanyLogoAction.bind(null, companyId),
    EMPTY,
  );
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Logo
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Shown on the letterhead of printed invoices, vouchers, reports and payslips. PNG, JPG,
        WEBP or SVG, up to 2 MB — a wide logo on a transparent background prints best.
      </p>

      {state.error && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{state.error}</div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-5">
        <div className="flex h-20 w-44 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-white p-2">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Company logo" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-xs text-muted-foreground">No logo yet</span>
          )}
        </div>

        <form ref={formRef} action={dispatch} className="flex items-center gap-2">
          <UploadControls hasLogo={Boolean(logoUrl)} formRef={formRef} />
        </form>

        {logoUrl && <RemoveButton companyId={companyId} />}
      </div>
    </section>
  );
}

function UploadControls({
  hasLogo,
  formRef,
}: {
  hasLogo: boolean;
  formRef: React.RefObject<HTMLFormElement>;
}) {
  const { pending } = useFormStatus();
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        name="logo"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={() => formRef.current?.requestSubmit()}
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
        className="inline-flex h-9 items-center gap-1.5 rounded-chip border border-input px-3 text-sm font-semibold hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <ImagePlus className="h-4 w-4" />
        {pending ? "Uploading…" : hasLogo ? "Replace logo" : "Upload logo"}
      </button>
    </>
  );
}

function RemoveButton({ companyId }: { companyId: string }) {
  const remove = async () => {
    await removeCompanyLogoAction(companyId);
  };
  return (
    <form action={remove}>
      <RemoveButtonInner />
    </form>
  );
}

function RemoveButtonInner() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 items-center gap-1.5 rounded-chip border border-destructive/30 px-3 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}

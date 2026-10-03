"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, AlertCircle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { createAccountAction } from "./actions";
import { cn } from "@/lib/cn";

/** Flat parent list for the "Parent account" dropdown. Groups only
 *  (postable accounts can't be parents). */
export type ParentOption = {
  name: string;
  label: string;        // "Current Assets - RI"
  rootType: string | null;
  currency: string | null;
};

const ACCOUNT_TYPES = [
  "", "Accumulated Depreciation", "Asset Received But Not Billed", "Bank",
  "Cash", "Chargeable", "Cost of Goods Sold", "Current Asset", "Current Liability",
  "Depreciation", "Direct Expense", "Direct Income", "Equity", "Expense Account",
  "Expenses Included In Asset Valuation", "Expenses Included In Valuation",
  "Fixed Asset", "Income Account", "Indirect Expense", "Indirect Income",
  "Liability", "Payable", "Receivable", "Round Off", "Service Received But Not Billed",
  "Stock", "Stock Adjustment", "Stock Received But Not Billed", "Tax",
  "Temporary", "Round Off for Opening",
];

export function AddAccountDialog({
  company,
  parents,
  presetParent,
  trigger,
}: {
  company: string;
  parents: ParentOption[];
  /** When "+ Add child" is clicked on a specific parent row, lock that
   *  parent on the form so the user doesn't have to re-pick it. */
  presetParent?: string;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);

  const [accountName, setAccountName] = useState("");
  const [parent, setParent] = useState(presetParent ?? parents[0]?.name ?? "");
  const [isGroup, setIsGroup] = useState(false);
  const [accountType, setAccountType] = useState("");
  const [currency, setCurrency] = useState("");

  useEffect(() => {
    if (open) {
      setErr(null);
      setAccountName("");
      setParent(presetParent ?? parents[0]?.name ?? "");
      setIsGroup(false);
      setAccountType("");
      setCurrency("");
      setTimeout(() => nameRef.current?.focus(), 20);
    }
  }, [open, parents, presetParent]);

  function submit() {
    setErr(null);
    start(async () => {
      const res = await createAccountAction({
        company,
        accountName,
        parentAccount: parent,
        isGroup,
        accountType: accountType || null,
        currency: currency || null,
      });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      toast.success(res.message);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>
        {trigger ?? (
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-chip bg-ink-800 px-3 text-sm font-semibold text-white hover:bg-ink-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Add account
          </button>
        )}
      </span>
      <Dialog open={open} onOpenChange={(o) => (pending ? null : setOpen(o))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a new account</DialogTitle>
            <DialogDescription>
              Live in {company}. Groups are parent folders in the tree; leaves are
              where ledger entries actually post.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <Field label="Account name" required>
              <input
                ref={nameRef}
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && accountName.trim()) {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder="e.g. CBZ USD Current Account"
                disabled={pending}
                className={cn(input, err && "border-destructive")}
              />
            </Field>

            <Field label="Parent" required>
              <select
                value={parent}
                onChange={(e) => setParent(e.currentTarget.value)}
                disabled={pending}
                className={input}
              >
                <option value="">—</option>
                {parents.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.label} {p.rootType ? `· ${p.rootType}` : ""}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Account type" hint="Leave blank for most groups.">
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.currentTarget.value)}
                  disabled={pending || isGroup}
                  className={input}
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t} value={t}>{t || "—"}</option>
                  ))}
                </select>
              </Field>
              <Field label="Currency" hint="Blank = company default.">
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.currentTarget.value.toUpperCase())}
                  placeholder="USD / ZWG"
                  disabled={pending}
                  className={input}
                  maxLength={3}
                />
              </Field>
            </div>

            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isGroup}
                onChange={(e) => {
                  setIsGroup(e.currentTarget.checked);
                  if (e.currentTarget.checked) setAccountType("");
                }}
                disabled={pending}
                className="h-4 w-4"
              />
              This is a group account (a folder, not postable)
            </label>

            {err && (
              <div className="flex items-start gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{err}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending || !accountName.trim() || !parent}
              className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white disabled:opacity-60 hover:bg-ink-700"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {pending ? "Adding…" : "Add account"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const input =
  "h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60";

function Field({
  label, required, hint, children,
}: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

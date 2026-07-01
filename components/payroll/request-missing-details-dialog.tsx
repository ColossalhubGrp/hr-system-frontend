"use client";

import { useEffect, useState, useTransition } from "react";
import { Mail, Loader2, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  getMissingDetailsRequestDraftAction,
  sendMissingDetailsRequestAction,
} from "@/app/(workspace)/payroll/actions";

/**
 * Opens a dialog that loads a pre-filled email (recipient, subject,
 * body) for the given blocked employee. The payroll admin can edit any
 * field before hitting Send.
 *
 * Replaces the prior alert() popup so the admin actually sees what's
 * going out and can tweak tone / add context before pressing send.
 */
export function RequestMissingDetailsDialog({
  employeeId,
  employeeName,
  missing,
}: {
  employeeId: string;
  employeeName: string;
  missing: string[];
}) {
  const [open, setOpen] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sending, startSending] = useTransition();

  // Load the draft when the dialog opens (so we don't spam the API on
  // every render of the wizard).
  useEffect(() => {
    if (!open) return;
    setError(null);
    setSuccess(false);
    setLoadingDraft(true);
    getMissingDetailsRequestDraftAction(employeeId, missing)
      .then((draft) => {
        setTo(draft.to);
        setSubject(draft.subject);
        setBody(draft.body);
      })
      .finally(() => setLoadingDraft(false));
  }, [open, employeeId, missing]);

  function send() {
    setError(null);
    startSending(async () => {
      const res = await sendMissingDetailsRequestAction({
        employeeId,
        to,
        subject,
        body,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setSuccess(true);
      // Auto-close after a short success flash
      setTimeout(() => setOpen(false), 900);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Mail className="h-3.5 w-3.5" />
          Request
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Request missing details</DialogTitle>
          <DialogDescription>
            Email <span className="font-medium text-foreground">{employeeName}</span>{" "}
            asking them to fill in the {missing.length}{" "}
            {missing.length === 1 ? "field" : "fields"} blocking this pay
            run. Review and edit before sending.
          </DialogDescription>
        </DialogHeader>

        {loadingDraft ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading draft…
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="req-to">To</Label>
              <Input
                id="req-to"
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="employee@example.com"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="req-subject">Subject</Label>
              <Input
                id="req-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="req-body">Message</Label>
              <Textarea
                id="req-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/[0.06] px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Sent. Closing…
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={send} disabled={sending || loadingDraft || success}>
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

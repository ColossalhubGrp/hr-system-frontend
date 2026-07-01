"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FormState } from "@/app/(workspace)/admin/references/actions";
import { createMasterAction } from "@/app/(workspace)/admin/references/actions";
import type { AvailableModule } from "@/lib/references/server";

const EMPTY: FormState = {};

/**
 * "+ New master" dialog for /admin/references. Hits the create_master
 * Server Action; on success Next.js redirects straight to the new
 * master's detail page so the admin can start adding rows.
 */
export function NewMasterDialog({
  modules,
}: {
  modules: AvailableModule[];
}) {
  const [open, setOpen] = useState(false);
  const [state, dispatch] = useFormState(createMasterAction, EMPTY);
  const fe = state.fieldErrors ?? {};

  // Group modules by app for the picker
  const byApp = modules.reduce<Record<string, AvailableModule[]>>((acc, m) => {
    const key = m.app_name || "Other";
    (acc[key] ??= []).push(m);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          New master
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a reference master</DialogTitle>
          <DialogDescription>
            Creates a new admin-managed DocType. Anyone with HR or System
            Manager perms can read it; only IT Admin or System Manager can
            add rows.
          </DialogDescription>
        </DialogHeader>

        <form action={dispatch} className="space-y-4">
          {state.error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/[0.06] px-3 py-2 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              {state.error}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="e.g. Industry, Bank, Asset Category"
              maxLength={60}
              autoComplete="off"
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground">
              Title case. Letters, numbers, and spaces only. Becomes the
              DocType name.
            </p>
            {fe.name && (
              <p className="inline-flex items-center gap-1 text-[11px] text-destructive">
                <AlertCircle className="h-3 w-3" />
                {fe.name}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="module">
              Module <span className="text-destructive">*</span>
            </Label>
            <Select name="module" defaultValue="Tenant Manager">
              <SelectTrigger id="module">
                <SelectValue placeholder="Pick a module" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(byApp).map(([app, ms]) => (
                  <SelectGroup key={app}>
                    <SelectLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {app}
                    </SelectLabel>
                    {ms.map((m) => (
                      <SelectItem key={m.name} value={m.name}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Where the master shows up in Desk's left rail. Pick the
              module the data belongs to.
            </p>
            {fe.module && (
              <p className="inline-flex items-center gap-1 text-[11px] text-destructive">
                <AlertCircle className="h-3 w-3" />
                {fe.module}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              placeholder="What is this master for?"
            />
          </div>

          {/* Every master is company-scoped by default — each row belongs
              to a specific company. No opt-out: this is a multi-tenant
              setup where every company sets their own reference data. */}
          <p className="rounded-md border bg-muted/30 p-3 text-[11px] text-muted-foreground">
            <strong className="text-foreground">Per-company scope.</strong>{" "}
            Every row belongs to a specific company. Other companies on
            this bench won't see your values.
          </p>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Save className="h-4 w-4" />
      {pending ? "Creating…" : "Create master"}
    </Button>
  );
}

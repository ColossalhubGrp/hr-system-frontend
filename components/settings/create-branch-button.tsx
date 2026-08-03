"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2, MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, TextInput } from "@/components/employee/form-bits";
import { toast } from "@/components/ui/sonner";
import {
  createBranchAction,
  type FormState,
} from "@/app/(workspace)/settings/branches/actions";

const EMPTY: FormState = {};

/**
 * Modal + server-action call to create a Branch. Toast + close on
 * success. Toast + keep the modal open with inline field errors on
 * failure.
 */
export function CreateBranchButton() {
  const [open, setOpen] = useState(false);
  const [state, dispatch] = useFormState(createBranchAction, EMPTY);
  const lastSeen = useRef(state);

  useEffect(() => {
    if (state === lastSeen.current) return;
    lastSeen.current = state;
    if (state.error) {
      toast.error(state.error, {
        description: state.fieldErrors
          ? "Check the highlighted fields."
          : undefined,
      });
    } else if (Object.keys(state).length === 0 && state !== EMPTY) {
      toast.success("Branch created.");
      setOpen(false);
    }
  }, [state]);

  return (
    <>
      <Button onClick={() => setOpen(true)} className="mt-3 w-fit sm:mt-0">
        <Plus className="h-4 w-4" />
        New branch
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              New branch
            </DialogTitle>
            <DialogDescription>
              Add a business location employees can be assigned to.
            </DialogDescription>
          </DialogHeader>
          <form action={dispatch} className="flex flex-col gap-4 pt-2">
            <Field
              label="Name"
              htmlFor="branch"
              required
              error={state.fieldErrors?.branch}
              wide
            >
              <TextInput
                id="branch"
                name="branch"
                placeholder="e.g. Harare Head Office"
                invalid={Boolean(state.fieldErrors?.branch)}
              />
            </Field>
            <Field
              label="Weekly labor budget"
              htmlFor="weekly_labor_budget"
              hint="Optional. Used by scheduling to cap weekly hours planned at this branch."
              wide
              error={state.fieldErrors?.weekly_labor_budget}
            >
              <TextInput
                id="weekly_labor_budget"
                name="weekly_labor_budget"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.5"
                placeholder="0"
                invalid={Boolean(state.fieldErrors?.weekly_labor_budget)}
              />
            </Field>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <SubmitButton />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      Create
    </Button>
  );
}

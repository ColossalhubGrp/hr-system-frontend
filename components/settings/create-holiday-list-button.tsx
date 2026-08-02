"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { CalendarPlus, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, SelectInput, TextInput } from "@/components/employee/form-bits";
import { toast } from "@/components/ui/sonner";
import {
  createHolidayListAction,
  type FormState,
} from "@/app/(workspace)/settings/holiday-lists/actions";

const EMPTY: FormState = {};
const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * Opens a modal, collects the minimum fields Frappe requires on a
 * Holiday List (name, from/to, weekly off), and calls the server
 * action. Toast + close on success. Toast + keep the modal open with
 * inline field errors on failure.
 */
export function CreateHolidayListButton() {
  const [open, setOpen] = useState(false);
  const [state, dispatch] = useFormState(createHolidayListAction, EMPTY);
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
      toast.success("Holiday list created.");
      setOpen(false);
    }
  }, [state]);

  const currentYear = new Date().getFullYear();

  return (
    <>
      <Button onClick={() => setOpen(true)} className="mt-3 w-fit sm:mt-0">
        <Plus className="h-4 w-4" />
        New holiday list
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-4 w-4" />
              New holiday list
            </DialogTitle>
            <DialogDescription>
              Set the calendar range and (optionally) a weekly off. Individual
              public-holiday dates are added after the list is created.
            </DialogDescription>
          </DialogHeader>
          <form action={dispatch} className="flex flex-col gap-4 pt-2">
            <Field
              label="Name"
              htmlFor="holiday_list_name"
              required
              error={state.fieldErrors?.holiday_list_name}
              wide
            >
              <TextInput
                id="holiday_list_name"
                name="holiday_list_name"
                placeholder={`Rivers Inc ${currentYear}`}
                invalid={Boolean(state.fieldErrors?.holiday_list_name)}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="From date"
                htmlFor="from_date"
                required
                error={state.fieldErrors?.from_date}
              >
                <TextInput
                  id="from_date"
                  name="from_date"
                  type="date"
                  defaultValue={`${currentYear}-01-01`}
                  invalid={Boolean(state.fieldErrors?.from_date)}
                />
              </Field>
              <Field
                label="To date"
                htmlFor="to_date"
                required
                error={state.fieldErrors?.to_date}
              >
                <TextInput
                  id="to_date"
                  name="to_date"
                  type="date"
                  defaultValue={`${currentYear}-12-31`}
                  invalid={Boolean(state.fieldErrors?.to_date)}
                />
              </Field>
            </div>
            <Field
              label="Weekly off"
              htmlFor="weekly_off"
              hint="Optional. Once set, the day of the week can be added as recurring off days on the list."
              wide
            >
              <SelectInput
                id="weekly_off"
                name="weekly_off"
                options={WEEKDAYS}
                placeholder="— none —"
                defaultValue="Sunday"
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

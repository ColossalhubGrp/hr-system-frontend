"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  Pencil,
  Plus,
  Save,
  Star,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, TextArea, TextInput } from "@/components/employee/form-bits";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/cn";
import {
  addActivityAction,
  removeActivityAction,
  toggleActivityCompletedAction,
  updateActivityAction,
  type AddActivityState,
  type UpdateActivityState,
} from "@/app/(workspace)/employee/lifecycle/activity-actions";

type Activity = {
  name: string;
  activityName: string;
  user: string | null;
  role: string | null;
  beginOn: number | null;
  duration: number | null;
  requiredForEmployeeCreation: boolean;
  description: string | null;
  completed: boolean;
  completedOn: string | null;
  completedBy: string | null;
};

const EMPTY: AddActivityState = {};

/**
 * Activities checklist on the Onboarding / Separation detail page.
 * Server Actions handle CRUD; the panel keeps a local optimistic
 * copy so tick / delete feel instant. The whole list also
 * revalidates the detail path so the parent record's status
 * transitions (auto-advanced by set_activity_completed on the
 * backend) surface on the next page load.
 */
export function ActivitiesPanel({
  kind,
  parentId,
  initial,
  editable,
}: {
  kind: "onboarding" | "separation";
  parentId: string;
  initial: Activity[];
  /** Read-only viewers get the list + checkboxes rendered as static,
   *  no add/remove/tick controls. */
  editable: boolean;
}) {
  const [items, setItems] = useState<Activity[]>(initial);
  const [openAdd, setOpenAdd] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);

  // Keep in sync when the parent re-renders (e.g. after a hard reload)
  useEffect(() => setItems(initial), [initial]);

  const total = items.length;
  const done = items.filter((a) => a.completed).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ClipboardList className="h-4 w-4" />
              Activities
            </p>
            <p className="text-xs text-muted-foreground">
              {total === 0
                ? "No activities yet — add the tasks that need to happen for this run."
                : `${done} of ${total} complete.`}
            </p>
          </div>
          {editable && (
            <Button size="sm" onClick={() => setOpenAdd(true)}>
              <Plus className="h-3.5 w-3.5" />
              Add activity
            </Button>
          )}
        </header>

        {total > 0 && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                pct === 100 ? "bg-emerald-500" : "bg-primary",
              )}
              style={{ width: `${pct}%` }}
              aria-label={`${pct}% complete`}
            />
          </div>
        )}

        {total > 0 && (
          <ul className="flex flex-col divide-y divide-border">
            {items.map((a) => (
              <ActivityRow
                key={a.name}
                kind={kind}
                parentId={parentId}
                activity={a}
                editable={editable}
                onCompletedChange={(updated) =>
                  setItems((prev) =>
                    prev.map((row) =>
                      row.name === updated.name ? { ...row, ...updated } : row,
                    ),
                  )
                }
                onRemoved={() =>
                  setItems((prev) => prev.filter((row) => row.name !== a.name))
                }
                onEdit={() => setEditing(a)}
              />
            ))}
          </ul>
        )}
      </CardContent>

      {editable && (
        <>
          <AddActivityDialog
            kind={kind}
            parentId={parentId}
            open={openAdd}
            onOpenChange={setOpenAdd}
            onCreated={(created) => {
              setItems((prev) => [...prev, created]);
              setOpenAdd(false);
            }}
          />
          <EditActivityDialog
            kind={kind}
            parentId={parentId}
            editing={editing}
            onOpenChange={(v) => {
              if (!v) setEditing(null);
            }}
            onSaved={(updated) => {
              setItems((prev) =>
                prev.map((row) =>
                  row.name === updated.name ? { ...row, ...updated } : row,
                ),
              );
              setEditing(null);
            }}
          />
        </>
      )}
    </Card>
  );
}

function ActivityRow({
  kind,
  parentId,
  activity,
  editable,
  onCompletedChange,
  onRemoved,
  onEdit,
}: {
  kind: "onboarding" | "separation";
  parentId: string;
  activity: Activity;
  editable: boolean;
  onCompletedChange: (
    updated: Pick<Activity, "name" | "completed" | "completedOn" | "completedBy">,
  ) => void;
  onRemoved: () => void;
  onEdit: () => void;
}) {
  const [toggling, startToggle] = useTransition();
  const [removing, startRemove] = useTransition();

  const toggle = () => {
    if (!editable) return;
    const next = !activity.completed;
    startToggle(async () => {
      const res = await toggleActivityCompletedAction(
        kind,
        parentId,
        activity.name,
        next,
      );
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      onCompletedChange({
        name: res.result.activity.name,
        completed: res.result.activity.completed,
        completedOn: res.result.activity.completedOn,
        completedBy: res.result.activity.completedBy,
      });
      if (res.result.status === "Completed" && res.result.completedCount === res.result.totalCount) {
        toast.success("All activities complete — run marked Completed.");
      }
    });
  };

  const remove = () => {
    if (!editable) return;
    if (!confirm(`Remove "${activity.activityName}"?`)) return;
    startRemove(async () => {
      const res = await removeActivityAction(kind, parentId, activity.name);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      onRemoved();
    });
  };

  return (
    <li className="flex items-start gap-3 py-3">
      <button
        type="button"
        onClick={toggle}
        disabled={!editable || toggling}
        aria-pressed={activity.completed}
        className={cn(
          "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border transition",
          activity.completed
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-input bg-background hover:border-primary",
          !editable && "cursor-default opacity-70",
          toggling && "opacity-60",
        )}
      >
        {toggling ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : activity.completed ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : null}
      </button>

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p
            className={cn(
              "text-sm font-medium",
              activity.completed
                ? "text-muted-foreground line-through"
                : "text-foreground",
            )}
          >
            {activity.activityName}
          </p>
          {activity.requiredForEmployeeCreation && (
            <span
              title="Required before the Employee record can be created"
              className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300"
            >
              <Star className="h-2.5 w-2.5" />
              required
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          {activity.user && (
            <span className="inline-flex items-center gap-1">
              <UserRound className="h-3 w-3" />
              {activity.user}
            </span>
          )}
          {activity.role && !activity.user && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              anyone with role: {activity.role}
            </span>
          )}
          {typeof activity.beginOn === "number" && activity.beginOn !== 0 && (
            <span>
              begins day {activity.beginOn >= 0 ? `+${activity.beginOn}` : activity.beginOn}
            </span>
          )}
          {typeof activity.duration === "number" && activity.duration > 0 && (
            <span>duration {activity.duration}d</span>
          )}
          {activity.completed && activity.completedBy && (
            <span>done by {activity.completedBy}</span>
          )}
        </div>

        {activity.description && (
          <p className="text-[11px] text-muted-foreground">{activity.description}</p>
        )}
      </div>

      {editable && (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={onEdit}
            className="text-muted-foreground hover:text-foreground"
            title="Edit activity"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={remove}
            disabled={removing}
            className="text-muted-foreground hover:text-destructive"
            title="Remove activity"
          >
            {removing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      )}
    </li>
  );
}

function ActivityFormBody({
  fieldErrors,
  initial,
  showRequiredToggle,
}: {
  fieldErrors: Record<string, string> | undefined;
  initial?: Activity | null;
  showRequiredToggle: boolean;
}) {
  return (
    <>
      <Field
        label="Activity name"
        htmlFor="activity_name"
        required
        error={fieldErrors?.activity_name}
        wide
      >
        <TextInput
          id="activity_name"
          name="activity_name"
          placeholder="e.g. Send welcome pack"
          invalid={Boolean(fieldErrors?.activity_name)}
          defaultValue={initial?.activityName ?? ""}
          autoFocus
        />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Assign to user"
          htmlFor="user"
          hint="Email of the specific user. Leave blank + set a role to assign to anyone with that role."
        >
          <TextInput
            id="user"
            name="user"
            type="email"
            placeholder="jane@company.com"
            defaultValue={initial?.user ?? ""}
          />
        </Field>
        <Field label="…or by role" htmlFor="role" hint="e.g. HR User, IT Admin.">
          <TextInput
            id="role"
            name="role"
            placeholder="Role name"
            defaultValue={initial?.role ?? ""}
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Begin on (days)"
          htmlFor="begin_on"
          hint="Days from the run's start date. 0 = day one, -3 = three days before."
        >
          <TextInput
            id="begin_on"
            name="begin_on"
            type="number"
            inputMode="numeric"
            defaultValue={initial?.beginOn ?? 0}
          />
        </Field>
        <Field
          label="Duration (days)"
          htmlFor="duration"
          hint="How long the assignee has."
        >
          <TextInput
            id="duration"
            name="duration"
            type="number"
            inputMode="numeric"
            min={0}
            defaultValue={initial?.duration ?? 1}
          />
        </Field>
      </div>
      {showRequiredToggle && (
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            name="required_for_employee_creation"
            className="h-4 w-4 rounded border-input"
            defaultChecked={Boolean(initial?.requiredForEmployeeCreation)}
          />
          Required before the Employee record can be finalised
        </label>
      )}
      <Field label="Notes" htmlFor="description" wide>
        <TextArea
          id="description"
          name="description"
          rows={3}
          defaultValue={initial?.description ?? ""}
        />
      </Field>
    </>
  );
}

function AddActivityDialog({
  kind,
  parentId,
  open,
  onOpenChange,
  onCreated,
}: {
  kind: "onboarding" | "separation";
  parentId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (created: Activity) => void;
}) {
  const bound = addActivityAction.bind(null, kind, parentId);
  const [state, dispatch] = useFormState(bound, EMPTY);
  const lastSeen = useRef(state);

  useEffect(() => {
    if (state === lastSeen.current) return;
    lastSeen.current = state;
    if (state.error) {
      toast.error(state.error);
    } else if (state.created) {
      toast.success(`Added "${state.created.activityName}".`);
      onCreated(state.created);
    }
  }, [state, onCreated]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Add activity
          </DialogTitle>
          <DialogDescription>
            A task the {kind === "onboarding" ? "onboarding" : "separation"} run needs
            somebody to complete.
          </DialogDescription>
        </DialogHeader>
        <form action={dispatch} className="flex flex-col gap-4 pt-2">
          <ActivityFormBody
            fieldErrors={state.fieldErrors}
            showRequiredToggle={kind === "onboarding"}
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <SubmitButton icon="add" idleLabel="Add activity" pendingLabel="Adding…" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const UPDATE_EMPTY: UpdateActivityState = {};

function EditActivityDialog({
  kind,
  parentId,
  editing,
  onOpenChange,
  onSaved,
}: {
  kind: "onboarding" | "separation";
  parentId: string;
  editing: Activity | null;
  onOpenChange: (v: boolean) => void;
  onSaved: (updated: Activity) => void;
}) {
  // Dialog is controlled by the parent: `editing` non-null = open. Re-key
  // the inner form on the row's name so switching to a different row
  // wipes the last row's default values instead of carrying them over.
  const open = editing !== null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Edit activity
          </DialogTitle>
          <DialogDescription>
            Update the fields; the tick / delete controls stay on the row itself.
          </DialogDescription>
        </DialogHeader>
        {editing && (
          <EditActivityInner
            key={editing.name}
            kind={kind}
            parentId={parentId}
            activity={editing}
            onCancel={() => onOpenChange(false)}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditActivityInner({
  kind,
  parentId,
  activity,
  onCancel,
  onSaved,
}: {
  kind: "onboarding" | "separation";
  parentId: string;
  activity: Activity;
  onCancel: () => void;
  onSaved: (updated: Activity) => void;
}) {
  const bound = updateActivityAction.bind(null, kind, parentId, activity.name);
  const [state, dispatch] = useFormState(bound, UPDATE_EMPTY);
  const lastSeen = useRef(state);

  useEffect(() => {
    if (state === lastSeen.current) return;
    lastSeen.current = state;
    if (state.error) {
      toast.error(state.error);
    } else if (state.updated) {
      toast.success(`Updated "${state.updated.activityName}".`);
      onSaved(state.updated);
    }
  }, [state, onSaved]);

  return (
    <form action={dispatch} className="flex flex-col gap-4 pt-2">
      <ActivityFormBody
        fieldErrors={state.fieldErrors}
        initial={activity}
        showRequiredToggle={kind === "onboarding"}
      />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <SubmitButton icon="save" idleLabel="Save changes" pendingLabel="Saving…" />
      </DialogFooter>
    </form>
  );
}

function SubmitButton({
  icon,
  idleLabel,
  pendingLabel,
}: {
  icon: "add" | "save";
  idleLabel: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : icon === "add" ? (
        <Plus className="h-4 w-4" />
      ) : (
        <Save className="h-4 w-4" />
      )}
      {pending ? pendingLabel : idleLabel}
    </Button>
  );
}

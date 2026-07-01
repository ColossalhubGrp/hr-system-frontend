"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";
import type { CompanySubscription, SubscribedApp } from "@/lib/subscriptions/types";
import type { FormState } from "@/app/(workspace)/platform/subscriptions/actions";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;
const EMPTY: FormState = {};

export function SubscriptionForm({
  subscription,
  action,
}: {
  subscription: CompanySubscription;
  action: Action;
}) {
  const [state, dispatch] = useFormState(action, EMPTY);
  const justSaved = state && Object.keys(state).length === 0 && state !== EMPTY;

  return (
    <form action={dispatch} className="space-y-6">
      {state.error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/[0.06] px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {state.error}
        </p>
      )}
      {justSaved && (
        <p className="flex items-center gap-2 rounded-lg border border-rise/30 bg-rise/[0.06] px-3 py-2 text-sm text-rise">
          <CheckCircle2 className="h-4 w-4" />
          Subscription saved.
        </p>
      )}

      {/* Plan + status */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="plan_name">Plan name</Label>
          <Input
            id="plan_name"
            name="plan_name"
            defaultValue={subscription.plan_name ?? ""}
            placeholder="Starter / Pro / Enterprise"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="valid_until">Valid until</Label>
          <Input
            id="valid_until"
            name="valid_until"
            type="date"
            defaultValue={subscription.valid_until ?? ""}
          />
        </div>
        <div className="flex items-end">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_active"
              value="true"
              defaultChecked={Boolean(subscription.is_active)}
              className="h-4 w-4 rounded border-input text-primary focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span>Subscription active</span>
          </label>
        </div>
      </section>

      {/* App matrix */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Apps in this subscription
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {subscription.apps.map((app) => (
            <AppRow key={app.code} app={app} />
          ))}
        </div>
      </section>

      <div className="sticky bottom-0 -mx-1 flex items-center justify-end gap-2 rounded-lg border bg-card/95 p-3 shadow backdrop-blur">
        <Submit />
      </div>
    </form>
  );
}

function AppRow({ app }: { app: SubscribedApp }) {
  const disabled = app.always_on;
  return (
    <label
      htmlFor={`app:${app.code}`}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-3 transition",
        disabled && "cursor-not-allowed opacity-70",
        !disabled && "hover:border-primary/40",
      )}
    >
      <input
        id={`app:${app.code}`}
        type="checkbox"
        name={`app:${app.code}`}
        value="1"
        defaultChecked={app.enabled || disabled}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 rounded border-input text-primary focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="font-medium text-foreground">{app.name}</p>
          <code className="text-[10px] text-muted-foreground">{app.code}</code>
          {disabled && (
            <span className="text-[10px] uppercase text-muted-foreground">
              always-on
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {app.description}
        </p>
        {app.requires.length > 0 && (
          <p className="mt-1 text-[11px] text-amber-600">
            Requires: {app.requires.join(", ")}
          </p>
        )}
      </div>
    </label>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Save className="h-4 w-4" />
      {pending ? "Saving…" : "Save subscription"}
    </Button>
  );
}

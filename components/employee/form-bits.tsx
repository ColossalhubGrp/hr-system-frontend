import { cn } from "@/lib/cn";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Form-bits — shared form primitives used across 30+ pages.
 *
 * After the shadcn migration, these wrap shadcn's <Card>, <Label>,
 * <Input>, <Textarea> while preserving the **exact same API** for
 * callers — they don't have to change a thing.
 *
 * The SelectInput keeps a native <select> on purpose: most call sites
 * post it inside a <form action={serverAction}> and Radix's <Select>
 * doesn't participate in native form submission. We style the native
 * element to match shadcn's input chrome so visually it blends in.
 */

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

export function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  wide,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", wide && "sm:col-span-2")}>
      <Label
        htmlFor={htmlFor}
        className="flex items-center gap-1 text-sm font-medium text-foreground"
      >
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean },
) {
  const { invalid, className, ...rest } = props;
  return (
    <Input
      {...rest}
      className={cn(
        // Promote shadcn input height from 9 → 10 to match the rest of
        // the workspace's denser form rhythm.
        "h-10",
        invalid && "border-destructive focus-visible:ring-destructive",
        className,
      )}
    />
  );
}

export function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    invalid?: boolean;
  },
) {
  const { invalid, className, ...rest } = props;
  return (
    <Textarea
      {...rest}
      rows={rest.rows ?? 3}
      className={cn(
        invalid && "border-destructive focus-visible:ring-destructive",
        className,
      )}
    />
  );
}

// Native <select> sized + styled to match shadcn's Input chrome. Kept native
// so callers can post it as a regular form field.
const nativeSelectClass =
  "flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 appearance-none pr-8 bg-[length:1rem] bg-no-repeat bg-[position:right_0.75rem_center] bg-[url('data:image/svg+xml;utf8,<svg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2020%2020%22%20fill=%22currentColor%22><path%20fill-rule=%22evenodd%22%20d=%22M5.293%207.293a1%201%200%20011.414%200L10%2010.586l3.293-3.293a1%201%200%20111.414%201.414l-4%204a1%201%200%2001-1.414%200l-4-4a1%201%200%20010-1.414z%22%20clip-rule=%22evenodd%22%20/></svg>')]";

export function SelectInput({
  options,
  placeholder,
  invalid,
  className,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: string[];
  placeholder?: string;
  invalid?: boolean;
}) {
  return (
    <select
      {...rest}
      className={cn(nativeSelectClass, invalid && "border-destructive focus-visible:ring-destructive", className)}
    >
      <option value="">{placeholder ?? "—"}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

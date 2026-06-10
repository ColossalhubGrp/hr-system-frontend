import { cn } from "@/lib/cn";

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
    <section className="card p-6">
      <header className="mb-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ash-500">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-xs text-ash-500">{description}</p>
        )}
      </header>
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
        {children}
      </div>
    </section>
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
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-1 text-sm font-medium text-ash-700"
      >
        {label}
        {required && <span className="text-fall">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-fall">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ash-500">{hint}</p>
      ) : null}
    </div>
  );
}

const baseInput =
  "h-10 w-full rounded-xl border border-hairline bg-surface px-3 text-sm text-ash-900 placeholder:text-ash-500 focus-ring disabled:bg-canvas disabled:text-ash-500";

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean },
) {
  const { invalid, className, ...rest } = props;
  return (
    <input
      {...rest}
      className={cn(baseInput, invalid && "border-fall", className)}
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
    <textarea
      {...rest}
      rows={rest.rows ?? 3}
      className={cn(
        "w-full rounded-xl border border-hairline bg-surface p-3 text-sm text-ash-900 placeholder:text-ash-500 focus-ring",
        invalid && "border-fall",
        className,
      )}
    />
  );
}

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
      className={cn(baseInput, "pr-8", invalid && "border-fall", className)}
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

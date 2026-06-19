"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

interface Props extends React.ComponentPropsWithoutRef<"input"> {
  /** Show the lock icon on the left of the input. Default true. */
  showLock?: boolean;
  /** Override the wrapper className (e.g. width). */
  wrapperClassName?: string;
  /** Optional className applied to the actual <input>. */
  inputClassName?: string;
}

/**
 * Password input with eye/eye-off visibility toggle on the right and a
 * lock icon on the left. Mirrors recruitment's pattern but uses shadcn's
 * Input chrome so it inherits the workspace brand.
 */
export const PasswordInput = forwardRef<HTMLInputElement, Props>(
  function PasswordInput(
    { showLock = true, wrapperClassName, inputClassName, className, ...rest },
    ref,
  ) {
    const [visible, setVisible] = useState(false);
    return (
      <div className={cn("relative", wrapperClassName)}>
        {showLock && (
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <Input
          ref={ref}
          type={visible ? "text" : "password"}
          {...rest}
          className={cn(
            showLock && "pl-9",
            "pr-10",
            className,
            inputClassName,
          )}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={-1}
          className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    );
  },
);

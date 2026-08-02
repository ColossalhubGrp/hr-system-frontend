"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { resolveAvatarUrl } from "@/lib/frappe/session";

const SIZES = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-lg",
} as const;

/**
 * A stored file_url can 404 (file was deleted from Frappe's public folder,
 * nginx isn't mapping /files/ to the right site, tenant migration, etc.).
 * When the image load fails, drop the URL and render the initials so users
 * never see an empty circle.
 */
export function EmployeeAvatar({
  name,
  imageUrl,
  size = "md",
}: {
  name: string;
  imageUrl?: string | null;
  size?: keyof typeof SIZES;
}) {
  const [broken, setBroken] = useState(false);
  const src = broken ? null : resolveAvatarUrl(imageUrl ?? null);
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full bg-ink-100 font-semibold text-ink-700",
        SIZES[size],
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

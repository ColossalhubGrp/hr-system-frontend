"use client";

import { useRef, useState, useTransition } from "react";
import { AlertCircle, Image as ImageIcon, Upload, X } from "lucide-react";
import { publicEnv } from "@/lib/env";
import { cn } from "@/lib/cn";
import { uploadEmployeeImage } from "@/app/(workspace)/employee/upload-actions";

/**
 * Profile image picker. The only way in is a real file upload — the file
 * goes through a Server Action that proxies to Frappe's
 * /api/method/upload_file, and the returned `file_url` becomes the value of
 * the hidden `<input name="image">` the surrounding form submits.
 */
export function ProfileImagePicker({
  name = "image",
  defaultValue = "",
  fallbackName = "",
  invalid = false,
}: {
  name?: string;
  defaultValue?: string;
  /** Used to draw initials if there's no image. */
  fallbackName?: string;
  /** Outer field flagged the picker as invalid (e.g. required-but-empty). */
  invalid?: boolean;
}) {
  const [url, setUrl] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const preview = resolveUrl(url);

  function pickFile() {
    setError(null);
    fileRef.current?.click();
  }

  function handleFile(file: File) {
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    start(async () => {
      const result = await uploadEmployeeImage(fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.url) setUrl(result.url);
    });
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset so picking the same file twice still fires onChange.
    e.target.value = "";
    if (file) handleFile(file);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          "flex flex-col items-start gap-4 rounded-card border border-dashed border-hairline bg-canvas/30 p-4 transition sm:flex-row sm:items-center",
          dragOver && "border-ink-300 bg-ink-50/40",
          invalid && "border-fall bg-fall/[0.04]",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <Avatar src={preview} fallbackName={fallbackName} pending={pending} />

        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={pickFile}
              disabled={pending}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-chip bg-ink-800 px-3.5 text-xs font-semibold text-white transition focus-ring",
                "hover:bg-ink-700 disabled:opacity-60 disabled:cursor-not-allowed",
              )}
            >
              <Upload className="h-3.5 w-3.5" />
              {pending
                ? "Uploading…"
                : url
                ? "Replace image"
                : "Upload from device"}
            </button>
            {url && !pending && (
              <button
                type="button"
                onClick={() => {
                  setUrl("");
                  setError(null);
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-chip border border-hairline bg-surface px-3 text-xs font-medium text-ash-700 transition hover:bg-canvas focus-ring"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
          </div>
          <p className="text-[11px] text-ash-500">
            JPEG, PNG, WebP or GIF up to 5MB. Or drag a file onto this panel.
          </p>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        onChange={onFileChange}
        tabIndex={-1}
        aria-hidden
      />

      {/* The actual value the surrounding form submits. Only the uploader
          ever writes here; the user can't type a URL. */}
      <input type="hidden" id={name} name={name} value={url} readOnly />

      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-fall/30 bg-fall/[0.06] px-3 py-2 text-xs text-fall"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}

function Avatar({
  src,
  fallbackName,
  pending,
}: {
  src: string | null;
  fallbackName: string;
  pending: boolean;
}) {
  return (
    <div className="relative shrink-0">
      <div className="h-20 w-20 overflow-hidden rounded-2xl border border-hairline bg-ink-100">
        {src ? (
          // Avatar paths come from Frappe; we trust them as we already do on
          // the read-only detail page.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            className="h-full w-full object-cover"
            onError={(e) => {
              // Hide broken images so the initials fallback shows through.
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-ink-700">
            {fallbackName ? (
              <span className="text-lg font-semibold">
                {initials(fallbackName)}
              </span>
            ) : (
              <ImageIcon className="h-6 w-6 text-ash-500" />
            )}
          </div>
        )}
      </div>
      {pending && (
        <div className="absolute inset-0 grid place-items-center rounded-2xl bg-ink-900/30 text-[10px] font-semibold uppercase tracking-wide text-white">
          Uploading
        </div>
      )}
    </div>
  );
}

function resolveUrl(raw: string): string | null {
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) {
    try {
      return new URL(raw, publicEnv.NEXT_PUBLIC_FRAPPE_URL).toString();
    } catch {
      return null;
    }
  }
  // Treat anything else as junk — show the initials fallback.
  return null;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

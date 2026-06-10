"use server";

import { serverEnv } from "@/lib/env";
import { frappeCookieHeader } from "@/lib/frappe/session";

export type UploadResult = { url?: string; error?: string };

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_PREFIXES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Uploads a profile image to Frappe via /api/method/upload_file and returns
 * the resulting `file_url`. Called imperatively from the client (no `<form>`
 * wrapping, so the parent employee form keeps its own submission semantics).
 *
 * The upload runs as the signed-in user so Frappe's File-doctype permissions
 * apply normally.
 */
export async function uploadEmployeeImage(
  form: FormData,
): Promise<UploadResult> {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "Image must be 5MB or smaller." };
  }
  if (!ALLOWED_PREFIXES.includes(file.type)) {
    return { error: "Use a JPEG, PNG, WebP or GIF image." };
  }

  const cookie = frappeCookieHeader();
  if (!cookie) {
    return { error: "Your session expired — sign in again." };
  }

  const env = serverEnv();
  const upload = new FormData();
  upload.append("file", file, file.name);
  upload.append("is_private", "0");
  upload.append("folder", "Home/Attachments");

  let res: Response;
  try {
    res = await fetch(new URL("/api/method/upload_file", env.FRAPPE_URL), {
      method: "POST",
      headers: {
        Cookie: cookie,
        "X-Frappe-Site-Name": new URL(env.FRAPPE_URL).hostname,
      },
      body: upload,
      cache: "no-store",
    });
  } catch {
    return { error: "Couldn't reach the file service. Try again." };
  }

  if (!res.ok) {
    // Frappe surfaces validation messages via _server_messages, the same
    // double-encoded format as elsewhere.
    let msg = `Upload failed (${res.status}).`;
    try {
      const detail = (await res.json()) as {
        _server_messages?: string;
        message?: string;
      };
      if (detail._server_messages) {
        const arr = JSON.parse(detail._server_messages) as string[];
        const first = arr[0]
          ? (JSON.parse(arr[0]) as { message?: string })
          : undefined;
        if (first?.message) msg = stripHtml(first.message);
      } else if (typeof detail.message === "string") {
        msg = detail.message;
      }
    } catch {
      /* keep the generic message */
    }
    return { error: msg };
  }

  const json = (await res.json()) as { message?: { file_url?: string } };
  const url = json.message?.file_url;
  if (!url) return { error: "Upload returned no URL." };
  return { url };
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim();
}

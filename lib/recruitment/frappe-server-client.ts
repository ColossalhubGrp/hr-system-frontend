/**
 * Server-side Frappe API client
 * Uses Bearer token authentication for server-to-server communication
 * This client is only used in Next.js API routes (server-side)
 */

import type { ApiResponse } from '@/lib/recruitment/types';

// Honour either env var. smart_hr_web uses FRAPPE_URL; standalone
// recruitment used FRAPPE_API_URL. Falls back to localhost so a missing
// env var doesn't silently route at production.
const FRAPPE_API_URL =
  process.env.FRAPPE_URL ||
  process.env.FRAPPE_API_URL ||
  'http://localhost:8000';
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
  console.warn('Warning: FRAPPE_API_KEY and FRAPPE_API_SECRET must be set in environment variables');
}

interface FrappeRequestOptions {
  method?: string;
  params?: Record<string, any>;
  user?: string; // User identity to forward to Frappe (passed alongside sid)
  apiKey?: string; // Optional per-request API key
  apiSecret?: string; // Optional per-request API secret
  /**
   * Frappe session id. When provided, the request is authenticated by
   * forwarding the user's sid cookie so Frappe applies the user's row
   * perms. When omitted, falls back to service Basic auth (used only for
   * server-to-server probes like the role resolver).
   */
  sid?: string;
}

/**
 * Makes an authenticated request to Frappe API.
 *
 * Auth strategy:
 *   • If `sid` is provided → forward as `Cookie: sid=…`. Frappe runs the
 *     method as the sid's user with their DocPerms + permission_query
 *     filters applied. This is the safe default for user-initiated calls.
 *   • Otherwise → fall back to Basic auth with the service API key. Used
 *     for server-side helpers that need privileged reads (e.g. resolving
 *     a sid to a user when the sid is what we have to validate).
 */
export async function frappeRequest<T>(
  endpoint: string,
  options: FrappeRequestOptions = {}
): Promise<T> {
  const { method = 'POST', params = {}, user, apiKey, apiSecret, sid } = options;

  let url = `${FRAPPE_API_URL}/api/method/${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (sid) {
    // User-scoped: forward the sid so Frappe applies row perms.
    headers.Cookie = `sid=${sid}`;
  } else {
    // Service-scoped: Basic auth.
    const key = apiKey || FRAPPE_API_KEY;
    const secret = apiSecret || FRAPPE_API_SECRET;
    if (!key || !secret) {
      throw new Error('Frappe API credentials not configured');
    }
    const authString = Buffer.from(`${key}:${secret}`).toString('base64');
    headers.Authorization = `Basic ${authString}`;
  }

  let fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (method === 'GET') {
    // For GET, append all params as query string
    const query = new URLSearchParams();
    for (const k in params) {
      if (params[k] !== undefined && params[k] !== null) {
        query.append(k, String(params[k]));
      }
    }
    if (user) {
      query.append('user', user);
    }
    if ([...query.keys()].length > 0) {
      url += `?${query.toString()}`;
    }
    // No body for GET
  } else {
    // Forward user identity if provided
    const requestBody = user ? { ...params, user } : params;
    fetchOptions.body = JSON.stringify(requestBody);
  }

  try {
    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Frappe API error: ${response.status} - ${errorText}`);
    }

    const data: ApiResponse<T> = await response.json();

    if (data.exc) {
      throw new Error(data.exc);
    }

    return data.message as T;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred while calling Frappe API');
  }
}

/**
 * Handles file upload to Frappe
 */
export async function frappeUploadFile(
  file: File | Buffer,
  filename: string,
  options: {
    attached_to_doctype?: string;
    attached_to_name?: string;
    attached_to_field?: string;
    is_private?: string;
    user?: string;
    apiKey?: string; // Optional per-request API key
    apiSecret?: string; // Optional per-request API secret
    /** Frappe sid — when present, uploads as the user (preferred). */
    sid?: string;
  } = {}
): Promise<{ file_url: string }> {
  const { apiKey, apiSecret, sid, ...fileOptions } = options;

  const url = `${FRAPPE_API_URL}/api/method/upload_file`;

  // Auth selection mirrors frappeRequest — sid preferred, Basic auth fallback.
  let authHeader: string | null = null;
  let cookieHeader: string | null = null;
  if (sid) {
    cookieHeader = `sid=${sid}`;
  } else {
    const key = apiKey || FRAPPE_API_KEY;
    const secret = apiSecret || FRAPPE_API_SECRET;
    if (!key || !secret) {
      throw new Error('Frappe API credentials not configured');
    }
    authHeader = `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`;
  }

  const formData = new FormData();

  // Convert Buffer to Blob if needed
  let fileBlob: File | Blob;
  if (file instanceof File) {
    fileBlob = file;
  } else {
    // Convert Buffer to Uint8Array for Blob constructor
    const uint8Array = new Uint8Array(file);
    fileBlob = new Blob([uint8Array], { type: 'application/octet-stream' });
  }
  formData.append('file', fileBlob, filename);

  if (fileOptions.attached_to_doctype) {
    formData.append('attached_to_doctype', fileOptions.attached_to_doctype);
  }
  if (fileOptions.attached_to_name) {
    formData.append('attached_to_name', fileOptions.attached_to_name);
  }
  if (fileOptions.attached_to_field) {
    formData.append('attached_to_field', fileOptions.attached_to_field);
  }
  if (fileOptions.is_private !== undefined) {
    formData.append('is_private', fileOptions.is_private);
  }

  // Forward user identity if provided
  if (fileOptions.user) {
    formData.append('user', fileOptions.user);
  }

  try {
    const uploadHeaders: Record<string, string> = {};
    if (authHeader) uploadHeaders.Authorization = authHeader;
    if (cookieHeader) uploadHeaders.Cookie = cookieHeader;
    const response = await fetch(url, {
      method: 'POST',
      headers: uploadHeaders,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Frappe upload error: ${response.status} - ${errorText}`);
    }

    const data: ApiResponse<{ file_url: string }> = await response.json();

    if (data.exc) {
      throw new Error(data.exc);
    }

    return data.message as { file_url: string };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred while uploading file to Frappe');
  }
}


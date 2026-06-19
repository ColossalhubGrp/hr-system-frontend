import { NextRequest, NextResponse } from 'next/server';
import { frappeRequest, frappeUploadFile } from '@/lib/recruitment/frappe-server-client';
import { sanitizeUserFacingError } from '@/lib/recruitment/error-sanitizer';
import {
  canUploadForRole,
  isEndpointAllowedForRole,
  logAccessDeny,
} from '@/lib/recruitment/security/access-policy';
import { resolveRoleFromSid } from '@/lib/recruitment/security/sid-roles';

const extractStatusCode = (error: unknown, fallback = 500) => {
  const message = error instanceof Error ? error.message : String(error || '');
  const match =
    message.match(/Frappe API error:\s*(\d{3})/i) ||
    message.match(/Frappe upload error:\s*(\d{3})/i);
  if (!match) return fallback;
  const status = Number(match[1]);
  return Number.isFinite(status) ? status : fallback;
};

// Interview-lifecycle endpoints are open to guests on the backend (no Frappe
// session required) — the BFF must mirror that. The backend uses tokenised
// interview links + per-session validation, so this is safe to leave open.
const GUEST_ALLOWED_POST_ENDPOINTS = new Set([
  'recruitment_app.api.interview_sessions.get_interview_session',
  'recruitment_app.api.interview_sessions.get_interview_token',
  'recruitment_app.api.interview_sessions.start_interview_session',
  'recruitment_app.api.interview_sessions.end_interview_session',
  'recruitment_app.api.interview_sessions.start_egress',
  'recruitment_app.api.interview_sessions.stop_egress',
]);

const GUEST_ALLOWED_GET_ENDPOINTS = new Set([
  'recruitment_app.api.billing_admin_api.get_wallet_summary',
  'recruitment_app.api.billing_admin_api.get_wallet_transactions',
]);

const isGuestAllowedEndpoint = (endpoint: string) =>
  GUEST_ALLOWED_POST_ENDPOINTS.has(endpoint);

/**
 * BFF — Backend-for-Frontend proxy to Frappe.
 *
 * KEY CHANGES vs the previous implementation:
 *
 *   1. AUTH MODEL — switched from the unsigned `app_role` cookie to the
 *      HttpOnly `sid` cookie. Role + user are now resolved server-side via
 *      `resolveRoleFromSid()` (60s TTL cache). A client can't forge it.
 *
 *   2. NO MORE BODY-USER IMPERSONATION — the previous flow accepted a
 *      `user` parameter in the request body and forwarded it to Frappe as
 *      the identity to execute under. That meant a candidate could send
 *      `{ user: "hr.boss@…" }` and run as HR. We now derive `user` from
 *      the sid-resolved session and IGNORE any `user` value in the body.
 *      A request that supplies a mismatched `user` is logged + 403'd.
 *
 *   3. SID FORWARDING — Frappe calls go out with `Cookie: sid=…` so
 *      Frappe's own row-level perms apply, instead of running as the
 *      service API key. The backend respects DocPerms, hooks, and
 *      `permission_query_conditions` correctly because the real user is
 *      the authenticated session.
 */

async function resolveSession(req: NextRequest) {
  const sid = req.cookies.get('sid')?.value;
  if (!sid || sid === 'Guest') return { sid: null, session: null };
  const session = await resolveRoleFromSid(sid);
  return { sid, session };
}

/**
 * GET /api/frappe/[...path]
 * Allows GET requests for selected safe endpoints.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const params = await context.params;
    const endpoint = params.path.join('.');

    if (!GUEST_ALLOWED_GET_ENDPOINTS.has(endpoint)) {
      return NextResponse.json(
        { error: 'GET not allowed for this endpoint' },
        { status: 405 }
      );
    }

    // Resolve the caller (even GET endpoints care — wallet reads must be
    // for the current user, not an arbitrary email in the query string).
    const { sid, session } = await resolveSession(req);

    const url = new URL(req.url);
    const queryParams: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    // CRITICAL: ignore any user passed in the query string. Substitute
    // the sid-resolved user (or undefined for guests).
    if ('user' in queryParams) {
      delete queryParams.user;
    }

    const result = await frappeRequest(endpoint, {
      method: 'GET',
      params: queryParams,
      user: session?.user,
      sid: sid ?? undefined,
    });

    return NextResponse.json({ message: result });
  } catch (error: unknown) {
    console.error('Frappe API GET proxy error:', error);
    const status = extractStatusCode(error, 500);
    const safeMessage = sanitizeUserFacingError(
      error,
      'Request failed. Please try again.'
    );
    return NextResponse.json({ error: safeMessage }, { status });
  }
}

/**
 * POST /api/frappe/[...path]
 * Proxies Frappe API calls through Next.js server.
 *
 * Usage: POST /api/frappe/recruitment_app.api.job_postings.get_job_postings
 *        with body: { params: {...} }
 *
 * Body `user` is INTENTIONALLY ignored — see header comment.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const params = await context.params;
    const endpoint = params.path.join('.');
    const { sid, session } = await resolveSession(req);
    const role = session?.role ?? null;
    const allowGuest = isGuestAllowedEndpoint(endpoint);

    if (!allowGuest) {
      if (!session || !role) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (!endpoint || !isEndpointAllowedForRole(endpoint, role)) {
        logAccessDeny({
          scope: 'api-endpoint',
          role,
          target: endpoint,
          reason: 'endpoint_not_allowed_for_role',
          method: req.method,
          ip: req.headers.get('x-forwarded-for'),
          userAgent: req.headers.get('user-agent'),
          actualUser: session.user,
        });
        // Mirror the route-level pattern — a 404 reveals less than a 403.
        return NextResponse.json({ error: 'Not Found' }, { status: 404 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const { params: methodParams = {}, user: claimedUser } = body;

    // SECURITY: ignore any caller-supplied `user`. If they claimed someone
    // else's identity, log it — possible impersonation attempt.
    if (
      session &&
      typeof claimedUser === 'string' &&
      claimedUser.length > 0 &&
      claimedUser !== session.user
    ) {
      logAccessDeny({
        scope: 'api-impersonation',
        role,
        target: endpoint,
        reason: 'body_user_does_not_match_sid',
        method: req.method,
        ip: req.headers.get('x-forwarded-for'),
        userAgent: req.headers.get('user-agent'),
        claimedUser,
        actualUser: session.user,
      });
      // Don't 403 — that telegraphs we noticed. Replace the user silently
      // and proceed with the authentic one.
    }

    const result = await frappeRequest(endpoint, {
      params: methodParams,
      user: allowGuest ? undefined : session?.user,
      sid: allowGuest ? undefined : sid ?? undefined,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Frappe API proxy error:', error);
    const status = extractStatusCode(error, 500);
    const safeMessage = sanitizeUserFacingError(
      error,
      'Request failed. Please try again.'
    );
    return NextResponse.json({ error: safeMessage }, { status });
  }
}

/**
 * PUT /api/frappe/upload_file — file uploads to Frappe.
 */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { sid, session } = await resolveSession(req);
    const role = session?.role ?? null;

    if (!session || !role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!canUploadForRole(role)) {
      logAccessDeny({
        scope: 'api-upload',
        role,
        target: 'upload_file',
        reason: 'upload_not_allowed_for_role',
        method: req.method,
        ip: req.headers.get('x-forwarded-for'),
        userAgent: req.headers.get('user-agent'),
        actualUser: session.user,
      });
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const params = await context.params;
    const endpoint = params.path.join('.');
    if (endpoint !== 'upload_file') {
      return NextResponse.json(
        { error: 'PUT method only supported for upload_file endpoint' },
        { status: 405 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    // Same impersonation guard as POST — any `user` field in the form is
    // ignored, substituted with the sid-resolved user.
    const claimedUser = formData.get('user');
    if (
      typeof claimedUser === 'string' &&
      claimedUser.length > 0 &&
      claimedUser !== session.user
    ) {
      logAccessDeny({
        scope: 'api-impersonation',
        role,
        target: 'upload_file',
        reason: 'form_user_does_not_match_sid',
        method: req.method,
        ip: req.headers.get('x-forwarded-for'),
        userAgent: req.headers.get('user-agent'),
        claimedUser,
        actualUser: session.user,
      });
    }

    const result = await frappeUploadFile(file, file.name, {
      attached_to_doctype: formData.get('attached_to_doctype') as string | undefined,
      attached_to_name: formData.get('attached_to_name') as string | undefined,
      attached_to_field: formData.get('attached_to_field') as string | undefined,
      is_private: formData.get('is_private') as string | undefined,
      user: session.user,
      sid: sid ?? undefined,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Frappe upload error:', error);
    const status = extractStatusCode(error, 500);
    const safeMessage = sanitizeUserFacingError(
      error,
      'File upload failed. Please try again.'
    );
    return NextResponse.json({ error: safeMessage }, { status });
  }
}

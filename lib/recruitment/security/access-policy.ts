import type { AppRole } from '@/lib/recruitment/role-routing'

const toRoleToken = (value: string) => value.trim().toLowerCase()

const commonAllowedEndpointPrefixes = [
    'recruitment_app.api.auth.get_current_user',
    // Used by the BFF + middleware to resolve who's calling.
    'recruitment_app.api.me.my_roles',
]

/**
 * Per-role endpoint allow-list.
 *
 * SECURITY NOTE: `frappe.client.set_value` was REMOVED from the `hr` bucket.
 * It's a generic doctype writer — combined with any frontend-side
 * vulnerability it would let an attacker mutate arbitrary fields on arbitrary
 * documents (Salary Slip net pay, Employee.user_id, etc.). Specific writes
 * that HR needs go through dedicated whitelisted methods in
 * `recruitment_app.api.*` instead.
 */
const roleAllowedEndpointPrefixes: Record<AppRole, string[]> = {
    hr: [
        'recruitment_app.api.job_postings.',
        'recruitment_app.api.candidate_applications.',
        'recruitment_app.api.shortlisting.',
        'recruitment_app.api.candidate_details.',
        'recruitment_app.api.interview_sessions.',
        'recruitment_app.api.user_feedback.',
        'recruitment_app.api.candidate_message_api.',
        'recruitment_app.api.candidate_interview_api.',
        'recruitment_app.api.billing_admin_api.',
        // frappe.client.set_value REMOVED — see comment above.
    ],
    candidate: [
        'recruitment_app.api.candidate_api.',
        'recruitment_app.api.candidate_profile_api.',
        'recruitment_app.api.candidate_details.get_candidate_profile',
        'recruitment_app.api.candidate_extras_api.',
        'recruitment_app.api.candidate_job_search_ai.',
        'recruitment_app.api.candidate_ai_matching.',
        'recruitment_app.api.candidate_message_api.',
        'recruitment_app.api.candidate_interview_api.',
    ],
    employer: [
        'recruitment_app.api.employer_profile_api.',
        'recruitment_app.api.employer_branding_analytics_api.',
        'recruitment_app.api.employer_team_api.',
        'recruitment_app.api.billing_admin_api.',
    ],
}

/**
 * @deprecated `app_role` cookie trust is gone. Callers must use
 * `resolveRoleFromSid` (lib/security/sid-roles.ts) which validates the sid
 * against Frappe. This stub now ALWAYS returns null so any stray caller
 * that hasn't been migrated will fail closed.
 */
export const parseRoleFromCookie = (_value?: string | null): AppRole | null => {
    return null
}

export const isEndpointAllowedForRole = (endpoint: string, role: AppRole): boolean => {
    const allowedPrefixes = roleAllowedEndpointPrefixes[role] || []
    return [...commonAllowedEndpointPrefixes, ...allowedPrefixes].some(
        (prefix) => endpoint === prefix || endpoint.startsWith(prefix)
    )
}

export const canUploadForRole = (role: AppRole): boolean => {
    return role === 'hr' || role === 'candidate'
}

type AccessDenyEvent = {
    scope: 'route' | 'api-endpoint' | 'api-upload' | 'api-impersonation'
    role: AppRole | null
    target: string
    reason: string
    method?: string
    ip?: string | null
    userAgent?: string | null
    // Optional: who they CLAIMED to be vs who the sid actually is.
    claimedUser?: string | null
    actualUser?: string | null
}

export const logAccessDeny = (event: AccessDenyEvent) => {
    console.warn(
        '[ACCESS_DENY]',
        JSON.stringify({
            at: new Date().toISOString(),
            ...event,
        })
    )
}

export { toRoleToken }

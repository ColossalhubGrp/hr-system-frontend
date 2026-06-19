import { NextRequest, NextResponse } from 'next/server'
import { frappeRequest } from '@/lib/recruitment/frappe-server-client'
import { sanitizeUserFacingError } from '@/lib/recruitment/error-sanitizer'

const extractStatusCode = (error: unknown, fallback = 500) => {
    const message = error instanceof Error ? error.message : String(error || '')
    const match = message.match(/Frappe API error:\s*(\d{3})/i)
    if (!match) return fallback
    const status = Number(match[1])
    return Number.isFinite(status) ? status : fallback
}

type ApplyRequestBody = {
    candidate_email?: string
    candidate_name?: string
    phone?: string
    cv_url?: string | null
    details_json?: string | Record<string, unknown> | null
}

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const body = await req.json() as ApplyRequestBody
        const params = await context.params
        const jobPosting = decodeURIComponent(params.id)

        const result = await frappeRequest<{
            success: boolean
            application_id?: string
            duplicate?: boolean
            message?: string
            error?: string
        }>('recruitment_app.api.candidate_api.candidate_apply', {
            params: {
                job_posting: jobPosting,
                candidate_email: body.candidate_email,
                candidate_name: body.candidate_name,
                phone: body.phone,
                cv_url: body.cv_url || null,
                details_json: body.details_json || null,
            },
        })

        return NextResponse.json(result)
    } catch (error) {
        const status = extractStatusCode(error, 500)
        const safeMessage = sanitizeUserFacingError(error, 'Failed to submit application. Please try again.')
        return NextResponse.json({ error: safeMessage }, { status })
    }
}

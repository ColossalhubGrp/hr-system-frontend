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

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const result = await frappeRequest('recruitment_app.api.public_jobs_api.public_get_job', {
      params: {
        job_posting: decodeURIComponent(params.id),
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    const status = extractStatusCode(error, 500)
    const safeMessage = sanitizeUserFacingError(error, 'Request failed. Please try again.')
    return NextResponse.json({ error: safeMessage }, { status })
  }
}

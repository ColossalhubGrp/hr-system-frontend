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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('query')
    const location = searchParams.get('location')
    const limit_start = searchParams.get('limit_start') || '0'
    const limit_page_length = searchParams.get('limit_page_length') || '20'
    const status = searchParams.get('status') || 'Open'

    const hasSearch = Boolean(query?.trim() || location?.trim())

    const result = hasSearch
      ? await frappeRequest<{
          jobs: unknown[]
          total: number
          limit_start: number
          limit_page_length: number
        }>('recruitment_app.api.public_jobs_api.public_job_search', {
          params: {
            query: query || null,
            location: location || null,
            limit_start,
            limit_page_length,
            status,
          },
        })
      : await frappeRequest<{
          jobs: unknown[]
          total: number
          limit_start: number
          limit_page_length: number
        }>('recruitment_app.api.public_jobs_api.public_get_all_jobs', {
          params: {
            limit_start,
            limit_page_length,
            status,
          },
        })

    return NextResponse.json(result)
  } catch (error) {
    const status = extractStatusCode(error, 500)
    const safeMessage = sanitizeUserFacingError(error, 'Request failed. Please try again.')
    return NextResponse.json({ error: safeMessage }, { status })
  }
}

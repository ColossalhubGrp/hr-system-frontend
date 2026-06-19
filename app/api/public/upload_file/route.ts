import { NextRequest, NextResponse } from 'next/server'
import { frappeUploadFile } from '@/lib/recruitment/frappe-server-client'
import { sanitizeUserFacingError } from '@/lib/recruitment/error-sanitizer'

const extractStatusCode = (error: unknown, fallback = 500) => {
    const message = error instanceof Error ? error.message : String(error || '')
    const match = message.match(/Frappe API error:\s*(\d{3})/i) || message.match(/Frappe upload error:\s*(\d{3})/i)
    if (!match) return fallback
    const status = Number(match[1])
    return Number.isFinite(status) ? status : fallback
}

export async function PUT(req: NextRequest) {
    try {
        const formData = await req.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json({ error: 'File is required' }, { status: 400 })
        }

        const result = await frappeUploadFile(file, file.name, {
            is_private: formData.get('is_private') as string | undefined,
            user: (formData.get('user') as string | null) || undefined,
        })

        return NextResponse.json(result)
    } catch (error) {
        const status = extractStatusCode(error, 500)
        const safeMessage = sanitizeUserFacingError(error, 'File upload failed. Please try again.')
        return NextResponse.json({ error: safeMessage }, { status })
    }
}

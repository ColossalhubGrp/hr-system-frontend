const UNSAFE_BACKEND_TOKENS = /(traceback|frappe\.exceptions|_server_messages|exc_type|_exc_source|\"exc\"\s*:|\"exception\"\s*:|Frappe API error\s*:)/i

const parseJsonSafe = (value?: string | null) => {
    if (!value) return null
    try {
        return JSON.parse(value)
    } catch {
        return null
    }
}

const extractJsonPayloadFromText = (text: string) => {
    const start = text.indexOf("{")
    const end = text.lastIndexOf("}")
    if (start < 0 || end <= start) return null
    return parseJsonSafe(text.slice(start, end + 1))
}

const extractServerMessage = (payload: any): string | null => {
    if (!payload || typeof payload !== "object") return null

    if (typeof payload.message === "string" && payload.message.trim()) {
        return payload.message.trim()
    }

    const serverMessages = typeof payload._server_messages === "string"
        ? parseJsonSafe(payload._server_messages)
        : null

    if (Array.isArray(serverMessages) && serverMessages.length > 0) {
        const first = serverMessages[0]
        const parsedFirst = typeof first === "string" ? parseJsonSafe(first) : first
        if (parsedFirst && typeof parsedFirst.message === "string" && parsedFirst.message.trim()) {
            return parsedFirst.message.trim()
        }
        if (typeof first === "string" && first.trim()) {
            return first.trim()
        }
    }

    if (typeof payload.exception === "string" && payload.exception.trim()) {
        return payload.exception.trim()
    }

    return null
}

const extractRecipientEmail = (message: string) => {
    const emailMatch = message.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
    return emailMatch?.[0] || null
}

const toSafeMessage = (message: string, fallback: string) => {
    const trimmed = message.trim()
    if (!trimmed) return fallback

    if (/could not find recipient|couldn't find recipient|recipient.+not found|linkvalidationerror/i.test(trimmed)) {
        const recipientEmail = extractRecipientEmail(trimmed)
        if (recipientEmail) {
            return `We couldn't find recipient ${recipientEmail}. Check the email address and try again.`
        }
        return "We couldn't find that recipient. Check the email address and try again."
    }

    if (/invalid email or password|authentication|login failed/i.test(trimmed)) {
        return "Invalid email or password."
    }

    if (/permission|not permitted|forbidden|unauthorized|not allowed/i.test(trimmed)) {
        return "You don't have permission to perform this action."
    }

    if (/not found|does not exist|could not find/i.test(trimmed)) {
        return "The requested record was not found."
    }

    if (/required|validation|invalid/i.test(trimmed) && !UNSAFE_BACKEND_TOKENS.test(trimmed)) {
        return trimmed
    }

    if (UNSAFE_BACKEND_TOKENS.test(trimmed)) {
        return fallback
    }

    if (trimmed.length > 200) {
        return fallback
    }

    return trimmed
}

export const sanitizeUserFacingError = (error: unknown, fallback = "Something went wrong. Please try again.") => {
    const raw = error instanceof Error ? error.message : String(error || "")
    if (!raw.trim()) return fallback

    const parsedFromRaw = parseJsonSafe(raw)
    const parsedFromEmbedded = parsedFromRaw || extractJsonPayloadFromText(raw)
    const serverMessage = extractServerMessage(parsedFromEmbedded)

    if (serverMessage) {
        return toSafeMessage(serverMessage, fallback)
    }

    return toSafeMessage(raw, fallback)
}

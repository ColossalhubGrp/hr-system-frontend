const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

export const decodeHtmlEntities = (value: string) => {
    return value
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&#x27;/gi, "'")
}

export const stripHtmlToText = (value: string) => {
    const withoutTags = value.replace(/<[^>]*>/g, " ")
    return decodeHtmlEntities(withoutTags).replace(/\s+/g, " ").trim()
}

export const toPlainText = (value?: string) => {
    if (!value) return ""
    return stripHtmlToText(value)
}

export const splitSkills = (value?: string) => {
    if (!value) return []

    const normalized = decodeHtmlEntities(value)
        .replace(/<br\s*\/?>/gi, ",")
        .replace(/<\/p>/gi, ",")
        .replace(/<\/li>/gi, ",")
        .replace(/<li[^>]*>/gi, "")
        .replace(/<p[^>]*>/gi, "")

    const entries = normalized
        .split(/[;,\n]+/)
        .map((item) => stripHtmlToText(item))
        .filter(Boolean)

    return Array.from(new Set(entries))
}

const extractListItems = (listHtml: string) => {
    return Array.from(listHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
        .map((match) => stripHtmlToText(match[1] || ""))
        .filter(Boolean)
}

export const extractSectionListItemsFromDescription = (description: string | undefined, sectionPatterns: string[]) => {
    if (!description) return []

    const extracted: string[] = []

    for (const sectionPatternRaw of sectionPatterns) {
        const sectionPattern = sectionPatternRaw.includes("\\")
            ? sectionPatternRaw
            : escapeRegExp(sectionPatternRaw).replace(/\s+/g, "\\s+")

        const sectionRegex = new RegExp(
            `<(?:h[1-6]|p)[^>]*>\\s*(?:<u>)?\\s*(?:${sectionPattern})\\s*(?:<\\/u>)?\\s*<\\/(?:h[1-6]|p)>\\s*<ul[^>]*>([\\s\\S]*?)<\\/ul>`,
            "gi"
        )

        for (const match of description.matchAll(sectionRegex)) {
            extracted.push(...extractListItems(match[1] || ""))
        }
    }

    if (extracted.length === 0 && sectionPatterns.length > 0) {
        for (const sectionPatternRaw of sectionPatterns) {
            const sectionPattern = sectionPatternRaw.includes("\\")
                ? sectionPatternRaw
                : escapeRegExp(sectionPatternRaw).replace(/\s+/g, "\\s+")

            const fallbackRegex = new RegExp(`${sectionPattern}[\\s\\S]{0,500}?<ul[^>]*>([\\s\\S]*?)<\\/ul>`, "gi")
            for (const match of description.matchAll(fallbackRegex)) {
                extracted.push(...extractListItems(match[1] || ""))
            }
        }
    }

    return Array.from(new Set(extracted))
}

export const extractSkillsFromDescription = (description?: string) => {
    return extractSectionListItemsFromDescription(description, ["technical skills", "required skills", "skills"])
}

export const extractQualificationsFromDescription = (description?: string) => {
    return extractSectionListItemsFromDescription(description, ["qualifications\\s*&(?:amp;)?\\s*experience", "experience"])
}

export const stripSectionsFromDescription = (description: string | undefined, sectionPatterns: string[]) => {
    if (!description) return ""

    let stripped = description
    for (const sectionPatternRaw of sectionPatterns) {
        const sectionPattern = sectionPatternRaw.includes("\\")
            ? sectionPatternRaw
            : escapeRegExp(sectionPatternRaw).replace(/\s+/g, "\\s+")

        const blockRegex = new RegExp(
            `<(?:h[1-6]|p)[^>]*>\\s*(?:<u>)?\\s*(?:${sectionPattern})\\s*(?:<\\/u>)?\\s*<\\/(?:h[1-6]|p)>\\s*(?:<ul[^>]*>[\\s\\S]*?<\\/ul>)?\\s*(?:<p>\\s*<\\/p>)?`,
            "gi"
        )
        stripped = stripped.replace(blockRegex, "")
    }

    return stripped
}

export const getCleanTextOrFallback = (value: string | undefined, fallback: string) => {
    if (!value) return fallback
    const cleaned = stripHtmlToText(value)
    return cleaned || fallback
}

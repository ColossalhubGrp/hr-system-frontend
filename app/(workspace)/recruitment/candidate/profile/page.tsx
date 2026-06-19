"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/recruitment/layout/main-layout"
import { apiClient } from "@/lib/recruitment/api-client"
import { getStoredUserEmail } from "@/lib/recruitment/role-routing"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/sonner"
import { Loader2, Upload, Save, Sparkles, ExternalLink, Plus, Trash2, Download } from "lucide-react"
import { jsPDF } from "jspdf"
import type { CandidateProfile } from "@/lib/recruitment/types"

type ProfileFormState = {
    full_name: string
    phone: string
    headline: string
    location: string
    about: string
    current_company: string
    current_title: string
    years_of_experience: string
    skills: string
    preferences: string
    linkedin_url: string
    github_url: string
    portfolio_links: string
    website_url: string
    profile_picture: string
    cv_url: string
}

type ExperienceItem = {
    title: string
    company: string
    location: string
    start_date: string
    end_date: string
    description: string
}

type EducationItem = {
    school: string
    degree: string
    field_of_study: string
    start_date: string
    end_date: string
    description: string
}

type CertificationItem = {
    name: string
    issuer: string
    issue_date: string
    expiry_date: string
    credential_id: string
    credential_url: string
}

type UrlFieldKey = "linkedin_url" | "github_url" | "portfolio_links" | "website_url"

const toText = (value: unknown) => (typeof value === "string" ? value : "")
const API_BASE_URL = (
    process.env.FRAPPE_API_URL ||
    "https://api.colossalhub.com"
).replace(/\/$/, "")

const toAbsoluteAssetUrl = (value: string) => {
    const normalized = value.trim()
    if (!normalized) return ""
    if (/^https?:\/\//i.test(normalized)) return normalized
    if (normalized.startsWith("//")) return `https:${normalized}`
    if (normalized.startsWith("/")) return `${API_BASE_URL}${normalized}`
    return `${API_BASE_URL}/${normalized}`
}

type PdfInlineSegment = {
    text: string
    bold?: boolean
}

type MarkdownBlock =
    | { type: "heading"; level: number; text: string }
    | { type: "paragraph"; text: string }
    | { type: "list"; ordered: boolean; items: string[] }
    | { type: "divider" }

const parseInlineMarkdown = (value: string): PdfInlineSegment[] => {
    const text = value
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")

    const stripSingleEmphasis = (input: string) => input.replace(/(\*|_)([^*_]+)\1/g, "$2")

    const segments: PdfInlineSegment[] = []
    const regex = /(\*\*|__)(.+?)\1/g
    let lastIndex = 0

    for (const match of text.matchAll(regex)) {
        const start = match.index ?? 0
        if (start > lastIndex) {
            segments.push({ text: stripSingleEmphasis(text.slice(lastIndex, start)) })
        }

        segments.push({ text: stripSingleEmphasis(match[2]), bold: true })
        lastIndex = start + match[0].length
    }

    if (lastIndex < text.length) {
        segments.push({ text: stripSingleEmphasis(text.slice(lastIndex)) })
    }

    return segments
        .map((segment) => ({ ...segment, text: segment.text.replace(/\s+/g, " ") }))
        .filter((segment) => segment.text.length > 0)
}

const parseMarkdownBlocks = (markdown: string): MarkdownBlock[] => {
    const lines = markdown.replace(/\r\n?/g, "\n").split("\n")
    const blocks: MarkdownBlock[] = []
    let paragraphBuffer: string[] = []
    let listBuffer: string[] = []
    let orderedList = false

    const flushParagraph = () => {
        if (!paragraphBuffer.length) return
        blocks.push({ type: "paragraph", text: paragraphBuffer.join(" ").trim() })
        paragraphBuffer = []
    }

    const flushList = () => {
        if (!listBuffer.length) return
        blocks.push({ type: "list", ordered: orderedList, items: [...listBuffer] })
        listBuffer = []
    }

    for (const rawLine of lines) {
        const line = rawLine.trim()

        if (!line) {
            flushParagraph()
            flushList()
            continue
        }

        if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
            flushParagraph()
            flushList()
            blocks.push({ type: "divider" })
            continue
        }

        const headingMatch = line.match(/^(#{1,6})\s+(.*)$/)
        if (headingMatch) {
            flushParagraph()
            flushList()
            blocks.push({ type: "heading", level: headingMatch[1].length, text: headingMatch[2].trim() })
            continue
        }

        const unorderedMatch = line.match(/^[-*+]\s+(.*)$/)
        if (unorderedMatch) {
            flushParagraph()
            if (listBuffer.length && orderedList) {
                flushList()
            }
            orderedList = false
            listBuffer.push(unorderedMatch[1].trim())
            continue
        }

        const orderedMatch = line.match(/^\d+\.\s+(.*)$/)
        if (orderedMatch) {
            flushParagraph()
            if (listBuffer.length && !orderedList) {
                flushList()
            }
            orderedList = true
            listBuffer.push(orderedMatch[1].trim())
            continue
        }

        flushList()
        paragraphBuffer.push(line)
    }

    flushParagraph()
    flushList()

    return blocks
}

const extractUrlFromText = (value: string) => {
    const match = value.match(/https?:\/\/[^\s)]+/i)
    return match ? match[0] : null
}

const tokenizeSegments = (segments: PdfInlineSegment[]) => {
    return segments.flatMap((segment) =>
        segment.text
            .split(/(\s+)/)
            .filter((part) => part.length > 0)
            .map((part) => ({ text: part, bold: Boolean(segment.bold) }))
    )
}

const layoutWrappedLines = (
    doc: jsPDF,
    segments: PdfInlineSegment[],
    maxWidth: number,
    fontSize: number,
    firstLinePrefix = ""
) => {
    const tokens = tokenizeSegments(segments)
    const lines: Array<Array<{ text: string; bold: boolean }>> = []
    let currentLine: Array<{ text: string; bold: boolean }> = []
    let currentWidth = 0

    doc.setFontSize(fontSize)
    const prefixWidth = firstLinePrefix ? doc.getTextWidth(firstLinePrefix) : 0

    tokens.forEach((token, index) => {
        doc.setFont("helvetica", token.bold ? "bold" : "normal")
        const tokenWidth = doc.getTextWidth(token.text)
        const availableWidth = maxWidth - (lines.length === 0 ? prefixWidth : 0)

        if (currentWidth + tokenWidth > availableWidth && currentLine.length > 0) {
            lines.push(currentLine)
            currentLine = []
            currentWidth = 0
        }

        currentLine.push(token)
        currentWidth += tokenWidth

        if (index === tokens.length - 1 && currentLine.length > 0) {
            lines.push(currentLine)
        }
    })

    if (!tokens.length) {
        lines.push([])
    }

    return { lines, prefixWidth }
}

const emptyExperience = (): ExperienceItem => ({
    title: "",
    company: "",
    location: "",
    start_date: "",
    end_date: "",
    description: "",
})

const emptyEducation = (): EducationItem => ({
    school: "",
    degree: "",
    field_of_study: "",
    start_date: "",
    end_date: "",
    description: "",
})

const emptyCertification = (): CertificationItem => ({
    name: "",
    issuer: "",
    issue_date: "",
    expiry_date: "",
    credential_id: "",
    credential_url: "",
})

const parseArray = <T,>(raw: unknown): T[] => {
    if (Array.isArray(raw)) return raw as T[]
    if (typeof raw !== "string" || !raw.trim()) return []
    try {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? (parsed as T[]) : []
    } catch {
        return []
    }
}

const parseExperiences = (raw: unknown): ExperienceItem[] => {
    const parsed = parseArray<any>(raw)
    if (parsed.length > 0) {
        return parsed.map((item) => ({
            title: toText(item?.title),
            company: toText(item?.company),
            location: toText(item?.location),
            start_date: toText(item?.start_date),
            end_date: toText(item?.end_date),
            description: toText(item?.description),
        }))
    }
    if (typeof raw === "string" && raw.trim()) {
        return [{ ...emptyExperience(), description: raw.trim() }]
    }
    return [emptyExperience()]
}

const parseEducation = (raw: unknown): EducationItem[] => {
    const parsed = parseArray<any>(raw)
    if (parsed.length > 0) {
        return parsed.map((item) => ({
            school: toText(item?.school),
            degree: toText(item?.degree),
            field_of_study: toText(item?.field_of_study),
            start_date: toText(item?.start_date),
            end_date: toText(item?.end_date),
            description: toText(item?.description),
        }))
    }
    if (typeof raw === "string" && raw.trim()) {
        return [{ ...emptyEducation(), description: raw.trim() }]
    }
    return [emptyEducation()]
}

const parseCertifications = (raw: unknown): CertificationItem[] => {
    const parsed = parseArray<any>(raw)
    if (parsed.length > 0) {
        return parsed.map((item) => ({
            name: toText(item?.name),
            issuer: toText(item?.issuer),
            issue_date: toText(item?.issue_date),
            expiry_date: toText(item?.expiry_date),
            credential_id: toText(item?.credential_id),
            credential_url: toText(item?.credential_url),
        }))
    }
    return [emptyCertification()]
}

const isExperienceFilled = (item: ExperienceItem) =>
    Boolean(item.title || item.company || item.location || item.start_date || item.end_date || item.description)

const isEducationFilled = (item: EducationItem) =>
    Boolean(item.school || item.degree || item.field_of_study || item.start_date || item.end_date || item.description)

const isCertificationFilled = (item: CertificationItem) =>
    Boolean(item.name || item.issuer || item.issue_date || item.expiry_date || item.credential_id || item.credential_url)

const isValidHttpUrl = (value: string) => {
    if (!value.trim()) return true
    try {
        const url = new URL(value)
        return url.protocol === "http:" || url.protocol === "https:"
    } catch {
        return false
    }
}

const getUrlErrors = (profile: ProfileFormState): Partial<Record<UrlFieldKey, string>> => {
    const errors: Partial<Record<UrlFieldKey, string>> = {}
    if (!isValidHttpUrl(profile.linkedin_url)) errors.linkedin_url = "Enter a valid URL starting with http:// or https://"
    if (!isValidHttpUrl(profile.github_url)) errors.github_url = "Enter a valid URL starting with http:// or https://"
    if (!isValidHttpUrl(profile.portfolio_links)) errors.portfolio_links = "Enter a valid URL starting with http:// or https://"
    if (!isValidHttpUrl(profile.website_url)) errors.website_url = "Enter a valid URL starting with http:// or https://"
    return errors
}

const getProfileStrength = (profile: ProfileFormState, experiences: ExperienceItem[], educations: EducationItem[], certifications: CertificationItem[]) => {
    const checks = [
        profile.full_name,
        profile.phone,
        profile.headline,
        profile.about,
        profile.skills,
        experiences.some(isExperienceFilled),
        educations.some(isEducationFilled),
        certifications.some(isCertificationFilled),
        profile.profile_picture,
        profile.cv_url,
        profile.linkedin_url || profile.github_url || profile.portfolio_links || profile.website_url,
    ]

    const completed = checks.filter(Boolean).length
    const percent = Math.round((completed / checks.length) * 100)

    if (percent >= 85) return { percent, label: "Excellent" }
    if (percent >= 60) return { percent, label: "Strong" }
    if (percent >= 35) return { percent, label: "Good Start" }
    return { percent, label: "Needs Work" }
}

export default function CandidateProfileSelfPage() {
    const router = useRouter()
    const userEmail = useMemo(() => getStoredUserEmail(), [])

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploadingCv, setUploadingCv] = useState(false)
    const [uploadingProfileImage, setUploadingProfileImage] = useState(false)
    const [generatingResume, setGeneratingResume] = useState(false)
    const [profileName, setProfileName] = useState<string | undefined>(undefined)
    const [aiResume, setAiResume] = useState("")
    const cvInputRef = useRef<HTMLInputElement>(null)
    const imageInputRef = useRef<HTMLInputElement>(null)
    const [experiences, setExperiences] = useState<ExperienceItem[]>([emptyExperience()])
    const [educations, setEducations] = useState<EducationItem[]>([emptyEducation()])
    const [certifications, setCertifications] = useState<CertificationItem[]>([emptyCertification()])

    const [form, setForm] = useState<ProfileFormState>({
        full_name: "",
        phone: "",
        headline: "",
        location: "",
        about: "",
        current_company: "",
        current_title: "",
        years_of_experience: "",
        skills: "",
        preferences: "",
        linkedin_url: "",
        github_url: "",
        portfolio_links: "",
        website_url: "",
        profile_picture: "",
        cv_url: "",
    })

    const urlErrors = getUrlErrors(form)
    const hasInvalidUrls = Object.keys(urlErrors).length > 0
    const hasInvalidCertificationUrls = certifications.some((cert) => cert.credential_url.trim() && !isValidHttpUrl(cert.credential_url))

    useEffect(() => {
        if (!apiClient.isAuthenticated()) {
            router.push("/login")
            return
        }

        void loadProfile()
    }, [router])

    const loadProfile = async () => {
        if (!userEmail) {
            setLoading(false)
            return
        }

        try {
            const profile = await apiClient.getCandidateSelfProfile(userEmail)
            const p = (profile || {}) as CandidateProfile

            setProfileName(toText(p.name) || undefined)
            setForm({
                full_name: toText(p.full_name),
                phone: toText(p.phone),
                headline: toText(p.headline),
                location: toText(p.location),
                about: toText(p.about),
                current_company: toText(p.current_company),
                current_title: toText(p.current_title),
                years_of_experience: p.years_of_experience == null ? "" : String(p.years_of_experience),
                skills: toText(p.skills),
                preferences: toText(p.preferences),
                linkedin_url: toText(p.linkedin_url),
                github_url: toText(p.github_url),
                portfolio_links: toText(p.portfolio_links || p.portfolio_url),
                website_url: toText(p.website_url),
                profile_picture: toText(p.profile_picture || p.profile_image_url),
                cv_url: toText(p.cv_url || p.resume_url),
            })
            setExperiences(parseExperiences(p.work_history))
            setEducations(parseEducation(p.education))
            setCertifications(parseCertifications(p.certifications))
        } catch (error: any) {
            toast.error(error.message || "Failed to load profile")
        } finally {
            setLoading(false)
        }
    }

    const updateField = (field: keyof ProfileFormState, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }))
    }

    const handleSaveProfile = async () => {
        if (!userEmail) {
            toast.error("User email not found. Please login again.")
            return
        }

        if (hasInvalidUrls || hasInvalidCertificationUrls) {
            toast.error("Please fix invalid URLs before saving")
            return
        }

        setSaving(true)
        try {
            const normalizedExperiences = experiences.filter(isExperienceFilled)
            const normalizedEducations = educations.filter(isEducationFilled)
            const normalizedCertifications = certifications.filter(isCertificationFilled)

            const payload: Partial<CandidateProfile> & { user: string } = {
                user: userEmail,
                ...form,
                years_of_experience: form.years_of_experience ? Number(form.years_of_experience) : undefined,
                work_history: normalizedExperiences.length ? JSON.stringify(normalizedExperiences) : "",
                education: normalizedEducations.length ? JSON.stringify(normalizedEducations) : "",
                certifications: normalizedCertifications.length ? JSON.stringify(normalizedCertifications) : "",
                resume_url: form.cv_url || undefined,
            }

            const response = await apiClient.updateCandidateSelfProfile(payload)
            if (response?.profile?.name) {
                setProfileName(response.profile.name)
            }
            toast.success("Profile saved")
        } catch (error: any) {
            toast.error(error.message || "Failed to save profile")
        } finally {
            setSaving(false)
        }
    }

    const addExperience = () => setExperiences((prev) => [...prev, emptyExperience()])
    const removeExperience = (index: number) => {
        setExperiences((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))
    }
    const updateExperience = (index: number, field: keyof ExperienceItem, value: string) => {
        setExperiences((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
    }

    const addEducation = () => setEducations((prev) => [...prev, emptyEducation()])
    const removeEducation = (index: number) => {
        setEducations((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))
    }
    const updateEducation = (index: number, field: keyof EducationItem, value: string) => {
        setEducations((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
    }

    const addCertification = () => setCertifications((prev) => [...prev, emptyCertification()])
    const removeCertification = (index: number) => {
        setCertifications((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))
    }
    const updateCertification = (index: number, field: keyof CertificationItem, value: string) => {
        setCertifications((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
    }

    const handleProfileImageUpload = async (file?: File) => {
        if (!file) return

        if (!file.type.startsWith("image/")) {
            toast.error("Upload an image file only")
            return
        }

        setUploadingProfileImage(true)
        try {
            const upload = await apiClient.uploadCandidateProfileImage(file)
            const nextImageUrl = upload.file_url

            setForm((prev) => ({ ...prev, profile_picture: nextImageUrl }))

            if (userEmail) {
                await apiClient.updateCandidateSelfProfile({
                    user: userEmail,
                    profile_picture: nextImageUrl,
                })
            }

            toast.success("Profile image uploaded")
        } catch (error: any) {
            toast.error(error.message || "Profile image upload failed")
        } finally {
            setUploadingProfileImage(false)
        }
    }

    const handleCvUpload = async (file?: File) => {
        if (!file) return

        const allowed = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ]

        if (!allowed.includes(file.type)) {
            toast.error("Upload PDF, DOC, or DOCX only")
            return
        }

        setUploadingCv(true)
        try {
            const upload = await apiClient.uploadCandidateCv(file)
            const nextCvUrl = upload.file_url

            setForm((prev) => ({ ...prev, cv_url: nextCvUrl }))

            if (userEmail) {
                await apiClient.updateCandidateSelfProfile({
                    user: userEmail,
                    cv_url: nextCvUrl,
                    resume_url: nextCvUrl,
                })
            }

            toast.success("CV uploaded")
        } catch (error: any) {
            toast.error(error.message || "CV upload failed")
        } finally {
            setUploadingCv(false)
        }
    }

    const handleGenerateAiResume = async () => {
        if (!userEmail) {
            toast.error("User email not found. Please login again.")
            return
        }

        setGeneratingResume(true)
        try {
            const response = await apiClient.buildAiResume(userEmail)
            if (response?.success === false) {
                const missingLabels = (response.missing_field_labels && response.missing_field_labels.length > 0)
                    ? response.missing_field_labels
                    : (response.missing_fields || []).map((field) => field.label).filter(Boolean)

                const errorMessage = missingLabels.length > 0
                    ? `${response.message || "Candidate profile is incomplete."} Missing: ${missingLabels.join(", ")}.`
                    : (response.message || "Candidate profile is incomplete. Fill all required fields before AI resume generation.")

                toast.error(errorMessage)
                setAiResume("")
                return
            }

            const generated = (response?.ai_resume || "").trim()
            setAiResume(generated)
            if (generated) {
                toast.success("AI resume generated")
            } else {
                toast.info(response?.message || "No AI resume content returned")
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to generate AI resume")
        } finally {
            setGeneratingResume(false)
        }
    }

    const handleDownloadAiResumePdf = () => {
        const content = aiResume.trim()
        if (!content) {
            toast.error("Generate or enter resume content first.")
            return
        }

        const doc = new jsPDF({ unit: "pt", format: "a4" })
        const margin = 40
        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()
        const maxTextWidth = pageWidth - margin * 2

        let cursorY = margin
        const ensureSpace = (height: number) => {
            if (cursorY + height <= pageHeight - margin) return
            doc.addPage()
            cursorY = margin
        }

        const blocks = parseMarkdownBlocks(content)

        blocks.forEach((block) => {
            if (block.type === "heading") {
                const fontSizeByLevel: Record<number, number> = {
                    1: 18,
                    2: 15,
                    3: 13,
                    4: 12,
                    5: 11,
                    6: 11,
                }
                const headingSize = fontSizeByLevel[block.level] || 12
                const lineHeight = Math.round(headingSize * 1.4)
                const { lines } = layoutWrappedLines(doc, parseInlineMarkdown(block.text), maxTextWidth, headingSize)

                lines.forEach((line) => {
                    ensureSpace(lineHeight)
                    let cursorX = margin
                    line.forEach((token) => {
                        doc.setFont("helvetica", "bold")
                        doc.setFontSize(headingSize)
                        const tokenX = cursorX
                        doc.text(token.text, tokenX, cursorY)
                        const linkUrl = extractUrlFromText(token.text)
                        if (linkUrl) {
                            const tokenWidth = doc.getTextWidth(token.text)
                            doc.link(tokenX, cursorY - headingSize + 2, tokenWidth, headingSize + 4, { url: linkUrl })
                        }
                        cursorX += doc.getTextWidth(token.text)
                    })
                    cursorY += lineHeight
                })
                cursorY += 4
                return
            }

            if (block.type === "paragraph") {
                const fontSize = 11
                const lineHeight = 16
                const { lines } = layoutWrappedLines(doc, parseInlineMarkdown(block.text), maxTextWidth, fontSize)

                lines.forEach((line) => {
                    ensureSpace(lineHeight)
                    let cursorX = margin
                    line.forEach((token) => {
                        doc.setFont("helvetica", token.bold ? "bold" : "normal")
                        doc.setFontSize(fontSize)
                        const tokenX = cursorX
                        doc.text(token.text, tokenX, cursorY)
                        const linkUrl = extractUrlFromText(token.text)
                        if (linkUrl) {
                            const tokenWidth = doc.getTextWidth(token.text)
                            doc.link(tokenX, cursorY - fontSize + 2, tokenWidth, fontSize + 4, { url: linkUrl })
                        }
                        cursorX += doc.getTextWidth(token.text)
                    })
                    cursorY += lineHeight
                })
                cursorY += 6
                return
            }

            if (block.type === "list") {
                const fontSize = 11
                const lineHeight = 16

                block.items.forEach((item, index) => {
                    const prefix = block.ordered ? `${index + 1}. ` : "â€¢ "
                    const { lines, prefixWidth } = layoutWrappedLines(
                        doc,
                        parseInlineMarkdown(item),
                        maxTextWidth,
                        fontSize,
                        prefix
                    )

                    lines.forEach((line, lineIndex) => {
                        ensureSpace(lineHeight)
                        let cursorX = margin

                        if (lineIndex === 0) {
                            doc.setFont("helvetica", "normal")
                            doc.setFontSize(fontSize)
                            doc.text(prefix, cursorX, cursorY)
                            cursorX += prefixWidth
                        } else {
                            cursorX += prefixWidth
                        }

                        line.forEach((token) => {
                            doc.setFont("helvetica", token.bold ? "bold" : "normal")
                            doc.setFontSize(fontSize)
                            const tokenX = cursorX
                            doc.text(token.text, tokenX, cursorY)
                            const linkUrl = extractUrlFromText(token.text)
                            if (linkUrl) {
                                const tokenWidth = doc.getTextWidth(token.text)
                                doc.link(tokenX, cursorY - fontSize + 2, tokenWidth, fontSize + 4, { url: linkUrl })
                            }
                            cursorX += doc.getTextWidth(token.text)
                        })
                        cursorY += lineHeight
                    })
                })

                cursorY += 6
                return
            }

            if (block.type === "divider") {
                ensureSpace(12)
                doc.setDrawColor(180)
                doc.setLineWidth(0.6)
                doc.line(margin, cursorY, pageWidth - margin, cursorY)
                cursorY += 12
            }
        })

        const safeName = (form.full_name || "candidate")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "") || "candidate"

        doc.save(`${safeName}-ai-resume.pdf`)
        toast.info("PDF downloaded. If you want this CV stored in the system, upload the downloaded file back using Upload CV.")
    }

    if (loading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center h-40">
                    <div className="w-9 h-9 rounded-full border-2 border-[#034078] border-t-transparent animate-spin" />
                </div>
            </MainLayout>
        )
    }

    const profileStrength = getProfileStrength(form, experiences, educations, certifications)

    return (
        <MainLayout>
            <div className="mx-auto w-full max-w-6xl space-y-6">
                {/* Hero */}
                <div className="rounded-2xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3]">
                                Your candidate profile
                            </p>
                            <h1 className="mt-1 text-2xl font-bold leading-tight text-[#0A1128]">
                                {form.full_name || "My profile"}
                            </h1>
                            <p className="mt-1 max-w-xl text-sm text-[#525252]">
                                {form.headline ||
                                    "Build a strong profile so recruiters can match you to the right roles."}
                            </p>
                        </div>
                        <Button
                            onClick={handleSaveProfile}
                            disabled={saving || hasInvalidUrls || hasInvalidCertificationUrls}
                            className="bg-[#034078] text-white hover:bg-[#0A1128]"
                        >
                            {saving ? "Saving…" : "Save profile"}
                        </Button>
                    </div>
                </div>

                {(hasInvalidUrls || hasInvalidCertificationUrls) && (
                    <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-500" />
                        Some profile links are invalid. Fix them to save changes.
                    </div>
                )}

                {/* Profile completeness */}
                <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]">
                                Profile completeness
                            </p>
                            <p className="text-base font-semibold text-[#0A1128]">
                                {profileStrength.label}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center rounded-full bg-[#EFF6FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#034078]">
                                {profileStrength.percent}% complete
                            </span>
                        </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E5E5E5]">
                        <div
                            className="h-full rounded-full"
                            style={{
                                width: `${profileStrength.percent}%`,
                                background: "#034078",
                            }}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <Card className="lg:col-span-2 border-[#E5E5E5]">
                        <CardHeader>
                            <CardTitle className="text-[#0A1128]">Core Profile</CardTitle>
                            <CardDescription>LinkedIn-style summary and current role details.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="full_name">Full Name</Label>
                                <Input id="full_name" value={form.full_name} onChange={(e) => updateField("full_name", e.target.value)} placeholder="Jane Doe" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input id="phone" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="+263 77 000 0000" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="headline">Headline</Label>
                                <Input id="headline" value={form.headline} onChange={(e) => updateField("headline", e.target.value)} placeholder="Senior HR Analyst | Talent Acquisition" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="location">Location</Label>
                                <Input id="location" value={form.location} onChange={(e) => updateField("location", e.target.value)} placeholder="Chiredzi, Zimbabwe" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="years">Years of Experience</Label>
                                <Input id="years" type="number" min={0} value={form.years_of_experience} onChange={(e) => updateField("years_of_experience", e.target.value)} placeholder="3" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="company">Current Company</Label>
                                <Input id="company" value={form.current_company} onChange={(e) => updateField("current_company", e.target.value)} placeholder="Colossal Hub" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="title">Current Title</Label>
                                <Input id="title" value={form.current_title} onChange={(e) => updateField("current_title", e.target.value)} placeholder="Software Engineer" />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="about">About</Label>
                                <Textarea id="about" value={form.about} onChange={(e) => updateField("about", e.target.value)} placeholder="Professional summary, strengths, and what roles you are targeting..." rows={5} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-[#E5E5E5]">
                        <CardHeader>
                            <CardTitle className="text-[#0A1128]">Profile Media</CardTitle>
                            <CardDescription>Upload your profile photo and latest CV.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center gap-3 pb-2 border-b border-[#E5E5E5]">
                                <div className="h-14 w-14 rounded-full overflow-hidden border border-[#E5E5E5] bg-[#F5F5F5] flex items-center justify-center text-[#525252] text-sm font-semibold">
                                    {form.profile_picture ? (
                                        <img src={toAbsoluteAssetUrl(form.profile_picture)} alt="Profile" className="h-full w-full object-cover" />
                                    ) : (
                                        (form.full_name || "U").trim().charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-[#171717]">Profile Photo</p>
                                    <p className="text-xs text-[#525252]">JPG, PNG, or WebP</p>
                                </div>
                            </div>

                            <Input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void handleProfileImageUpload(e.target.files?.[0])} disabled={uploadingProfileImage} />
                            <Button variant="outline" className="w-full" disabled={uploadingProfileImage} onClick={() => imageInputRef.current?.click()}>
                                {uploadingProfileImage ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                                {uploadingProfileImage ? "Uploading Photo..." : "Upload Profile Photo"}
                            </Button>

                            <Input ref={cvInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => void handleCvUpload(e.target.files?.[0])} disabled={uploadingCv} />
                            <Button variant="outline" className="w-full" disabled={uploadingCv} onClick={() => cvInputRef.current?.click()}>
                                {uploadingCv ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                                {uploadingCv ? "Uploading..." : "Upload CV"}
                            </Button>
                            {/* <div className="space-y-1">
                                <Label htmlFor="resume_url">Resume URL</Label>
                                <Input id="resume_url" value={form.cv_url} placeholder="Upload CV to auto-populate" readOnly />
                                <p className="text-xs text-[#525252]">This is auto-populated from your uploaded CV.</p>
                            </div> */}
                            {form.cv_url && (
                                <a href={`https://api.colossalhub.com${form.cv_url}`} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm text-[#034078] underline break-all">
                                    View uploaded CV <ExternalLink className="h-3.5 w-3.5 ml-1" />
                                </a>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <Card className="border-[#E5E5E5]">
                        <CardHeader>
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <CardTitle className="text-[#0A1128]">Work Experience</CardTitle>
                                    <CardDescription>Add all roles just like LinkedIn.</CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={addExperience}>
                                    <Plus className="h-4 w-4 mr-1" /> Add Experience
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {experiences.map((item, index) => (
                                <div key={`exp-${index}`} className="rounded-lg border border-[#E5E5E5] p-4 space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-semibold text-[#171717]">Experience #{index + 1}</p>
                                        <Button variant="ghost" size="sm" onClick={() => removeExperience(index)}>
                                            <Trash2 className="h-4 w-4 mr-1" /> Remove
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <Input value={item.title} onChange={(e) => updateExperience(index, "title", e.target.value)} placeholder="Title (e.g. Software Engineer)" />
                                        <Input value={item.company} onChange={(e) => updateExperience(index, "company", e.target.value)} placeholder="Company" />
                                        <Input value={item.location} onChange={(e) => updateExperience(index, "location", e.target.value)} placeholder="Location" />
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input value={item.start_date} onChange={(e) => updateExperience(index, "start_date", e.target.value)} placeholder="Start (YYYY-MM)" />
                                            <Input value={item.end_date} onChange={(e) => updateExperience(index, "end_date", e.target.value)} placeholder="End or Present" />
                                        </div>
                                    </div>
                                    <Textarea value={item.description} onChange={(e) => updateExperience(index, "description", e.target.value)} placeholder="Describe responsibilities and impact..." rows={3} />
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="border-[#E5E5E5]">
                        <CardHeader>
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <CardTitle className="text-[#0A1128]">Education</CardTitle>
                                    <CardDescription>Add schools, degrees, and study details.</CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={addEducation}>
                                    <Plus className="h-4 w-4 mr-1" /> Add Education
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {educations.map((item, index) => (
                                <div key={`edu-${index}`} className="rounded-lg border border-[#E5E5E5] p-4 space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-semibold text-[#171717]">Education #{index + 1}</p>
                                        <Button variant="ghost" size="sm" onClick={() => removeEducation(index)}>
                                            <Trash2 className="h-4 w-4 mr-1" /> Remove
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <Input value={item.school} onChange={(e) => updateEducation(index, "school", e.target.value)} placeholder="School or University" />
                                        <Input value={item.degree} onChange={(e) => updateEducation(index, "degree", e.target.value)} placeholder="Degree" />
                                        <Input value={item.field_of_study} onChange={(e) => updateEducation(index, "field_of_study", e.target.value)} placeholder="Field of Study" />
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input value={item.start_date} onChange={(e) => updateEducation(index, "start_date", e.target.value)} placeholder="Start (YYYY-MM)" />
                                            <Input value={item.end_date} onChange={(e) => updateEducation(index, "end_date", e.target.value)} placeholder="End (YYYY-MM)" />
                                        </div>
                                    </div>
                                    <Textarea value={item.description} onChange={(e) => updateEducation(index, "description", e.target.value)} placeholder="Highlights, honors, activities..." rows={3} />
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="border-[#E5E5E5]">
                        <CardHeader>
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <CardTitle className="text-[#0A1128]">Certifications</CardTitle>
                                    <CardDescription>Add certificates, IDs, and credential links.</CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={addCertification}>
                                    <Plus className="h-4 w-4 mr-1" /> Add Certification
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {certifications.map((item, index) => (
                                <div key={`cert-${index}`} className="rounded-lg border border-[#E5E5E5] p-4 space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-semibold text-[#171717]">Certification #{index + 1}</p>
                                        <Button variant="ghost" size="sm" onClick={() => removeCertification(index)}>
                                            <Trash2 className="h-4 w-4 mr-1" /> Remove
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <Input value={item.name} onChange={(e) => updateCertification(index, "name", e.target.value)} placeholder="Certification Name" />
                                        <Input value={item.issuer} onChange={(e) => updateCertification(index, "issuer", e.target.value)} placeholder="Issuer" />
                                        <Input value={item.issue_date} onChange={(e) => updateCertification(index, "issue_date", e.target.value)} placeholder="Issue Date (YYYY-MM)" />
                                        <Input value={item.expiry_date} onChange={(e) => updateCertification(index, "expiry_date", e.target.value)} placeholder="Expiry Date (optional)" />
                                        <Input value={item.credential_id} onChange={(e) => updateCertification(index, "credential_id", e.target.value)} placeholder="Credential ID" />
                                        <div className="space-y-1">
                                            <Input
                                                value={item.credential_url}
                                                onChange={(e) => updateCertification(index, "credential_url", e.target.value)}
                                                placeholder="Credential URL"
                                                className={item.credential_url.trim() && !isValidHttpUrl(item.credential_url) ? "border-red-500" : ""}
                                            />
                                            {item.credential_url.trim() && !isValidHttpUrl(item.credential_url) && (
                                                <p className="text-xs text-red-600">Enter a valid URL starting with http:// or https://</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="border-[#E5E5E5]">
                        <CardHeader>
                            <CardTitle className="text-[#0A1128]">Skills, Preferences & Links</CardTitle>
                            <CardDescription>Help matching and recruiters discover your profile faster.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="skills">Skills</Label>
                                <Textarea id="skills" value={form.skills} onChange={(e) => updateField("skills", e.target.value)} placeholder="Comma-separated skills (e.g. Python, Recruitment, SQL, Stakeholder Mgmt)" rows={3} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="preferences">Job Preferences</Label>
                                <Textarea id="preferences" value={form.preferences} onChange={(e) => updateField("preferences", e.target.value)} placeholder="Preferred roles, industries, remote/hybrid preference..." rows={3} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Input value={form.linkedin_url} onChange={(e) => updateField("linkedin_url", e.target.value)} placeholder="LinkedIn URL" className={urlErrors.linkedin_url ? "border-red-500" : ""} />
                                    {urlErrors.linkedin_url && <p className="text-xs text-red-600">{urlErrors.linkedin_url}</p>}
                                </div>
                                <div className="space-y-1">
                                    <Input value={form.github_url} onChange={(e) => updateField("github_url", e.target.value)} placeholder="GitHub URL" className={urlErrors.github_url ? "border-red-500" : ""} />
                                    {urlErrors.github_url && <p className="text-xs text-red-600">{urlErrors.github_url}</p>}
                                </div>
                                <div className="space-y-1">
                                    <Input value={form.portfolio_links} onChange={(e) => updateField("portfolio_links", e.target.value)} placeholder="Portfolio Links" className={urlErrors.portfolio_links ? "border-red-500" : ""} />
                                    {urlErrors.portfolio_links && <p className="text-xs text-red-600">{urlErrors.portfolio_links}</p>}
                                </div>
                                <div className="space-y-1">
                                    <Input value={form.website_url} onChange={(e) => updateField("website_url", e.target.value)} placeholder="Website URL" className={urlErrors.website_url ? "border-red-500" : ""} />
                                    {urlErrors.website_url && <p className="text-xs text-red-600">{urlErrors.website_url}</p>}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-[#E5E5E5]">
                    <CardHeader>
                        <CardTitle className="text-[#0A1128]">AI Resume Builder</CardTitle>
                        <CardDescription>Generate an optimized resume draft from your profile details.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex gap-2 flex-wrap">
                            <Button variant="outline" onClick={handleGenerateAiResume} disabled={generatingResume}>
                                {generatingResume ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                                {generatingResume ? "Generating..." : "Generate AI Resume"}
                            </Button>
                            <Button variant="outline" onClick={handleDownloadAiResumePdf} disabled={!aiResume.trim()}>
                                <Download className="h-4 w-4 mr-2" />
                                Download as PDF
                            </Button>
                        </div>
                        <Textarea value={aiResume} onChange={(e) => setAiResume(e.target.value)} placeholder="Generated AI resume will appear here..." rows={10} />
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    )
}

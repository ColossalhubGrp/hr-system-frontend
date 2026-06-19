"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/recruitment/api-client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Briefcase, CalendarDays, Loader2, MapPin } from "lucide-react"
import type { JobPosting } from "@/lib/recruitment/types"
import { extractSkillsFromDescription, splitSkills } from "@/lib/recruitment/job-content"

const containsHtml = (value: string) => /<\/?[a-z][\s\S]*>/i.test(value)

const sanitizeRichHtml = (value: string) => {
    return value
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
        .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
        .replace(/\son\w+=("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
        .replace(/\s(href|src)=("|')\s*javascript:[\s\S]*?\2/gi, "")
}

const renderRichContent = (value?: string, emptyLabel = "No description provided.") => {
    if (!value?.trim()) {
        return <p className="text-sm text-[#525252]">{emptyLabel}</p>
    }

    const content = value.trim()
    if (containsHtml(content)) {
        return (
            <div
                className="prose prose-sm max-w-none text-[#525252] [&_h1]:text-[#0A1128] [&_h2]:text-[#0A1128] [&_h3]:text-[#0A1128] [&_p]:text-[#525252] [&_li]:text-[#525252]"
                dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(content) }}
            />
        )
    }

    return (
        <div className="space-y-2">
            {content.split(/\n+/).map((line, index) => (
                <p className="text-sm text-[#525252]" key={`${line}-${index}`}>{line.trim()}</p>
            ))}
        </div>
    )
}

const formatDate = (value?: string) => {
    if (!value) return "Not specified"
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

export default function PublicJobDetailPage({ jobId }: { jobId: string }) {
    const router = useRouter()
    const [job, setJob] = useState<JobPosting | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [signedIn, setSignedIn] = useState(false)

    useEffect(() => {
        setSignedIn(apiClient.isAuthenticated())
    }, [])

    useEffect(() => {
        void loadJob()
    }, [jobId])

    const loadJob = async () => {
        try {
            setLoading(true)
            setError(null)
            const response = await apiClient.publicGetJob(jobId)
            setJob(response)
        } catch (loadError: any) {
            setError(loadError?.message || "Failed to load job")
            setJob(null)
        } finally {
            setLoading(false)
        }
    }

    const handleApply = () => {
        if (!job) return

        const applyPath = `/recruitment/candidate/jobs/${encodeURIComponent(job.name)}`
        router.push(applyPath)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="h-9 w-9 rounded-full border-2 border-[#034078] border-t-transparent animate-spin" />
            </div>
        )
    }

    if (error || !job) {
        return (
            <div className="min-h-screen bg-[#FAFAFA]">
                <div className="max-w-5xl mx-auto px-6 py-8 space-y-4">
                    <Link href="/recruitment/jobs">
                        <Button variant="outline">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Jobs
                        </Button>
                    </Link>
                    <Card className="border-red-200 bg-red-50">
                        <CardContent className="pt-6">
                            <p className="text-red-800">{error || "Job not found"}</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    const directSkills = splitSkills(job.required_skills)
    const inferredSkills = extractSkillsFromDescription(job.job_description)
    const skills = directSkills.length > 0 ? directSkills : inferredSkills

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            <div className="border-b border-[#E5E5E5] bg-white">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
                    <Link href="/recruitment/jobs">
                        <Button variant="outline">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Jobs
                        </Button>
                    </Link>
                    <div className="flex gap-2 flex-wrap">
                        {!signedIn && (
                            <>
                                <Link href="/login">
                                    <Button variant="outline">Sign In</Button>
                                </Link>
                                <Button onClick={handleApply}>Apply</Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
                <Card className="border-[#E5E5E5]">
                    <CardHeader className="space-y-4">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="space-y-2">
                                <Badge className="bg-[#034078] text-white">Open</Badge>
                                <CardTitle className="text-2xl text-[#0A1128]">{job.job_title}</CardTitle>
                                <div className="flex flex-wrap gap-4 text-sm text-[#525252]">
                                    {job.company && (
                                        <span className="inline-flex items-center gap-2">
                                            <Briefcase className="h-4 w-4" />
                                            {job.company}
                                        </span>
                                    )}
                                    {job.location && (
                                        <span className="inline-flex items-center gap-2">
                                            <MapPin className="h-4 w-4" />
                                            {job.location}
                                        </span>
                                    )}
                                    <span className="inline-flex items-center gap-2">
                                        <CalendarDays className="h-4 w-4" />
                                        Posted {formatDate(job.posted_date)}
                                    </span>
                                </div>
                            </div>
                            {!signedIn && (
                                <Button onClick={handleApply}>Apply Now</Button>
                            )}
                        </div>
                    </CardHeader>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6">
                    <Card className="border-[#E5E5E5]">
                        <CardHeader>
                            <CardTitle className="text-[#0A1128]">Job Description</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {renderRichContent(job.job_description)}
                        </CardContent>
                    </Card>

                    <div className="space-y-4">
                        {skills.length > 0 && (
                            <Card className="border-[#E5E5E5]">
                                <CardHeader>
                                    <CardTitle className="text-[#0A1128] text-base">Skills</CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-wrap gap-2">
                                    {skills.map((skill) => (
                                        <Badge key={skill} variant="outline">{skill}</Badge>
                                    ))}
                                </CardContent>
                            </Card>
                        )}

                        <Card className="border-[#E5E5E5]">
                            <CardHeader>
                                <CardTitle className="text-[#0A1128] text-base">Role Snapshot</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm text-[#525252]">
                                <div>
                                    <p className="font-medium text-[#0A1128]">Experience</p>
                                    <p>{job.experience_min_years != null ? `${job.experience_min_years}+ years` : "Not specified"}</p>
                                </div>
                                <div>
                                    <p className="font-medium text-[#0A1128]">Education</p>
                                    <div className="mt-1">{renderRichContent(job.education_required, "Not specified")}</div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}

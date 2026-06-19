"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { apiClient } from "@/lib/recruitment/api-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, MapPin, ArrowRight, Loader2, X } from "lucide-react"
import type { JobPosting } from "@/lib/recruitment/types"
import { stripHtmlToText } from "@/lib/recruitment/job-content"

const toPlainText = (value?: string) => {
    if (!value) return ""
    return stripHtmlToText(value)
}

export default function PublicJobsPage() {
    const [jobs, setJobs] = useState<JobPosting[]>([])
    const [loading, setLoading] = useState(true)
    const [query, setQuery] = useState("")
    const [location, setLocation] = useState("")
    const [signedIn, setSignedIn] = useState(false)
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Inside smart_hr_web every visitor here is already signed in (workspace
    // layout enforces it). Hide the public Sign In / Create Account CTAs in
    // that case — they're meaningless and visually confusing.
    useEffect(() => {
        setSignedIn(apiClient.isAuthenticated())
    }, [])

    const runSearch = useCallback(async (q: string, loc: string) => {
        setLoading(true)
        try {
            const hasSearch = q.trim() || loc.trim()
            const response = hasSearch
                ? await apiClient.publicJobSearch(q.trim(), loc.trim() || null, 0, 40, "Open")
                : await apiClient.publicGetAllJobs(0, 40, "Open")
            setJobs(response.jobs || [])
        } catch {
            setJobs([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current)
        debounceTimer.current = setTimeout(() => {
            void runSearch(query, location)
        }, 400)
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current)
        }
    }, [query, location, runSearch])

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            <div className="border-b border-[#E5E5E5] bg-white">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                        <p className="text-sm text-[#1282A2] font-medium">RecrutAI</p>
                        <h1 className="text-[28px] font-bold text-[#034078]">Open Positions</h1>
                    </div>
                    {!signedIn && (
                        <div className="flex gap-2 flex-wrap">
                            <Link href="/login">
                                <Button variant="outline">Sign In</Button>
                            </Link>
                            <Link href="/register">
                                <Button>Create Account</Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
                <Card className="border-[#E5E5E5]">
                    <CardContent className="pt-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="md:col-span-2 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#525252] pointer-events-none" />
                                <Input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search job titles or keywords"
                                    className="pl-9 pr-9"
                                />
                                {loading && (query || location) ? (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#034078] animate-spin" />
                                ) : query ? (
                                    <button
                                        onClick={() => setQuery("")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#525252] hover:text-[#0A1128]"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                ) : null}
                            </div>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#525252] pointer-events-none" />
                                <Input
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="Location"
                                    className="pl-9 pr-9"
                                />
                                {location && (
                                    <button
                                        onClick={() => setLocation("")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#525252] hover:text-[#0A1128]"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="h-9 w-9 rounded-full border-2 border-[#034078] border-t-transparent animate-spin" />
                    </div>
                ) : jobs.length === 0 ? (
                    <Card className="border-dashed border-[#D4D4D4]">
                        <CardContent className="py-12 text-center text-sm text-[#525252]">
                            No open jobs found.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {jobs.map((job) => {
                            const descriptionPreview = toPlainText(job.job_description)

                            return (
                                <Card key={job.name} className="border-[#E5E5E5] hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="space-y-1">
                                                <CardTitle className="text-base text-[#0A1128] leading-snug">{job.job_title}</CardTitle>
                                                <div className="flex items-center gap-3 flex-wrap text-sm text-[#525252]">
                                                    {job.company && <span>{job.company}</span>}
                                                    {job.location && (
                                                        <span className="inline-flex items-center gap-1">
                                                            <MapPin className="h-3.5 w-3.5" />
                                                            {job.location}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <Badge className="bg-[#034078] text-white whitespace-nowrap">Open</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {descriptionPreview && (
                                            <p className="text-sm text-[#525252] line-clamp-3">{descriptionPreview}</p>
                                        )}
                                        <Link href={`/recruitment/jobs/${encodeURIComponent(job.name)}`}>
                                            <Button variant="outline" size="sm">
                                                View Details
                                                <ArrowRight className="h-4 w-4 ml-2" />
                                            </Button>
                                        </Link>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

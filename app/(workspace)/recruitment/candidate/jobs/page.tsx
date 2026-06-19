"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { MainLayout } from "@/components/recruitment/layout/main-layout"
import { apiClient } from "@/lib/recruitment/api-client"
import { getStoredUserEmail } from "@/lib/recruitment/role-routing"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    ArrowRight,
    Bookmark,
    BookmarkPlus,
    Briefcase,
    MapPin,
    RefreshCw,
    Search,
    Sparkles,
    Star,
} from "lucide-react"
import { toast } from "@/components/ui/sonner"
import type { CandidateSavedSearch, JobPosting } from "@/lib/recruitment/types"
import { extractSkillsFromDescription, splitSkills, stripHtmlToText } from "@/lib/recruitment/job-content"

const getCurrentUserEmail = () => {
    if (typeof window === "undefined") return ""
    return (
        getStoredUserEmail() ||
        ""
    )
}

const toPlainText = (value?: string) => {
    if (!value) return ""
    return stripHtmlToText(value)
}

const getSkillsList = (job: JobPosting): string[] => {
    const directSkills = splitSkills(job.required_skills)
    const inferredSkills = extractSkillsFromDescription(job.job_description)
    return directSkills.length > 0 ? directSkills : inferredSkills
}

function StatTile({
    icon: Icon,
    label,
    value,
    accent,
}: {
    icon: React.ComponentType<{ className?: string }>
    label: string
    value: string | number
    accent: string
}) {
    return (
        <div className="rounded-2xl border border-[#E5E5E5] bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]">
                {label}
            </p>
            <p className="mt-1 truncate text-2xl font-bold text-[#0A1128]">{value}</p>
        </div>
    )
}

function ScoreBadge({ score }: { score: number }) {
    const tone =
        score >= 70
            ? { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" }
            : score >= 40
                ? { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" }
                : { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" }
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone.bg} ${tone.text} ${tone.border}`}
        >
            <Star className="h-3 w-3 fill-current" />
            {score}% fit
        </span>
    )
}

function StatusPill({ status }: { status: string }) {
    const open = status?.toLowerCase() === "open"
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                open
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-[#F5F5F5] text-[#525252] border border-[#E5E5E5]"
            }`}
        >
            <span
                className={`h-1.5 w-1.5 rounded-full ${open ? "bg-emerald-500" : "bg-[#A3A3A3]"}`}
                aria-hidden="true"
            />
            {status || "—"}
        </span>
    )
}

function JobCard({
    job,
    showScore = true,
}: {
    job: JobPosting
    showScore?: boolean
}) {
    const skills = getSkillsList(job).slice(0, 4)
    const description = toPlainText(job.job_description)

    return (
        <Link
            href={`/recruitment/candidate/jobs/${encodeURIComponent(job.name)}`}
            className="group block"
        >
            <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 transition-all hover:border-[#034078]/30 hover:shadow-md">
                <div className="flex items-start gap-4">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <h3 className="text-base font-semibold leading-snug text-[#0A1128] group-hover:text-[#034078]">
                                {job.job_title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2">
                                {showScore && typeof job.job_match_score === "number" && (
                                    <ScoreBadge score={Math.round(job.job_match_score)} />
                                )}
                                <StatusPill status={job.status || ""} />
                            </div>
                        </div>
                        {description && (
                            <p className="mt-2 text-sm leading-relaxed text-[#525252] line-clamp-2">
                                {description}
                            </p>
                        )}
                        {skills.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {skills.map((skill) => (
                                    <span
                                        key={skill}
                                        className="inline-flex items-center rounded-full border border-[#E5E5E5] bg-[#F9FAFB] px-2 py-0.5 text-[11px] font-medium text-[#525252]"
                                    >
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        )}
                        <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#034078]">
                            View details
                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    )
}

function EmptyState({
    icon: Icon,
    title,
    description,
}: {
    icon: React.ComponentType<{ className?: string }>
    title: string
    description: string
}) {
    return (
        <div className="rounded-2xl border border-dashed border-[#E5E5E5] bg-white p-10 text-center">
            <span
                className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-[#A3A3A3]"
                style={{ background: "#F5F5F5" }}
                aria-hidden="true"
            >
                <Icon className="h-6 w-6" />
            </span>
            <p className="text-sm font-semibold text-[#0A1128]">{title}</p>
            <p className="mt-1 text-xs text-[#525252]">{description}</p>
        </div>
    )
}

export default function CandidateJobsPage() {
    const router = useRouter()
    const [query, setQuery] = useState("")
    const [location, setLocation] = useState("")
    const [jobs, setJobs] = useState<JobPosting[]>([])
    const [recommendedJobs, setRecommendedJobs] = useState<JobPosting[]>([])
    const [savedSearches, setSavedSearches] = useState<CandidateSavedSearch[]>([])
    const [loadingAllJobs, setLoadingAllJobs] = useState(false)
    const [loadingSearch, setLoadingSearch] = useState(false)
    const [loadingRecommendations, setLoadingRecommendations] = useState(false)
    const [loadingSaved, setLoadingSaved] = useState(false)
    const [savingSearch, setSavingSearch] = useState(false)

    const currentUser = useMemo(() => getCurrentUserEmail(), [])

    useEffect(() => {
        if (!apiClient.isAuthenticated()) {
            router.push("/login")
            return
        }

        loadAllJobs()
        loadRecommendations()
        loadSavedSearches()
    }, [router])

    const loadAllJobs = async () => {
        setLoadingAllJobs(true)
        try {
            const response = await apiClient.candidateGetAllJobs(0, 220, "Open")
            setJobs(response.jobs || [])
        } catch (error: any) {
            toast.error(error.message || "Failed to load available jobs")
        } finally {
            setLoadingAllJobs(false)
        }
    }

    const loadRecommendations = async () => {
        if (!currentUser) return

        setLoadingRecommendations(true)
        try {
            const response = await apiClient.candidateAiJobRecommendations(currentUser, 8)
            setRecommendedJobs(response.recommended_jobs || [])
        } catch (error: any) {
            toast.error(error.message || "Failed to load recommendations")
        } finally {
            setLoadingRecommendations(false)
        }
    }

    const loadSavedSearches = async () => {
        if (!currentUser) return

        setLoadingSaved(true)
        try {
            const response = await apiClient.candidateGetSavedSearches(currentUser)
            setSavedSearches(response.saved_searches || [])
        } catch (error: any) {
            toast.error(error.message || "Failed to load saved searches")
        } finally {
            setLoadingSaved(false)
        }
    }

    const handleSearch = async () => {
        if (!query.trim()) {
            toast.error("Enter a search query")
            return
        }

        setLoadingSearch(true)
        try {
            const response = await apiClient.candidateJobSearchAi(
                query.trim(),
                location.trim() || null,
                null,
                0,
                30,
            )
            setJobs(response.jobs || [])
        } catch (error: any) {
            toast.error(error.message || "Search failed")
        } finally {
            setLoadingSearch(false)
        }
    }

    const handleSaveSearch = async () => {
        if (!currentUser) {
            toast.error("User email not found. Please re-login.")
            return
        }

        if (!query.trim()) {
            toast.error("Enter a query before saving")
            return
        }

        setSavingSearch(true)
        try {
            await apiClient.candidateSaveSearch(currentUser, query.trim(), location.trim() || null, null)
            toast.success("Search saved")
            loadSavedSearches()
        } catch (error: any) {
            toast.error(error.message || "Failed to save search")
        } finally {
            setSavingSearch(false)
        }
    }

    const applySavedSearch = (saved: CandidateSavedSearch) => {
        setQuery(saved.query || "")
        setLocation(saved.location || "")
    }

    return (
        <MainLayout>
            <div className="mx-auto w-full max-w-7xl space-y-6">
                {/* Header */}
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#1282A2]">
                            Job search
                        </p>
                        <h1 className="mt-1 text-[28px] font-bold leading-tight text-[#0A1128]">
                            Find your next role
                        </h1>
                        <p className="mt-1 max-w-2xl text-sm text-[#525252]">
                            Browse open jobs, search using natural language, and review the roles our AI thinks fit you best.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            onClick={loadAllJobs}
                            disabled={loadingAllJobs}
                            className="border-[#E5E5E5] text-[#525252] hover:text-[#0A1128]"
                        >
                            <Briefcase className="mr-2 h-4 w-4" />
                            {loadingAllJobs ? "Loading…" : "Show all jobs"}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={loadRecommendations}
                            disabled={loadingRecommendations}
                            className="border-[#E5E5E5] text-[#525252] hover:text-[#0A1128]"
                        >
                            <RefreshCw
                                className={`mr-2 h-4 w-4 ${loadingRecommendations ? "animate-spin" : ""}`}
                            />
                            Refresh fits
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <StatTile
                        icon={Briefcase}
                        label="Available jobs"
                        value={jobs.length}
                        accent="#034078"
                    />
                    <StatTile
                        icon={Sparkles}
                        label="AI recommended"
                        value={recommendedJobs.length}
                        accent="#1282A2"
                    />
                    <StatTile
                        icon={Bookmark}
                        label="Saved searches"
                        value={savedSearches.length}
                        accent="#034078"
                    />
                </div>

                {/* Search */}
                <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-sm">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div className="relative md:col-span-2">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A3A3A3]" />
                            <Input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault()
                                        handleSearch()
                                    }
                                }}
                                placeholder="Search jobs in plain English (e.g. Senior HR role in manufacturing)"
                                className="pl-9 border-[#E5E5E5] focus:border-[#034078]"
                            />
                        </div>
                        <div className="relative">
                            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A3A3A3]" />
                            <Input
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="Location (optional)"
                                className="pl-9 border-[#E5E5E5] focus:border-[#034078]"
                            />
                        </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                            onClick={handleSearch}
                            disabled={loadingSearch}
                            className="bg-[#034078] text-white hover:bg-[#0A1128]"
                        >
                            {loadingSearch ? "Searching…" : "Search jobs"}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleSaveSearch}
                            disabled={savingSearch}
                            className="border-[#E5E5E5] text-[#525252] hover:text-[#0A1128]"
                        >
                            <BookmarkPlus className="mr-2 h-4 w-4" />
                            {savingSearch ? "Saving…" : "Save search"}
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="recommended" className="space-y-4">
                    <TabsList className="bg-[#F5F5F5]">
                        <TabsTrigger value="recommended" className="data-[state=active]:bg-white data-[state=active]:text-[#034078]">
                            Recommended
                        </TabsTrigger>
                        <TabsTrigger value="results" className="data-[state=active]:bg-white data-[state=active]:text-[#034078]">
                            All & search results
                        </TabsTrigger>
                        <TabsTrigger value="saved" className="data-[state=active]:bg-white data-[state=active]:text-[#034078]">
                            Saved searches
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="recommended" className="space-y-3">
                        {loadingRecommendations ? (
                            <EmptyState
                                icon={Sparkles}
                                title="Loading recommendations…"
                                description="Pulling roles tailored to your profile."
                            />
                        ) : recommendedJobs.length === 0 ? (
                            <EmptyState
                                icon={Sparkles}
                                title="No recommendations yet"
                                description="Add more details to your profile so we can match you to the right roles."
                            />
                        ) : (
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                {recommendedJobs.map((job) => (
                                    <JobCard key={job.name} job={job} />
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="results" className="space-y-3">
                        {loadingAllJobs || loadingSearch ? (
                            <EmptyState
                                icon={Briefcase}
                                title="Loading jobs…"
                                description="One moment while we fetch results."
                            />
                        ) : jobs.length === 0 ? (
                            <EmptyState
                                icon={Briefcase}
                                title="No jobs match"
                                description="Try a different search, location, or click Show all jobs."
                            />
                        ) : (
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                {jobs.map((job) => (
                                    <JobCard key={job.name} job={job} showScore={false} />
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="saved" className="space-y-3">
                        {loadingSaved ? (
                            <EmptyState
                                icon={Bookmark}
                                title="Loading saved searches…"
                                description="Pulling the queries you bookmarked."
                            />
                        ) : savedSearches.length === 0 ? (
                            <EmptyState
                                icon={Bookmark}
                                title="No saved searches yet"
                                description="Save a search to quickly re-run it later — your queries appear here."
                            />
                        ) : (
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {savedSearches.map((saved) => (
                                    <div
                                        key={saved.name}
                                        className="rounded-2xl border border-[#E5E5E5] bg-white p-5 transition-all hover:border-[#034078]/30 hover:shadow-sm"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-[#0A1128]">
                                                    {saved.query}
                                                </p>
                                                <p className="mt-0.5 flex items-center gap-1 text-xs text-[#525252]">
                                                    <MapPin className="h-3.5 w-3.5" />
                                                    {saved.location || "Any location"}
                                                </p>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => applySavedSearch(saved)}
                                                    className="mt-3 border-[#E5E5E5] text-[#525252] hover:text-[#0A1128]"
                                                >
                                                    <Search className="mr-1.5 h-3.5 w-3.5" />
                                                    Use this search
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </MainLayout>
    )
}

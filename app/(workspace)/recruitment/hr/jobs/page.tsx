"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { apiClient } from "@/lib/recruitment/api-client"
import { MainLayout } from "@/components/recruitment/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Search, Loader2, Briefcase, FileText, CircleDot, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { JobPosting } from "@/lib/recruitment/types"
import ConfirmDelete from "@/components/recruitment/common/ConfirmDelete"
import { toast } from "@/components/ui/sonner"

const TONE_OPTIONS = ["Professional", "Friendly", "Formal", "Direct", "Conversational"]

function JobsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const createFromURL = searchParams.get("create") === "1"

  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingJob, setEditingJob] = useState<JobPosting | null>(null)
  const [newJob, setNewJob] = useState({
    job_title: "",
    job_description: "",
    status: "Draft" as const,
    experience_min_years: "",
    education_required: "",
    required_skills: "",
  })
  const [generationIndustry, setGenerationIndustry] = useState("")
  const [generationTone, setGenerationTone] = useState("Professional")
  const [generatingDescription, setGeneratingDescription] = useState(false)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 5

  useEffect(() => {
    if (!apiClient.isAuthenticated()) {
      router.push("/login")
      return
    }

    const status = searchParams.get("status") || statusFilter
    if (status !== "all") setStatusFilter(status)
    loadJobs(status !== "all" ? status : undefined)

    if (createFromURL) {
      setCreateDialogOpen(true)
    }
  }, [router, searchParams])


  const loadJobs = async (status?: string) => {
    try {
      const result = await apiClient.getJobPostings(status)
      setJobs(result.data || [])
    } catch (error) {
      console.error("Failed to load jobs:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateJob = async () => {
    try {
      const response = await apiClient.createJobPosting({
        ...newJob,
        experience_min_years: newJob.experience_min_years
          ? parseInt(newJob.experience_min_years)
          : undefined,
      })

      // Extract the job name from the API response
      const jobName = response?.name;
      setCreateDialogOpen(false);
      setNewJob({
        job_title: "",
        job_description: "",
        status: "Draft",
        experience_min_years: "",
        education_required: "",
        required_skills: "",
      });
      setGenerationIndustry("")
      setGenerationTone("Professional")

      // Reload jobs
      loadJobs(statusFilter !== "all" ? statusFilter : undefined)

      // Redirect IF the API returned the expected name
      if (jobName) {
        router.push(`/recruitment/hr/jobs/${jobName}`)
      }

    } catch (error: any) {
      toast.error(error.message || "Failed to create job posting")
    }
  }

  const handleGenerateDescription = async () => {
    if (!newJob.job_title.trim() || !generationIndustry.trim() || !generationTone.trim()) {
      toast.error("Please enter job title, industry, and tone before generating")
      return
    }

    setGeneratingDescription(true)
    try {
      setNewJob((prev) => ({ ...prev, job_description: "" }))
      const response = await fetch("/api/ai/job-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: newJob.job_title,
          industry: generationIndustry,
          tone: generationTone,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate job description")
      }

      if (!response.body) {
        const text = await response.text()
        setNewJob((prev) => ({ ...prev, job_description: text }))
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ""

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        fullText += decoder.decode(value, { stream: true })
        setNewJob((prev) => ({ ...prev, job_description: fullText }))
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to generate job description")
    } finally {
      setGeneratingDescription(false)
    }
  }

  const handleEditJob = async () => {
    if (!editingJob) return
    try {
      await apiClient.updateJobPosting(editingJob.name, {
        job_title: editingJob.job_title,
        job_description: editingJob.job_description,
        status: editingJob.status,
        experience_min_years: editingJob.experience_min_years,
        education_required: editingJob.education_required,
        required_skills: editingJob.required_skills,
      })
      setEditDialogOpen(false)
      setEditingJob(null)
      toast.success("Job Posting Updated")
      loadJobs(statusFilter !== "all" ? statusFilter : undefined)
    } catch (error: any) {
      toast.error("Failed to update Job Posting")
    }
  }

  const handleDelete = async (name: string) => {
    if (!confirm("Are you sure you want to delete this job posting?")) return
    try {
      await apiClient.deleteJobPosting(name)
      loadJobs(statusFilter !== "all" ? statusFilter : undefined)
    } catch (error: any) {
      toast.error(error.message || "Failed to delete job posting")
    }
  }

  const openEditDialog = async (job: JobPosting) => {
    setEditingJob({ ...job })
    setEditDialogOpen(true)
    try {
      const jobData = await apiClient.getJobPosting(job.name)
      setEditingJob(jobData)
    } catch (error: any) {
      toast.error(error.message || "Failed to load job details")
    }
  }

  const STATUS_TONES: Record<string, { dot: string; bg: string; text: string; border: string }> = {
    Open: { dot: "#28C76F", bg: "#DCFCE7", text: "#166534", border: "#BBF7D0" },
    Filled: { dot: "#1282A2", bg: "#EFF6FF", text: "#034078", border: "#BFDBFE" },
    Draft: { dot: "#A3A3A3", bg: "#F5F5F5", text: "#525252", border: "#E5E5E5" },
    Closed: { dot: "#525252", bg: "#F5F5F5", text: "#171717", border: "#E5E5E5" },
  }

  const renderStatusPill = (status?: string | null) => {
    const tone = (status && STATUS_TONES[status]) || STATUS_TONES.Draft
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap"
        style={{ background: tone.bg, color: tone.text, border: `1px solid ${tone.border}` }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone.dot }} />
        {status || "Draft"}
      </span>
    )
  }

  const counts = {
    total: jobs.length,
    open: jobs.filter((j) => j.status === "Open").length,
    drafts: jobs.filter((j) => j.status === "Draft").length,
    filled: jobs.filter((j) => j.status === "Filled").length,
  }

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.job_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.job_description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || job.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * PAGE_SIZE
  const pagedJobs = filteredJobs.slice(pageStart, pageStart + PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [searchTerm, statusFilter])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pageWindow = (() => {
    const max = 5
    let from = Math.max(1, safePage - Math.floor(max / 2))
    const to = Math.min(totalPages, from + max - 1)
    if (to - from + 1 < max) from = Math.max(1, to - max + 1)
    const out: number[] = []
    for (let i = from; i <= to; i++) out.push(i)
    return out
  })()

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-40">
          <div className="w-9 h-9 rounded-full border-2 border-[#034078] border-t-transparent animate-spin" />
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">Recruitment</p>
            <h1 className="mt-1 text-3xl font-bold text-[#0A1128]">Job Postings</h1>
            <p className="mt-1 text-sm text-[#525252]">
              Open new roles, track applications, and run AI shortlisting from one place.
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="bg-[#034078] hover:bg-[#0A1128] text-white">
            New job
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total", value: counts.total, icon: Briefcase, fg: "#525252", bg: "#F5F5F5" },
            { label: "Open", value: counts.open, icon: CircleDot, fg: "#166534", bg: "#DCFCE7" },
            { label: "Drafts", value: counts.drafts, icon: FileText, fg: "#9A3412", bg: "#FFF7ED" },
            { label: "Filled", value: counts.filled, icon: CheckCircle2, fg: "#034078", bg: "#EFF6FF" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-[#E5E5E5] bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">{s.label}</p>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: s.bg, color: s.fg }}>
                  <s.icon className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-[#0A1128]">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A3A3A3]" />
            <Input
              placeholder="Search by title or description…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 border-[#E5E5E5] focus:border-[#034078]"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: "all", label: "All", count: counts.total },
              { key: "Open", label: "Open", count: counts.open },
              { key: "Draft", label: "Draft", count: counts.drafts },
              { key: "Filled", label: "Filled", count: counts.filled },
              { key: "Closed", label: "Closed", count: jobs.filter((j) => j.status === "Closed").length },
            ].map((opt) => {
              const active = statusFilter === opt.key
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    setStatusFilter(opt.key)
                    loadJobs(opt.key !== "all" ? opt.key : undefined)
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
                  style={
                    active
                      ? { background: "#034078", color: "#fff", borderColor: "#034078" }
                      : { background: "#fff", color: "#525252", borderColor: "#E5E5E5" }
                  }
                >
                  {opt.label}
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                    style={
                      active
                        ? { background: "rgba(255,255,255,0.2)", color: "#fff" }
                        : { background: "#F5F5F5", color: "#525252" }
                    }
                  >
                    {opt.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* List */}
        {filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#E5E5E5] bg-white px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#034078]">
              <Briefcase className="h-5 w-5" />
            </div>
            <p className="mt-1 text-sm font-semibold text-[#0A1128]">
              {jobs.length === 0 ? "No job postings yet" : "Nothing matches your filter"}
            </p>
            <p className="max-w-sm text-xs text-[#A3A3A3]">
              {jobs.length === 0
                ? "Create your first job posting to start collecting applications."
                : "Try a different status or clear your search."}
            </p>
            {jobs.length === 0 && (
              <Button onClick={() => setCreateDialogOpen(true)} className="mt-3 bg-[#034078] hover:bg-[#0A1128] text-white">
                New job
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white">
            <div className="hidden grid-cols-[2fr_160px_160px_180px] items-center gap-4 border-b border-[#E5E5E5] px-6 py-4 text-sm font-semibold text-[#0A1128] lg:grid">
              <div>Job title</div>
              <div>Status</div>
              <div>Applications</div>
              <div className="text-right">
                <span className="sr-only">Actions</span>
              </div>
            </div>
            <ul className="divide-y divide-[#F0F0F0]">
              {pagedJobs.map((job) => (
                <li
                  key={job.name}
                  className="grid grid-cols-1 gap-3 px-6 py-5 lg:grid-cols-[2fr_160px_160px_180px] lg:items-center lg:gap-4"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/recruitment/hr/jobs/${job.name}`}
                      aria-label={`Open ${job.job_title}`}
                      className="block truncate text-sm font-semibold text-[#0A1128] hover:text-[#034078]"
                    >
                      {job.job_title}
                    </Link>
                  </div>
                  <div className="text-sm">{renderStatusPill(job.status)}</div>
                  <div className="text-sm text-[#525252]">
                    {job.total_applications ?? 0}{" "}
                    {(job.total_applications ?? 0) === 1 ? "applicant" : "applicants"}
                  </div>
                  <div className="flex items-center gap-4 text-sm font-medium lg:justify-end">
                    <button
                      type="button"
                      onClick={() => openEditDialog(job)}
                      className="font-semibold text-[#034078] hover:text-[#0A1128]"
                    >
                      Edit
                      <span className="sr-only">, {job.job_title}</span>
                    </button>
                    <ConfirmDelete
                      trigger={
                        <button
                          type="button"
                          className="font-semibold text-red-600 hover:text-red-700"
                        >
                          Delete
                          <span className="sr-only">, {job.job_title}</span>
                        </button>
                      }
                      title="Delete Job Posting"
                      description="Are you sure you want to delete this Job Posting?"
                      onConfirm={async () => {
                        return await apiClient.deleteJobPosting(job.name)
                      }}
                      onAfterDelete={() => loadJobs(statusFilter !== "all" ? statusFilter : undefined)}
                    />
                    <Link
                      href={`/recruitment/hr/jobs/${job.name}`}
                      className="font-semibold text-[#034078] hover:text-[#0A1128]"
                    >
                      View
                      <span className="sr-only">, {job.job_title}</span>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-col items-center justify-between gap-3 border-t border-[#E5E5E5] bg-[#F9FAFB] px-5 py-3 sm:flex-row">
              <p className="text-xs text-[#A3A3A3]">
                Showing{" "}
                <span className="font-semibold text-[#171717]">{filteredJobs.length === 0 ? 0 : pageStart + 1}</span>
                {"–"}
                <span className="font-semibold text-[#171717]">
                  {Math.min(pageStart + PAGE_SIZE, filteredJobs.length)}
                </span>{" "}
                of <span className="font-semibold text-[#171717]">{filteredJobs.length}</span>
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#E5E5E5] bg-white px-2 text-xs font-medium text-[#525252] hover:bg-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  Prev
                </button>
                {pageWindow[0] > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setPage(1)}
                      className="h-8 w-8 rounded-lg border border-[#E5E5E5] bg-white text-xs font-medium text-[#525252] hover:bg-[#F5F5F5]"
                    >
                      1
                    </button>
                    {pageWindow[0] > 2 && <span className="px-1 text-xs text-[#A3A3A3]">…</span>}
                  </>
                )}
                {pageWindow.map((n) => {
                  const active = n === safePage
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className="h-8 w-8 rounded-lg border text-xs font-medium transition-colors"
                      style={
                        active
                          ? { background: "#034078", color: "#fff", borderColor: "#034078" }
                          : { background: "#fff", color: "#525252", borderColor: "#E5E5E5" }
                      }
                    >
                      {n}
                    </button>
                  )
                })}
                {pageWindow[pageWindow.length - 1] < totalPages && (
                  <>
                    {pageWindow[pageWindow.length - 1] < totalPages - 1 && (
                      <span className="px-1 text-xs text-[#A3A3A3]">…</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setPage(totalPages)}
                      className="h-8 w-8 rounded-lg border border-[#E5E5E5] bg-white text-xs font-medium text-[#525252] hover:bg-[#F5F5F5]"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#E5E5E5] bg-white px-2 text-xs font-medium text-[#525252] hover:bg-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Next page"
                >
                  Next
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#034078]">Create New Job Posting</DialogTitle>
            <DialogDescription className="text-[#525252]">
              Fill in the details for the new job posting
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="job_title" className="text-[#0A1128]">Job Title *</Label>
              <Input
                id="job_title"
                value={newJob.job_title}
                onChange={(e) =>
                  setNewJob({ ...newJob, job_title: e.target.value })
                }
                placeholder="e.g., Senior Software Engineer"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="industry" className="text-[#0A1128]">Industry *</Label>
                <Input
                  id="industry"
                  value={generationIndustry}
                  onChange={(e) => setGenerationIndustry(e.target.value)}
                  placeholder="e.g., Fintech, Healthcare, Education"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tone" className="text-[#0A1128]">Tone *</Label>
                <Select value={generationTone} onValueChange={setGenerationTone}>
                  <SelectTrigger id="tone">
                    <SelectValue placeholder="Select tone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TONE_OPTIONS.map((tone) => (
                      <SelectItem key={tone} value={tone}>
                        {tone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="job_description" className="text-[#0A1128]">Job Description</Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateDescription}
                  disabled={generatingDescription}
                >
                  {generatingDescription ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate with AI"
                  )}
                </Button>
              </div>
              <RichTextEditor
                value={newJob.job_description}
                onChange={(value) =>
                  setNewJob({ ...newJob, job_description: value })
                }
                placeholder="Describe the role, responsibilities, and requirements..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="experience" className="text-[#0A1128]">Min. Experience (Years)</Label>
                <Input
                  id="experience"
                  type="number"
                  value={newJob.experience_min_years}
                  onChange={(e) =>
                    setNewJob({ ...newJob, experience_min_years: e.target.value })
                  }
                  placeholder="5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status" className="text-[#0A1128]">Status</Label>
                <Select
                  value={newJob.status}
                  onValueChange={(value: any) =>
                    setNewJob({ ...newJob, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="education" className="text-[#0A1128]">Education Required</Label>
              <RichTextEditor
                value={newJob.education_required}
                onChange={(value) =>
                  setNewJob({ ...newJob, education_required: value })
                }
                placeholder="e.g., Bachelor's degree in Computer Science"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skills" className="text-[#0A1128]">Required Skills</Label>
              <RichTextEditor
                value={newJob.required_skills}
                onChange={(value) =>
                  setNewJob({ ...newJob, required_skills: value })
                }
                placeholder="e.g., Python, React, PostgreSQL"
              />
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateJob}>Create Job Posting</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#034078]">Edit Job Posting</DialogTitle>
            <DialogDescription className="text-[#525252]">
              Update the details for this job posting
            </DialogDescription>
          </DialogHeader>
          {editingJob && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit_job_title" className="text-[#0A1128]">Job Title *</Label>
                <Input
                  id="edit_job_title"
                  value={editingJob.job_title}
                  onChange={(e) =>
                    setEditingJob({ ...editingJob, job_title: e.target.value })
                  }
                  placeholder="e.g., Senior Software Engineer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_job_description" className="text-[#0A1128]">Job Description</Label>
                <RichTextEditor
                  value={editingJob.job_description || ""}
                  onChange={(value) =>
                    setEditingJob({ ...editingJob, job_description: value })
                  }
                  placeholder="Describe the role, responsibilities, and requirements..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_experience" className="text-[#0A1128]">Min. Experience (Years)</Label>
                  <Input
                    id="edit_experience"
                    type="number"
                    value={editingJob.experience_min_years || ""}
                    onChange={(e) =>
                      setEditingJob({
                        ...editingJob,
                        experience_min_years: e.target.value ? parseInt(e.target.value) : undefined
                      })
                    }
                    placeholder="5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_status" className="text-[#0A1128]">Status</Label>
                  <Select
                    value={editingJob.status}
                    onValueChange={(value: any) =>
                      setEditingJob({ ...editingJob, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Open">Open</SelectItem>
                      <SelectItem value="Closed">Closed</SelectItem>
                      <SelectItem value="Filled">Filled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_education" className="text-[#0A1128]">Education Required</Label>
                <RichTextEditor
                  value={editingJob.education_required || ""}
                  onChange={(value) =>
                    setEditingJob({ ...editingJob, education_required: value })
                  }
                  placeholder="e.g., Bachelor's degree in Computer Science"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_skills" className="text-[#0A1128]">Required Skills</Label>
                <RichTextEditor
                  value={editingJob.required_skills || ""}
                  onChange={(value) =>
                    setEditingJob({ ...editingJob, required_skills: value })
                  }
                  placeholder="e.g., Python, React, PostgreSQL"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditJob}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  )
}

export default function HrJobsPage() {
  return (
    <Suspense fallback={
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-[80px] w-[80px] border-b-2 border-[#034078]"></div>
        </div>
      </MainLayout>
    }>
      <JobsPageContent />
    </Suspense>
  )
}
"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import Swal from "sweetalert2"
import { apiClient } from "@/lib/recruitment/api-client"
import { getStoredUserEmail } from "@/lib/recruitment/role-routing"
import { MainLayout } from "@/components/recruitment/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import type { JobPosting } from "@/lib/recruitment/types"
import {
    AlertCircle,
    ArrowLeft,
    Briefcase,
    CheckCircle2,
    FileText,
    Loader2,
    Lock,
    Trash2,
    Upload,
    XCircle,
} from "lucide-react"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`
}

const MAX_BYTES_PER_FILE = 10 * 1024 * 1024 // 10 MB

type FileState = {
    status: "pending" | "uploading" | "success" | "failed"
    progress: number
    error?: string
}

function UploadCVContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [jobs, setJobs] = useState<JobPosting[]>([])
    const [selectedJob, setSelectedJob] = useState("")
    const [files, setFiles] = useState<File[]>([])
    const [fileStates, setFileStates] = useState<FileState[]>([])
    const [uploading, setUploading] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement | null>(null)

    const jobLocked = !!searchParams.get("job")

    useEffect(() => {
        if (!apiClient.isAuthenticated()) {
            router.push("/login")
            return
        }
        const jobFromUrl = searchParams.get("job")
        if (jobFromUrl) setSelectedJob(jobFromUrl)
        loadJobs()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router, searchParams])

    const loadJobs = async () => {
        try {
            const result = await apiClient.getJobPostings("Open")
            setJobs(result.data || [])
        } catch (error) {
            console.error("Failed to load jobs:", error)
        }
    }

    const selectedJobMeta = useMemo(
        () => jobs.find((j) => j.name === selectedJob),
        [jobs, selectedJob]
    )

    const totalBytes = useMemo(() => files.reduce((s, f) => s + f.size, 0), [files])
    const oversized = files.filter((f) => f.size > MAX_BYTES_PER_FILE)

    const setStateAt = (idx: number, patch: Partial<FileState>) =>
        setFileStates((prev) => prev.map((fs, i) => (i === idx ? { ...fs, ...patch } : fs)))

    const ingestFiles = (selected: FileList | File[] | null) => {
        if (!selected) return
        const next = Array.from(selected).filter((f) => /\.pdf$/i.test(f.name))
        if (next.length === 0) {
            Swal.fire({
                icon: "warning",
                title: "PDF only",
                text: "We only accept .pdf files for CV upload.",
                confirmButtonText: "OK",
            })
            return
        }
        // Append (don't replace) so the user can drag from multiple folders.
        setFiles((prev) => {
            const existing = new Set(prev.map((f) => `${f.name}:${f.size}`))
            const merged = [...prev]
            for (const f of next) {
                const key = `${f.name}:${f.size}`
                if (!existing.has(key)) {
                    existing.add(key)
                    merged.push(f)
                }
            }
            return merged
        })
        setFileStates((prev) => {
            const existing = new Set(files.map((f) => `${f.name}:${f.size}`))
            const additions: FileState[] = []
            for (const f of next) {
                const key = `${f.name}:${f.size}`
                if (!existing.has(key)) {
                    existing.add(key)
                    additions.push({ status: "pending", progress: 0 })
                }
            }
            return [...prev, ...additions]
        })
    }

    const removeFile = (idx: number) => {
        if (uploading) return
        setFiles((prev) => prev.filter((_, i) => i !== idx))
        setFileStates((prev) => prev.filter((_, i) => i !== idx))
    }

    const clearAll = () => {
        if (uploading) return
        setFiles([])
        setFileStates([])
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault()
        setIsDragging(false)
        ingestFiles(e.dataTransfer.files)
    }
    const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault()
        setIsDragging(true)
    }
    const handleDragLeave = () => setIsDragging(false)

    const handleUpload = async () => {
        if (!selectedJob || files.length === 0) {
            Swal.fire({
                icon: "warning",
                title: "Almost there",
                text: "Pick a job posting and add at least one CV before uploading.",
                confirmButtonText: "OK",
            })
            return
        }
        if (oversized.length > 0) {
            Swal.fire({
                icon: "warning",
                title: "File too large",
                text: `${oversized.length} file${oversized.length === 1 ? " is" : "s are"} over 10 MB. Remove or replace before uploading.`,
                confirmButtonText: "OK",
            })
            return
        }

        setUploading(true)
        // Reset all to pending.
        setFileStates((prev) => prev.map(() => ({ status: "pending", progress: 0 })))

        const results: { fileName: string; success: boolean; error?: string }[] = []
        for (let i = 0; i < files.length; i++) {
            const file = files[i]
            setStateAt(i, { status: "uploading", progress: 0 })
            try {
                const response = await uploadCVWithProgress(selectedJob, file, (p) =>
                    setStateAt(i, { status: "uploading", progress: p })
                )
                if (response?.success) {
                    setStateAt(i, { status: "success", progress: 100 })
                    results.push({ fileName: file.name, success: true })
                } else {
                    const err = response?.message || "Upload failed"
                    setStateAt(i, { status: "failed", progress: 0, error: err })
                    results.push({ fileName: file.name, success: false, error: err })
                }
            } catch (err: any) {
                const msg = err?.message || String(err)
                setStateAt(i, { status: "failed", progress: 0, error: msg })
                results.push({ fileName: file.name, success: false, error: msg })
            }
        }

        setUploading(false)

        const successCount = results.filter((r) => r.success).length
        const failCount = results.length - successCount
        const failDetails = results
            .filter((r) => !r.success)
            .map((r) => `${r.fileName}: ${r.error}`)
            .join("\n")

        Swal.fire({
            icon: failCount === 0 ? "success" : "warning",
            title: "Upload complete",
            html: `<p>${successCount} ${successCount === 1 ? "file" : "files"} uploaded successfully. The AI will score CVs and notify you by email when shortlisting is done.</p>${failCount > 0 ? `<p style="margin-top:8px;color:#9A3412">${failCount} failed:</p><pre style="text-align:left;font-size:12px;background:#FEF2F2;padding:8px;border-radius:6px;white-space:pre-wrap;">${failDetails}</pre>` : ""}`,
            width: 600,
        })

        if (successCount > 0) router.push(`/recruitment/hr/jobs/${selectedJob}`)
    }

    const uploadCVWithProgress = async (
        job_posting: string,
        file: File,
        onProgress: (progress: number) => void
    ): Promise<{ success: boolean; message?: string }> => {
        const createRes = await apiClient.apiCall<{ name: string }>(
            "recruitment_app.api.candidate_applications.upload_cv",
            { job_posting }
        )
        const appName = createRes.name
        if (!appName) throw new Error("Failed to create candidate application")

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest()
            const uploadData = new FormData()
            uploadData.append("file", file)
            uploadData.append("attached_to_doctype", "Candidate Application")
            uploadData.append("attached_to_name", appName)
            uploadData.append("attached_to_field", "cv_attachment")
            uploadData.append("is_private", "0")
            const user = getStoredUserEmail()
            if (user) uploadData.append("user", user)

            xhr.upload.addEventListener("progress", (event) => {
                if (event.lengthComputable) {
                    const percentComplete = Math.round((event.loaded / event.total) * 100)
                    onProgress(percentComplete)
                }
            })

            xhr.addEventListener("load", async () => {
                if (xhr.status === 200) {
                    try {
                        const uploadResult = JSON.parse(xhr.responseText)
                        const file_url = uploadResult.file_url
                        if (!file_url) {
                            reject(new Error("File upload failed (no file_url returned)"))
                            return
                        }
                        await apiClient.apiCall("frappe.client.set_value", {
                            doctype: "Candidate Application",
                            name: appName,
                            fieldname: "cv_attachment",
                            value: file_url,
                        })
                        resolve({ success: true })
                    } catch {
                        reject(new Error("Failed to process upload response"))
                    }
                } else {
                    reject(new Error(`Upload failed with status ${xhr.status}`))
                }
            })
            xhr.addEventListener("error", () => reject(new Error("Network error during upload")))
            xhr.open("PUT", "/api/frappe/upload_file")
            xhr.send(uploadData)
        })
    }

    const successCount = fileStates.filter((s) => s.status === "success").length
    const overallProgress = files.length === 0 ? 0 : Math.round((successCount / files.length) * 100)

    return (
        <MainLayout>
            <div className="mx-auto max-w-3xl space-y-4 pb-12">
                {/* Top bar + title in a single compact header */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <Link
                            href={selectedJob ? `/recruitment/jobs/${selectedJob}` : "/recruitment/jobs"}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#034078] hover:underline"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            {selectedJob ? "Job posting" : "Job postings"}
                        </Link>
                        <h1 className="mt-1 text-2xl font-bold text-[#0A1128]">Upload CVs</h1>
                        <p className="mt-0.5 text-sm text-[#525252]">
                            Drop PDFs and the AI will rank candidates against the job&apos;s requirements.
                        </p>
                    </div>
                </div>

                {/* Job posting — compact single row */}
                <section className="rounded-xl border border-[#E5E5E5] bg-white p-3 shadow-sm">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#034078]">
                            <Briefcase className="h-4 w-4" />
                        </span>
                        <Label
                            htmlFor="job-posting"
                            className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]"
                        >
                            Apply to
                        </Label>
                        <div className="min-w-0 flex-1">
                            <Select value={selectedJob} onValueChange={setSelectedJob} disabled={jobLocked}>
                                <SelectTrigger id="job-posting" className="h-9 border-[#E5E5E5] focus:border-[#034078]">
                                    <SelectValue placeholder="Select a job posting" />
                                </SelectTrigger>
                                <SelectContent>
                                    {jobs.map((job) => (
                                        <SelectItem key={job.name} value={job.name}>
                                            {job.job_title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {jobLocked && (
                            <span
                                className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
                                style={{ background: "#F5F5F5", color: "#525252", border: "1px solid #E5E5E5" }}
                            >
                                <Lock className="h-3 w-3" /> Locked
                            </span>
                        )}
                    </div>
                    {jobLocked && selectedJobMeta && (
                        <p className="ml-11 mt-1.5 text-[11px] text-[#A3A3A3]">
                            Pre-selected from URL —{" "}
                            <span className="font-medium text-[#525252]">{selectedJobMeta.job_title}</span>
                        </p>
                    )}
                </section>

                {/* Dropzone — compact */}
                <label
                    htmlFor="cv-file"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-8 transition-all"
                    style={
                        isDragging
                            ? { borderColor: "#034078", background: "#EFF6FF" }
                            : { borderColor: "#E5E5E5", background: "#fff" }
                    }
                >
                    <span
                        className="flex h-10 w-10 items-center justify-center rounded-xl"
                        style={{
                            background: isDragging ? "#034078" : "#EFF6FF",
                            color: isDragging ? "#fff" : "#034078",
                        }}
                    >
                        <Upload className="h-5 w-5" />
                    </span>
                    <p className="mt-2 text-sm font-semibold text-[#0A1128]">
                        {isDragging ? "Drop to add files" : "Drag & drop CVs here"}
                    </p>
                    <p className="mt-0.5 text-xs text-[#525252]">
                        or <span className="font-medium text-[#034078]">click to browse</span> · PDF only · 10 MB max each
                    </p>
                    <input
                        ref={fileInputRef}
                        id="cv-file"
                        type="file"
                        className="hidden"
                        accept=".pdf,application/pdf"
                        multiple
                        onChange={(e) => ingestFiles(e.target.files)}
                        disabled={uploading}
                    />
                </label>

                {/* File list */}
                {files.length > 0 && (
                    <section className="rounded-xl border border-[#E5E5E5] bg-white shadow-sm overflow-hidden">
                        <header className="flex items-center justify-between border-b border-[#E5E5E5] px-4 py-2.5">
                            <div className="min-w-0">
                                <h2 className="text-xs font-semibold text-[#0A1128]">
                                    Files ready
                                    <span className="ml-1.5 font-normal text-[#A3A3A3]">
                                        {files.length} · {formatBytes(totalBytes)}
                                    </span>
                                </h2>
                                {oversized.length > 0 && (
                                    <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-red-600">
                                        <AlertCircle className="h-3 w-3" />
                                        {oversized.length} file{oversized.length === 1 ? "" : "s"} over 10 MB
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={clearAll}
                                disabled={uploading}
                                className="text-xs font-medium text-[#525252] hover:text-red-600 disabled:opacity-40"
                            >
                                Clear all
                            </button>
                        </header>
                        <ul className="max-h-[40vh] divide-y divide-[#F0F0F0] overflow-y-auto">
                            {files.map((file, idx) => {
                                const state = fileStates[idx] || { status: "pending", progress: 0 }
                                const isOversized = file.size > MAX_BYTES_PER_FILE
                                return (
                                    <li key={`${file.name}-${file.size}-${idx}`} className="flex items-center gap-2.5 px-4 py-2">
                                        <span
                                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                                            style={{
                                                background:
                                                    state.status === "success"
                                                        ? "#DCFCE7"
                                                        : state.status === "failed"
                                                            ? "#FEF2F2"
                                                            : state.status === "uploading"
                                                                ? "#EFF6FF"
                                                                : "#F5F5F5",
                                                color:
                                                    state.status === "success"
                                                        ? "#166534"
                                                        : state.status === "failed"
                                                            ? "#991B1B"
                                                            : state.status === "uploading"
                                                                ? "#034078"
                                                                : "#525252",
                                            }}
                                        >
                                            {state.status === "success" ? (
                                                <CheckCircle2 className="h-4 w-4" />
                                            ) : state.status === "failed" ? (
                                                <XCircle className="h-4 w-4" />
                                            ) : state.status === "uploading" ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <FileText className="h-4 w-4" />
                                            )}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline justify-between gap-3">
                                                <p className="truncate text-sm font-medium text-[#0A1128]">{file.name}</p>
                                                <span
                                                    className={`text-xs tabular-nums ${isOversized ? "font-semibold text-red-600" : "text-[#A3A3A3]"
                                                        }`}
                                                >
                                                    {formatBytes(file.size)}
                                                </span>
                                            </div>
                                            {state.status === "uploading" && (
                                                <div className="mt-1.5">
                                                    <div className="h-1 overflow-hidden rounded-full bg-[#F0F0F0]">
                                                        <div
                                                            className="h-full rounded-full bg-[#034078] transition-[width]"
                                                            style={{ width: `${state.progress}%` }}
                                                        />
                                                    </div>
                                                    <p className="mt-1 text-[10px] text-[#A3A3A3]">{state.progress}%</p>
                                                </div>
                                            )}
                                            {state.status === "failed" && state.error && (
                                                <p className="mt-1 text-[11px] text-red-600">{state.error}</p>
                                            )}
                                            {state.status === "success" && (
                                                <p className="mt-1 text-[11px] text-emerald-600">Uploaded</p>
                                            )}
                                            {state.status === "pending" && isOversized && (
                                                <p className="mt-1 text-[11px] text-red-600">
                                                    Exceeds 10 MB — please remove or replace.
                                                </p>
                                            )}
                                        </div>
                                        {!uploading && state.status !== "success" && (
                                            <button
                                                type="button"
                                                onClick={() => removeFile(idx)}
                                                aria-label={`Remove ${file.name}`}
                                                className="flex-shrink-0 rounded-lg p-1.5 text-[#A3A3A3] transition-colors hover:bg-red-50 hover:text-red-600"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </li>
                                )
                            })}
                        </ul>
                        {uploading && (
                            <div className="border-t border-[#E5E5E5] bg-[#F9FAFB] px-4 py-2">
                                <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-[#525252]">
                                        Overall —{" "}
                                        <span className="font-semibold text-[#0A1128]">
                                            {successCount} / {files.length}
                                        </span>
                                    </span>
                                    <span className="font-semibold tabular-nums text-[#0A1128]">
                                        {overallProgress}%
                                    </span>
                                </div>
                                <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#E5E5E5]">
                                    <div
                                        className="h-full rounded-full transition-[width]"
                                        style={{ width: `${overallProgress}%`, background: "#034078" }}
                                    />
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* CTA */}
                <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-[#A3A3A3]">
                        {files.length === 0
                            ? "Add at least one PDF to begin."
                            : `Ready to upload ${files.length} file${files.length === 1 ? "" : "s"} (${formatBytes(totalBytes)}).`}
                    </p>
                    <Button
                        onClick={handleUpload}
                        disabled={!selectedJob || files.length === 0 || uploading || oversized.length > 0}
                        className="bg-[#034078] hover:bg-[#0A1128] text-white"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                Uploading…
                            </>
                        ) : (
                            <>
                                <Upload className="mr-1.5 h-4 w-4" />
                                Upload {files.length > 0 ? `${files.length} CV${files.length === 1 ? "" : "s"}` : "CVs"}
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </MainLayout>
    )
}

export default function UploadCVPage() {
    return (
        <Suspense
            fallback={
                <MainLayout>
                    <div className="flex h-64 items-center justify-center">
                        <div className="h-9 w-9 rounded-full border-2 border-[#034078] border-t-transparent animate-spin" />
                    </div>
                </MainLayout>
            }
        >
            <UploadCVContent />
        </Suspense>
    )
}

"use client"

import { useParams } from "next/navigation"
import PublicJobDetailPage from "@/components/recruitment/jobs/public-job-detail-page"

export default function JobDetailPage() {
    const params = useParams()
    const jobId = params.id as string
    return <PublicJobDetailPage jobId={decodeURIComponent(jobId)} />
}

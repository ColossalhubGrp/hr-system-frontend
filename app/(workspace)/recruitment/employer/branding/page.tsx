"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/recruitment/layout/main-layout"
import { apiClient } from "@/lib/recruitment/api-client"
import { getStoredUserEmail } from "@/lib/recruitment/role-routing"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/sonner"
import { BarChart3, Sparkles } from "lucide-react"

export default function EmployerBrandingPage() {
    const router = useRouter()
    const userEmail = useMemo(() => getStoredUserEmail(), [])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [brandingStory, setBrandingStory] = useState("")
    const [brandingData, setBrandingData] = useState<any>(null)
    const [analyticsData, setAnalyticsData] = useState<any>(null)

    useEffect(() => {
        if (!apiClient.isAuthenticated()) {
            router.push("/login")
            return
        }

        loadBrandingAndAnalytics()
    }, [router])

    const loadBrandingAndAnalytics = async () => {
        if (!userEmail) {
            setLoading(false)
            return
        }

        try {
            const [branding, analytics, profile] = await Promise.all([
                apiClient.getEmployerBranding(userEmail),
                apiClient.getEmployerAnalytics(userEmail),
                apiClient.getEmployerProfile(userEmail),
            ])

            setBrandingData(branding)
            setAnalyticsData(analytics)
            setBrandingStory(branding?.branding_story || profile?.branding_story || "")
        } catch (error: any) {
            toast.error(error.message || "Failed to load branding and analytics")
        } finally {
            setLoading(false)
        }
    }

    const handleSaveBranding = async () => {
        if (!userEmail) {
            toast.error("User email not found. Please login again.")
            return
        }

        setSaving(true)
        try {
            await apiClient.updateEmployerProfile({
                user: userEmail,
                branding_story: brandingStory,
            })
            toast.success("Branding story updated")
            loadBrandingAndAnalytics()
        } catch (error: any) {
            toast.error(error.message || "Failed to update branding story")
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <MainLayout>
                <div className="flex h-64 items-center justify-center">
                    <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#034078] border-t-transparent" />
                </div>
            </MainLayout>
        )
    }

    return (
        <MainLayout>
            <div className="mx-auto w-full max-w-6xl space-y-6">
                {/* Header */}
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#1282A2]">
                            Brand
                        </p>
                        <h1 className="mt-1 text-[28px] font-bold leading-tight text-[#0A1128]">
                            Branding & analytics
                        </h1>
                        <p className="mt-1 max-w-2xl text-sm text-[#525252]">
                            Tell candidates who you are and watch how your employer brand performs.
                        </p>
                    </div>
                </div>

                {/* Brand story */}
                <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5">
                    <div className="flex items-center gap-2">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]">
                                Brand story
                            </p>
                            <p className="text-base font-semibold text-[#0A1128]">
                                Your employer narrative
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 space-y-1.5">
                        <Label
                            htmlFor="branding_story"
                            className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]"
                        >
                            Branding story
                        </Label>
                        <Textarea
                            id="branding_story"
                            value={brandingStory}
                            onChange={(e) => setBrandingStory(e.target.value)}
                            placeholder="Share your employer value proposition and culture story"
                            className="min-h-[180px] border-[#E5E5E5] focus:border-[#034078]"
                        />
                    </div>
                    <Button
                        onClick={handleSaveBranding}
                        disabled={saving}
                        className="mt-4 bg-[#034078] text-white hover:bg-[#0A1128]"
                    >
                        {saving ? "Saving…" : "Save brand story"}
                    </Button>
                </div>

                {/* Payloads */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5">
                        <div className="flex items-center gap-2">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]">
                                    Endpoint
                                </p>
                                <p className="text-base font-semibold text-[#0A1128]">Branding payload</p>
                            </div>
                        </div>
                        <pre className="mt-4 max-h-[420px] overflow-auto rounded-xl border border-[#E5E5E5] bg-[#F9FAFB] p-3 text-xs text-[#171717]">
                            {JSON.stringify(brandingData, null, 2)}
                        </pre>
                    </div>

                    <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5">
                        <div className="flex items-center gap-2">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]">
                                    Endpoint
                                </p>
                                <p className="text-base font-semibold text-[#0A1128]">Analytics payload</p>
                            </div>
                        </div>
                        <pre className="mt-4 max-h-[420px] overflow-auto rounded-xl border border-[#E5E5E5] bg-[#F9FAFB] p-3 text-xs text-[#171717]">
                            {JSON.stringify(analyticsData, null, 2)}
                        </pre>
                    </div>
                </div>
            </div>
        </MainLayout>
    )
}

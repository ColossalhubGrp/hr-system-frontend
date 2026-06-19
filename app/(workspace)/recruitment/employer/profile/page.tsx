"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/recruitment/layout/main-layout"
import { apiClient } from "@/lib/recruitment/api-client"
import { getStoredUserEmail } from "@/lib/recruitment/role-routing"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/sonner"
import { Building2, Sparkles } from "lucide-react"

export default function EmployerProfilePage() {
    const router = useRouter()
    const userEmail = useMemo(() => getStoredUserEmail(), [])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({
        company_name: "",
        description: "",
        branding_story: "",
    })

    useEffect(() => {
        if (!apiClient.isAuthenticated()) {
            router.push("/login")
            return
        }

        loadProfile()
    }, [router])

    const loadProfile = async () => {
        if (!userEmail) {
            setLoading(false)
            return
        }

        try {
            const profile = await apiClient.getEmployerProfile(userEmail)
            setForm({
                company_name: profile?.company_name || "",
                description: profile?.description || "",
                branding_story: profile?.branding_story || "",
            })
        } catch (error: any) {
            toast.error(error.message || "Failed to load employer profile")
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!userEmail) {
            toast.error("User email not found. Please login again.")
            return
        }

        setSaving(true)
        try {
            await apiClient.updateEmployerProfile({
                user: userEmail,
                company_name: form.company_name,
                description: form.description,
                branding_story: form.branding_story,
            })
            toast.success("Employer profile updated")
        } catch (error: any) {
            toast.error(error.message || "Failed to update employer profile")
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
            <div className="mx-auto w-full max-w-4xl space-y-6">
                {/* Hero */}
                <div className="rounded-2xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3]">
                                Employer
                            </p>
                            <h1 className="mt-1 text-2xl font-bold leading-tight text-[#0A1128]">
                                {form.company_name || "Company profile"}
                            </h1>
                            <p className="mt-1 max-w-xl text-sm text-[#525252]">
                                Polish what candidates see — a strong profile attracts stronger applicants.
                            </p>
                        </div>
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-[#034078] text-white hover:bg-[#0A1128]"
                        >
                            {saving ? "Saving…" : "Save profile"}
                        </Button>
                    </div>
                </div>

                {/* Profile fields */}
                <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]">
                        Company details
                    </p>
                    <p className="mt-0.5 text-base font-semibold text-[#0A1128]">
                        Public-facing information
                    </p>

                    <div className="mt-4 space-y-4">
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="user_email"
                                className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]"
                            >
                                Account email
                            </Label>
                            <Input
                                id="user_email"
                                value={userEmail}
                                disabled
                                className="border-[#E5E5E5] bg-[#F9FAFB]"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label
                                htmlFor="company_name"
                                className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]"
                            >
                                Company name
                            </Label>
                            <Input
                                id="company_name"
                                value={form.company_name}
                                onChange={(e) =>
                                    setForm((prev) => ({ ...prev, company_name: e.target.value }))
                                }
                                placeholder="Your company name"
                                className="border-[#E5E5E5] focus:border-[#034078]"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label
                                htmlFor="description"
                                className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]"
                            >
                                Company description
                            </Label>
                            <Textarea
                                id="description"
                                value={form.description}
                                onChange={(e) =>
                                    setForm((prev) => ({ ...prev, description: e.target.value }))
                                }
                                placeholder="Describe your company and culture"
                                className="min-h-[120px] border-[#E5E5E5] focus:border-[#034078]"
                            />
                            <p className="text-[11px] text-[#A3A3A3]">
                                A few sentences on what your company does and what makes it special.
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <Label
                                htmlFor="branding_story"
                                className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]"
                            >
                                <Sparkles className="h-3 w-3 text-[#1282A2]" />
                                Brand story
                            </Label>
                            <Textarea
                                id="branding_story"
                                value={form.branding_story}
                                onChange={(e) =>
                                    setForm((prev) => ({ ...prev, branding_story: e.target.value }))
                                }
                                placeholder="Share your employer branding story — values, mission, team energy."
                                className="min-h-[140px] border-[#E5E5E5] focus:border-[#034078]"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    )
}

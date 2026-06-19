"use client"

import Image from "next/image"
import {
    BarChart3,
    Brain,
    Briefcase,
    Lock,
    Sparkles,
    Video,
} from "lucide-react"

interface MarketingFeature {
    icon: React.ComponentType<{ className?: string }>
    label: string
    desc: string
}

const DEFAULT_FEATURES: MarketingFeature[] = [
    { icon: Briefcase, label: "Smart job posting", desc: "Create and publish openings in minutes from one dashboard." },
    { icon: Sparkles, label: "AI shortlisting", desc: "Surface the most relevant applicants for any role automatically." },
    { icon: Video, label: "Video interviews", desc: "Run structured interviews and review them with AI-generated scores." },
    { icon: BarChart3, label: "Real-time analytics", desc: "Track every stage of your hiring funnel with live data." },
]

interface AuthShellProps {
    title: React.ReactNode
    subtitle?: string
    features?: MarketingFeature[]
    children: React.ReactNode
}

/**
 * Shared split-screen layout for sign-in / sign-up / forgot-password.
 * Left: brand + marketing panel (hidden on mobile).
 * Right: form area (children).
 */
export function AuthShell({ title, subtitle, features = DEFAULT_FEATURES, children }: AuthShellProps) {
    return (
        <div className="flex min-h-screen flex-col md:flex-row">
            {/* Left — brand panel */}
            <div
                className="relative hidden w-1/2 flex-col justify-between overflow-hidden p-12 text-white md:flex"
                style={{ background: "#034078" }}
            >
                {/* Decorative blobs */}
                <div
                    className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-30 blur-3xl"
                    style={{ background: "#1282A2" }}
                    aria-hidden="true"
                />
                <div
                    className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full opacity-20 blur-3xl"
                    style={{ background: "#28C76F" }}
                    aria-hidden="true"
                />

                <div className="relative">
                    <div className="mb-12 flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white">
                            <Image
                                src="/favicon-32x32.png"
                                alt=""
                                width={32}
                                height={32}
                                className="h-7 w-7 object-contain"
                                priority
                            />
                        </div>
                        <p className="text-sm font-semibold uppercase tracking-widest text-[#7DD3FC]">
                            Colossal Hub
                        </p>
                    </div>

                    <h2 className="text-[34px] font-bold leading-tight">{title}</h2>
                    {subtitle && (
                        <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70">{subtitle}</p>
                    )}

                    <ul className="mt-10 space-y-4">
                        {features.map(({ icon: Icon, label, desc }) => (
                            <li key={label} className="flex gap-3">
                                <span
                                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ring-1 ring-white/20"
                                    style={{ background: "rgba(255,255,255,0.08)" }}
                                >
                                    <Icon className="h-4 w-4 text-[#7DD3FC]" />
                                </span>
                                <div>
                                    <p className="text-sm font-semibold text-white">{label}</p>
                                    <p className="mt-0.5 text-xs leading-relaxed text-white/60">{desc}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="relative space-y-3">
                    <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10">
                        <Lock className="h-3.5 w-3.5 text-[#7DD3FC]" />
                        <p className="text-[11px] text-white/70">
                            Your data is encrypted in transit and at rest.
                        </p>
                    </div>
                    <p className="text-[11px] text-white/40">
                        Â© {new Date().getFullYear()} Colossal Hub. All rights reserved.
                    </p>
                </div>
            </div>

            {/* Right — form */}
            <div className="flex w-full items-center justify-center bg-white px-6 py-10 md:w-1/2 md:py-16">
                <div className="w-full max-w-sm">{children}</div>
            </div>
        </div>
    )
}

/**
 * Compact brand mark used inside the form panel — rendered above page titles.
 * Hidden on desktop where the side marketing panel already shows the brand.
 */
export function AuthBrandMark({ subtitle = "AI-powered hiring" }: { subtitle?: string }) {
    return (
        <div className="mb-8 md:hidden">
            <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl ring-1 ring-[#E5E5E5]">
                    <Image
                        src="/favicon-32x32.png"
                        alt=""
                        width={32}
                        height={32}
                        className="h-8 w-8 object-contain"
                        priority
                    />
                </div>
                <div>
                    <p className="text-base font-bold leading-tight text-[#0A1128]">Colossal Hub</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A3A3A3]">
                        {subtitle}
                    </p>
                </div>
            </div>
        </div>
    )
}

export { Brain }

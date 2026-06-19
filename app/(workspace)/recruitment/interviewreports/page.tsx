import Link from "next/link"
import { MainLayout } from "@/components/recruitment/layout/main-layout"
import { Button } from "@/components/ui/button"
import { ArrowRight, FileBarChart, Hammer, Video } from "lucide-react"

export default function InterviewReportsPage() {
    return (
        <MainLayout>
            <div className="mx-auto w-full max-w-3xl space-y-6">
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#1282A2]">
                        Reports
                    </p>
                    <h1 className="mt-1 text-[28px] font-bold leading-tight text-[#0A1128]">
                        Interview reports
                    </h1>
                    <p className="mt-1 max-w-2xl text-sm text-[#525252]">
                        Detailed reports across all completed interviews.
                    </p>
                </div>

                <div
                    className="relative overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white p-10 text-center"
                >
                    <div
                        className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full opacity-20 blur-3xl"
                        style={{ background: "#1282A2" }}
                        aria-hidden="true"
                    />
                    <p className="relative text-base font-semibold text-[#0A1128]">
                        Under construction
                    </p>
                    <p className="relative mx-auto mt-1 max-w-md text-sm text-[#525252]">
                        Aggregated interview reports are on the way. In the meantime, dive into
                        individual interview reviews.
                    </p>
                    <div className="relative mt-5 flex flex-wrap justify-center gap-2">
                        <Link href="/recruitment/interviewsreview">
                            <Button className="bg-[#034078] text-white hover:bg-[#0A1128]">
                                <Video className="mr-2 h-4 w-4" />
                                Open interview reviews
                                <ArrowRight className="ml-1.5 h-4 w-4" />
                            </Button>
                        </Link>
                        <Link href="/recruitment/reports">
                            <Button
                                variant="outline"
                                className="border-[#E5E5E5] text-[#525252] hover:text-[#0A1128]"
                            >
                                <FileBarChart className="mr-2 h-4 w-4" />
                                Shortlist reports
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </MainLayout>
    )
}

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function CandidateNotFound() {
    return (
        <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
            <p className="text-sm text-muted-foreground">Candidate Workspace</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Page not found</h1>
            <p className="mt-3 text-muted-foreground">
                This page is unavailable in the Candidate system.
            </p>
            <div className="mt-6 flex gap-3">
                <Button asChild>
                    <Link href="/recruitment/candidate/dashboard">Go to Candidate dashboard</Link>
                </Button>
            </div>
        </div>
    )
}

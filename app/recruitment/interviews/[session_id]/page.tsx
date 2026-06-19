import Link from 'next/link'
import { headers } from 'next/headers'
import { App as AgentApp } from '@/components/recruitment/app/app'
import { getAppConfig } from '@/lib/recruitment/utils'
import { apiClient } from '@/lib/recruitment/api-client'

interface InterviewPageProps {
  params: Promise<{
    session_id: string
  }>
}

function InterviewAlreadyCompleted({ candidateName }: { candidateName?: string }) {
  return (
    <main className="min-h-svh flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#E5E5E5] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7 text-emerald-600"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[#0A1128]">Interview already completed</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#525252]">
          {candidateName
            ? `${candidateName}, this interview session has already been completed and cannot be retaken.`
            : 'This interview session has already been completed and cannot be retaken.'}
          {' '}If you believe this is an error, please contact your recruiter.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/recruitment/candidate/interviews"
            className="inline-flex items-center justify-center rounded-md bg-[#034078] px-4 py-2 text-sm font-medium text-white hover:bg-[#034078]/90"
          >
            Back to my interviews
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-[#E5E5E5] px-4 py-2 text-sm font-medium text-[#171717] hover:bg-gray-50"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  )
}

export default async function InterviewPage({ params }: InterviewPageProps) {
  const { session_id } = await params
  const hdrs = await headers()
  const appConfig = await getAppConfig(hdrs)

  // Fetch interview details to get candidate information
  let interviewDetails = null
  try {
    interviewDetails = await apiClient.getInterviewSession(session_id)
  } catch (error) {
    console.error('Failed to fetch interview details:', error)
  }

  // If the interview has already been completed (or failed), don't allow it to
  // be re-entered. Showing the live interview UI for a finished session would
  // start a new LiveKit room and confuse the candidate.
  if (
    interviewDetails &&
    (interviewDetails.status === 'Completed' || interviewDetails.status === 'Failed')
  ) {
    return <InterviewAlreadyCompleted candidateName={interviewDetails.candidate_name} />
  }

  return <AgentApp appConfig={appConfig} sessionId={session_id} interviewDetails={interviewDetails} />
}

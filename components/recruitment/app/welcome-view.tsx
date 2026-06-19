import { AlertCircle, Camera, Mic, Video } from 'lucide-react';

function WelcomeImage() {
  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="size-14"
    >
      <path
        d="M15 24V40C15 40.7957 14.6839 41.5587 14.1213 42.1213C13.5587 42.6839 12.7956 43 12 43C11.2044 43 10.4413 42.6839 9.87868 42.1213C9.31607 41.5587 9 40.7957 9 40V24C9 23.2044 9.31607 22.4413 9.87868 21.8787C10.4413 21.3161 11.2044 21 12 21C12.7956 21 13.5587 21.3161 14.1213 21.8787C14.6839 22.4413 15 23.2044 15 24ZM22 5C21.2044 5 20.4413 5.31607 19.8787 5.87868C19.3161 6.44129 19 7.20435 19 8V56C19 56.7957 19.3161 57.5587 19.8787 58.1213C20.4413 58.6839 21.2044 59 22 59C22.7956 59 23.5587 58.6839 24.1213 58.1213C24.6839 57.5587 25 56.7957 25 56V8C25 7.20435 24.6839 6.44129 24.1213 5.87868C23.5587 5.31607 22.7956 5 22 5ZM32 13C31.2044 13 30.4413 13.3161 29.8787 13.8787C29.3161 14.4413 29 15.2044 29 16V48C29 48.7957 29.3161 49.5587 29.8787 50.1213C30.4413 50.6839 31.2044 51 32 51C32.7956 51 33.5587 50.6839 34.1213 50.1213C34.6839 49.5587 35 48.7957 35 48V16C35 15.2044 34.6839 14.4413 34.1213 13.8787C33.5587 13.3161 32.7956 13 32 13ZM42 21C41.2043 21 40.4413 21.3161 39.8787 21.8787C39.3161 22.4413 39 23.2044 39 24V40C39 40.7957 39.3161 41.5587 39.8787 42.1213C40.4413 42.6839 41.2043 43 42 43C42.7957 43 43.5587 42.6839 44.1213 42.1213C44.6839 41.5587 45 40.7957 45 40V24C45 23.2044 44.6839 22.4413 44.1213 21.8787C43.5587 21.3161 42.7957 21 42 21ZM52 17C51.2043 17 50.4413 17.3161 49.8787 17.8787C49.3161 18.4413 49 19.2044 49 20V44C49 44.7957 49.3161 45.5587 49.8787 46.1213C50.4413 46.6839 51.2043 47 52 47C52.7957 47 53.5587 46.6839 54.1213 46.1213C54.6839 45.5587 55 44.7957 55 44V20C55 19.2044 54.6839 18.4413 54.1213 17.8787C53.5587 17.3161 52.7957 17 52 17Z"
        fill="#034078"
      />
    </svg>
  );
}

interface RequirementRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function RequirementRow({ icon, title, description }: RequirementRowProps) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-[#1282A2]/10 text-[#1282A2]">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#171717] leading-tight">{title}</p>
        <p className="mt-0.5 text-xs leading-snug text-[#525252]">{description}</p>
      </div>
    </div>
  );
}

interface WelcomeViewProps {
  startButtonText: string;
  onStartCall: () => void;
}

export const WelcomeView = ({
  startButtonText,
  onStartCall,
  ref,
}: React.ComponentProps<'div'> & WelcomeViewProps) => {
  return (
    <div
      ref={ref}
      className="flex h-svh flex-col items-center justify-center bg-[#F5F5F5] px-4 py-4 overflow-hidden"
    >
      <section className="flex w-full max-w-lg flex-col items-center text-center">
        <WelcomeImage />

        <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-[#0A1128] sm:text-3xl">
          Whenever you&apos;re ready
        </h1>
        <p className="mt-1 text-sm text-[#525252]">
          Please review the requirements below before starting your interview.
        </p>

        {/* Important Notice card */}
        <div className="mt-4 w-full overflow-hidden rounded-xl border border-[#E5E5E5] bg-white text-left shadow-sm">
          {/* Notice header */}
          <div className="flex items-start gap-3 border-b border-[#E5E5E5] px-5 py-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#F97316]/10">
              <AlertCircle className="h-4.5 w-4.5 text-[#F97316]" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-[#171717] leading-tight">Important Notice</h2>
              <p className="mt-0.5 text-xs leading-snug text-[#525252]">
                This interview will be recorded for evaluation. By proceeding, you agree to the following:
              </p>
            </div>
          </div>

          {/* Requirements */}
          <div className="space-y-3 px-5 py-3">
            <RequirementRow
              icon={<Camera className="h-3.5 w-3.5" />}
              title="Camera Required"
              description="Enable your camera for the duration of the interview."
            />
            <RequirementRow
              icon={<Mic className="h-3.5 w-3.5" />}
              title="Microphone Required"
              description="Enable your microphone to communicate during the interview."
            />
            <RequirementRow
              icon={<Video className="h-3.5 w-3.5" />}
              title="Recording Notice"
              description="This session is recorded and stored securely for evaluation."
            />
          </div>

          {/* Consent footer */}
          <div className="border-t border-[#E5E5E5] bg-[#F5F5F5] px-5 py-2.5">
            <p className="text-[11px] leading-snug text-[#525252]">
              By clicking &ldquo;{startButtonText}&rdquo; below, you acknowledge and agree to these terms.
            </p>
          </div>
        </div>

        {/* Primary CTA — brand blue */}
        <button
          type="button"
          onClick={onStartCall}
          className="mt-4 inline-flex items-center justify-center rounded-full bg-[#034078] px-8 py-2.5 text-sm font-semibold uppercase tracking-wider text-white shadow-md transition-colors hover:bg-[#0A1128] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#034078] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F5F5]"
        >
          {startButtonText}
        </button>

        <p className="mt-3 text-[11px] text-[#A3A3A3]">AI Powered Recruitment</p>
      </section>
    </div>
  );
};

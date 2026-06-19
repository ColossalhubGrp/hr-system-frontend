'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/recruitment/api-client';
import { motion } from 'motion/react';
import { useSessionContext, useSessionMessages, useLocalParticipant } from '@livekit/components-react';
import { Track, RoomEvent, type RemoteParticipant } from 'livekit-client';
import type { AppConfig } from '@/app-config';
import { ChatTranscript } from '@/components/recruitment/app/chat-transcript';
import { PreConnectMessage } from '@/components/recruitment/app/preconnect-message';
import { TileLayout } from '@/components/recruitment/app/tile-layout';
import {
  AgentControlBar,
  type ControlBarControls,
} from '@/components/recruitment/livekit/agent-control-bar/agent-control-bar';
import { useConnection } from '@/hooks/useConnection';
import { cn } from '@/lib/cn';
import { ScrollArea } from '@/components/recruitment/livekit/scroll-area/scroll-area';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, Camera, Mic, AlertCircle } from 'lucide-react';

const MotionBottom = motion.create('div');

import type { Variants } from 'motion/react';

const bottomVariants: Variants = {
  visible: {
    opacity: 1,
    translateY: '0%',
  },
  hidden: {
    opacity: 0,
    translateY: '100%',
  },
};

const BOTTOM_VIEW_MOTION_PROPS = {
  variants: bottomVariants,
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
  transition: {
    duration: 0.3,
    delay: 0.5,
    ease: 'easeOut' as const,
  },
} as const;


interface FadeProps {
  top?: boolean;
  bottom?: boolean;
  className?: string;
}

// Serialize a LiveKit chat message list to the [ISO] Sender: text format the
// backend stores on the Interview Session. Pure / module-scope so the
// transcript built from a closure-captured ref always matches what
// finalizeInterview produces.
function buildTranscript(
  messages: ReadonlyArray<{
    timestamp?: number;
    message?: string;
    from?: { name?: string; isLocal?: boolean };
  }>
): string {
  return messages
    .map((m) => {
      const ts = m.timestamp ? new Date(m.timestamp).toISOString() : '';
      const sender = m.from?.isLocal
        ? m.from?.name || 'User'
        : m.from?.name || 'Assistant';
      return `[${ts}] ${sender}: ${m.message || ''}`;
    })
    .join('\n');
}

export function Fade({ top = false, bottom = false, className }: FadeProps) {
  return (
    <div
      className={cn(
        'from-background pointer-events-none h-4 bg-linear-to-b to-transparent',
        top && 'bg-linear-to-b',
        bottom && 'bg-linear-to-t',
        className
      )}
    />
  );
}

interface SessionViewProps {
  appConfig: AppConfig;
  sessionId?: string;
  interviewDetails?: any;
}

export const SessionView = ({
  appConfig,
  sessionId: propSessionId,
  interviewDetails,
  ...props
}: React.ComponentProps<'section'> & SessionViewProps) => {
  const [clientInterviewDetails, setClientInterviewDetails] = useState<any>(interviewDetails);
  const session = useSessionContext();

  // Fetch interview details on client if missing
  useEffect(() => {
    if (!clientInterviewDetails && propSessionId) {
      apiClient.getInterviewSession(propSessionId)
        .then((data) => {
          setClientInterviewDetails(data);
        })
        .catch((err) => {
          console.error('Failed to fetch interview session on client:', err);
        });
    }
  }, [clientInterviewDetails, propSessionId]);
  const { messages } = useSessionMessages(session);
  const [chatOpen, setChatOpen] = useState(false);
  const { isConnectionActive, startDisconnectTransition } = useConnection();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const cameraAutoEnabledRef = useRef(false);
  const egressTriggeredRef = useRef(false);
  const interviewInProgressRef = useRef(false);
  const finalizeCalledRef = useRef(false);
  const messagesRef = useRef<typeof messages>([]);
  const [egressId, setEgressId] = useState<string | null>(null);
  const { localParticipant } = useLocalParticipant();
  const router = useRouter();
  const [permissionDialog, setPermissionDialog] = useState<{
    open: boolean;
    blocked: boolean;
    retrying: boolean;
  }>({ open: false, blocked: false, retrying: false });

  // Use sessionId from props, or fallback to interviewDetails.name
  const sessionId = propSessionId || interviewDetails?.name || '';

  // Timer and polling for auto-termination
  const [sessionStatus, setSessionStatus] = useState<string>(clientInterviewDetails?.status || '');
  const [sessionEndTime, setSessionEndTime] = useState<string | null>(clientInterviewDetails?.end_time || null);
  const [sessionSummary, setSessionSummary] = useState<string | null>(clientInterviewDetails?.summary || null);
  const [aiEvaluation, setAiEvaluation] = useState<any>(clientInterviewDetails?.ai_evaluation || null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  // Keep sessionStatus in sync with the latest clientInterviewDetails so the
  // timer and polling gates react to the first client-side fetch (not only
  // to polling updates).
  useEffect(() => {
    const latest = clientInterviewDetails?.status;
    if (latest && latest !== sessionStatus) {
      setSessionStatus(latest);
    }
  }, [clientInterviewDetails?.status, sessionStatus]);

  // Backend sometimes returns duration: 0 for sessions that weren't given an
  // explicit limit. Fall back to a default so the countdown still renders.
  const DEFAULT_DURATION_MINUTES = 30;
  const resolvedDurationMinutes =
    Number(clientInterviewDetails?.duration) ||
    Number(clientInterviewDetails?.duration_minutes) ||
    DEFAULT_DURATION_MINUTES;

  // Calculate end time and start timer if session is in progress
  useEffect(() => {
    if (clientInterviewDetails?.status === 'In Progress' && clientInterviewDetails?.start_time) {
      const start = new Date(clientInterviewDetails.start_time).getTime();
      const end = start + resolvedDurationMinutes * 60 * 1000;
      setSessionEndTime(new Date(end).toISOString());
      const updateTimer = () => {
        const now = Date.now();
        const diff = Math.max(0, Math.floor((end - now) / 1000));
        setRemainingSeconds(diff);
      };
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setRemainingSeconds(null);
    }
  }, [clientInterviewDetails?.status, clientInterviewDetails?.start_time, resolvedDurationMinutes]);

  // Poll session status every 10 seconds until the session is Completed.
  // Gating on sessionStatus === 'In Progress' | 'Scheduled' created a deadlock
  // when the initial prop was null (sessionStatus stayed '' forever).
  useEffect(() => {
    if (!sessionId || sessionStatus === 'Completed') return;
    const poll = async () => {
      try {
        const session = await apiClient.getInterviewSession(sessionId);
        setSessionStatus(session.status);
        setSessionEndTime(session.end_time || null);
        setSessionSummary(session.summary || null);
        setAiEvaluation(session.ai_evaluation || null);
        setClientInterviewDetails(session); // Always use the latest session object
      } catch (e) {
        console.error('Interview session poll failed:', e);
      }
    };
    poll();
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, [sessionId, sessionStatus]);

  const controls: ControlBarControls = {
    leave: true,
    microphone: true,
    chat: appConfig.supportsChatInput,
    camera: appConfig.supportsVideoInput,
    screenShare: appConfig.supportsVideoInput,
  };
  console.log('Interview Details (state): ', clientInterviewDetails)

  const isPermissionError = useCallback((err: unknown) => {
    if (!err) return false;
    const name = (err as { name?: string })?.name;
    const message = (err as { message?: string })?.message ?? '';
    return (
      name === 'NotAllowedError' ||
      /permission/i.test(message) ||
      /denied/i.test(message) ||
      /dismissed/i.test(message)
    );
  }, []);

  const enableMediaTracks = useCallback(async () => {
    const tasks: Promise<unknown>[] = [];
    if (appConfig.supportsVideoInput) {
      tasks.push(localParticipant.setCameraEnabled(true));
    }
    tasks.push(localParticipant.setMicrophoneEnabled(true));
    const results = await Promise.allSettled(tasks);
    const permissionFailure = results.find(
      (r) => r.status === 'rejected' && isPermissionError(r.reason)
    );
    if (permissionFailure) {
      let blocked = false;
      try {
        if (typeof navigator !== 'undefined' && navigator.permissions) {
          const [cam, mic] = await Promise.all([
            navigator.permissions.query({ name: 'camera' as PermissionName }).catch(() => null),
            navigator.permissions.query({ name: 'microphone' as PermissionName }).catch(() => null),
          ]);
          blocked = cam?.state === 'denied' || mic?.state === 'denied';
        }
      } catch {
        blocked = false;
      }
      return { ok: false as const, blocked };
    }
    return { ok: true as const, blocked: false };
  }, [appConfig.supportsVideoInput, isPermissionError, localParticipant]);

  // Auto-enable camera + microphone when interview starts. If the user dismisses
  // or denies the browser permission prompt we surface our own dialog instead
  // of letting an unhandled rejection hit Next's error overlay.
  useEffect(() => {
    if (!isConnectionActive || cameraAutoEnabledRef.current) return;
    cameraAutoEnabledRef.current = true;

    enableMediaTracks().then((result) => {
      if (!result.ok) {
        setPermissionDialog({ open: true, blocked: result.blocked, retrying: false });
      }
    });
  }, [isConnectionActive, enableMediaTracks]);

  const handleRetryPermissions = useCallback(async () => {
    setPermissionDialog((prev) => ({ ...prev, retrying: true }));
    try {
      // Nudge the browser to surface the prompt again for the dismissed case.
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          stream.getTracks().forEach((t) => t.stop());
        } catch {
          // Fall through — enableMediaTracks below will classify the failure.
        }
      }
      const result = await enableMediaTracks();
      if (result.ok) {
        setPermissionDialog({ open: false, blocked: false, retrying: false });
      } else {
        setPermissionDialog({ open: true, blocked: result.blocked, retrying: false });
      }
    } catch {
      setPermissionDialog((prev) => ({ ...prev, retrying: false }));
    }
  }, [enableMediaTracks]);

  const handleExitInterview = useCallback(() => {
    setPermissionDialog({ open: false, blocked: false, retrying: false });
    startDisconnectTransition();
    router.push('/recruitment/candidate/interviews');
  }, [router, startDisconnectTransition]);

  // Trigger LiveKit Room Composite Egress once the room actually has both the
  // candidate's published tracks AND the AI agent participant. The backend
  // returns ROOM_NOT_FOUND if we ask too early, so we poll until both sides
  // are present, then fire start_egress exactly once. Recording is server-
  // side from here on — no client-side MediaRecorder.
  useEffect(() => {
    if (!sessionId || !isConnectionActive || !session?.isConnected) return;
    if (egressTriggeredRef.current) return;

    let cancelled = false;
    let retriedRoomNotFound = false;

    const attempt = async () => {
      if (cancelled || egressTriggeredRef.current) return;
      const room = session.room;
      const camPub = room?.localParticipant?.getTrackPublication(Track.Source.Camera);
      const micPub = room?.localParticipant?.getTrackPublication(Track.Source.Microphone);
      const hasAgent = !!room && room.remoteParticipants.size > 0;
      if (!camPub?.track || !micPub?.track || !hasAgent) return;

      egressTriggeredRef.current = true;
      try {
        const res = await apiClient.startEgress(sessionId);
        if (cancelled) return;
        if (res?.success && res.egress_id) {
          setEgressId(res.egress_id);
          console.log(`[egress] started: id=${res.egress_id} code=${res.code ?? 'OK'}`);
        } else if (res?.code === 'ROOM_NOT_FOUND' && !retriedRoomNotFound) {
          // LiveKit hasn't fully registered the room yet — let the poll fire again.
          retriedRoomNotFound = true;
          egressTriggeredRef.current = false;
        } else {
          console.warn('[egress] start failed:', res);
        }
      } catch (err) {
        if (cancelled) return;
        console.warn('[egress] start error (continuing without recording):', err);
      }
    };

    attempt();
    const interval = setInterval(() => {
      if (cancelled || egressTriggeredRef.current) return;
      attempt();
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sessionId, isConnectionActive, session]);

  // Track whether the interview is still live so the beforeunload handler
  // knows whether to call stop_egress when the user closes the tab.
  useEffect(() => {
    interviewInProgressRef.current =
      isConnectionActive && sessionStatus !== 'Completed' && !!egressId;
  }, [isConnectionActive, sessionStatus, egressId]);

  // Keep a ref of the latest messages so the finalize path (which can fire
  // from LiveKit room events outside the React render cycle) always reads
  // the current transcript, not whatever was captured in the listener's
  // closure.
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Single funnel for "the interview is over" — invoked from three places:
  //   1. The user clicks End Interview (handleDisconnect).
  //   2. The agent disconnects from the LiveKit room (RoomEvent.ParticipantDisconnected).
  //   3. The room itself closes (RoomEvent.Disconnected).
  // Without (2) and (3) the candidate could complete the interview verbally
  // ("end the interview please") and we'd never call end_interview_session,
  // losing the transcript and leaving the session marked In-Progress forever.
  // Idempotent via finalizeCalledRef so it can't double-fire.
  const finalizeInterview = useCallback(async () => {
    if (finalizeCalledRef.current) return;
    finalizeCalledRef.current = true;

    // Brief wait so trailing chat messages (the agent's farewell line) make
    // it into messagesRef before we serialize the transcript.
    await new Promise((resolve) => setTimeout(resolve, 500));

    const transcript = buildTranscript(messagesRef.current ?? []);
    try {
      startDisconnectTransition(transcript);
    } catch (err) {
      console.error('[interview] finalize failed:', err);
    }
  }, [startDisconnectTransition]);

  const handleDisconnect = useCallback(() => {
    void finalizeInterview();
  }, [finalizeInterview]);

  // Listen for the agent leaving the room or the room itself closing, and
  // trigger the same finalize path. session?.room becomes available once
  // LiveKit is connected.
  useEffect(() => {
    const room = session?.room;
    if (!room) return;

    const onParticipantDisconnected = (_p: RemoteParticipant) => {
      // Interviews are 1-on-1; when no remote participants remain, the agent
      // has left and the interview should finalize.
      if (room.remoteParticipants.size === 0 && !finalizeCalledRef.current) {
        console.log('[interview] agent disconnected → finalizing');
        void finalizeInterview();
      }
    };

    const onDisconnected = () => {
      if (!finalizeCalledRef.current) {
        console.log('[interview] room disconnected → finalizing');
        void finalizeInterview();
      }
    };

    room.on(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
    room.on(RoomEvent.Disconnected, onDisconnected);

    return () => {
      room.off(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
      room.off(RoomEvent.Disconnected, onDisconnected);
    };
  }, [session, finalizeInterview]);

  useEffect(() => {
    const lastMessage = messages.at(-1);
    const lastMessageIsLocal = lastMessage?.from?.isLocal === true;

    if (scrollAreaRef.current && lastMessageIsLocal) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Abnormal-termination handling: if the user closes the tab or navigates
  // away while the interview is still live, flush the transcript to the
  // backend via end_interview_session AND stop the egress, both via
  // sendBeacon so the requests survive the page unload.
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!interviewInProgressRef.current || !sessionId) return;
      try {
        if (!finalizeCalledRef.current) {
          finalizeCalledRef.current = true;
          const transcript = buildTranscript(messagesRef.current ?? []);
          const endUrl = `/api/frappe/${encodeURIComponent(
            'recruitment_app.api.interview_sessions.end_interview_session'
          )}`;
          const endBody = JSON.stringify({
            params: { session_id: sessionId, transcript },
          });
          navigator.sendBeacon(
            endUrl,
            new Blob([endBody], { type: 'application/json' })
          );
        }
        const stopUrl = `/api/frappe/${encodeURIComponent(
          'recruitment_app.api.interview_sessions.stop_egress'
        )}`;
        const stopBody = JSON.stringify({
          params: { session_id: sessionId },
        });
        navigator.sendBeacon(
          stopUrl,
          new Blob([stopBody], { type: 'application/json' })
        );
      } catch (err) {
        console.warn('[interview] beforeunload beacons failed:', err);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionId]);

  // Recording is now produced server-side by LiveKit Egress, so once the
  // session is Completed there's nothing on the client to wait for.
  if (sessionStatus === 'Completed') {
    return (
      <section className="bg-background flex flex-col items-center justify-center h-full w-full p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Interview Ended</h2>
        <p className="mb-4">This interview session has ended. Thank you for participating.</p>
        {sessionSummary && (
          <div className="bg-white rounded-lg shadow p-4 mb-4 w-full max-w-xl mx-auto">
            <h3 className="text-lg font-semibold mb-2">AI Summary</h3>
            <div className="text-left whitespace-pre-line">{sessionSummary}</div>
          </div>
        )}
        {aiEvaluation && (
          <div className="bg-white rounded-lg shadow p-4 w-full max-w-xl mx-auto">
            <h3 className="text-lg font-semibold mb-2">AI Evaluation</h3>
            <pre className="text-left whitespace-pre-line">{JSON.stringify(aiEvaluation, null, 2)}</pre>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="bg-background relative z-10 h-full w-full overflow-hidden" {...props}>
      {/* Unified interview header: candidate (left), company (center), timer (right). */}
      {clientInterviewDetails && (() => {
        const company =
          clientInterviewDetails.company ||
          clientInterviewDetails.company_name ||
          clientInterviewDetails.employer_name;

        const timerRunning =
          clientInterviewDetails.start_time && sessionStatus === 'In Progress';
        const isFinalMinute = remainingSeconds !== null && remainingSeconds <= 60;
        const isCritical = remainingSeconds !== null && remainingSeconds <= 10;

        return (
          <div
            className="fixed left-4 right-4 top-4 z-50 flex items-center gap-3 overflow-hidden rounded-xl border-l-4 bg-black/40 px-4 py-2.5 text-white shadow-lg backdrop-blur-md md:left-8 md:right-8"
            style={{ borderLeftColor: 'var(--primary, #034078)' }}
          >
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold leading-tight sm:text-base">
                {clientInterviewDetails.candidate_name}
              </h2>
              <p className="truncate text-xs text-white/70">
                {clientInterviewDetails.job_title}
              </p>
            </div>

            {company && (
              <div className="hidden min-w-0 max-w-[40%] text-center sm:block">
                <p className="text-[10px] uppercase tracking-wider text-white/50">
                  Company
                </p>
                <p className="truncate text-sm font-medium">{company}</p>
              </div>
            )}

            {timerRunning && (
              <div
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-xs font-semibold tabular-nums sm:text-sm',
                  isCritical && 'animate-pulse bg-red-600 text-white',
                  !isCritical && isFinalMinute && 'bg-amber-500 text-black',
                )}
                style={
                  !isFinalMinute
                    ? { backgroundColor: 'var(--primary, #034078)' }
                    : undefined
                }
                aria-label="Time remaining"
              >
                <Clock className="h-3.5 w-3.5" />
                {remainingSeconds !== null
                  ? `${Math.floor(remainingSeconds / 60)}:${(remainingSeconds % 60).toString().padStart(2, '0')}`
                  : '--:--'}
              </div>
            )}
          </div>
        );
      })()}

      {/* Chat Transcript */}
      <div
        className={cn(
          'fixed inset-0 grid grid-cols-1 grid-rows-1',
          !chatOpen && 'pointer-events-none'
        )}
      >
        <Fade top className="absolute inset-x-4 top-0 h-40" />
        <ScrollArea ref={scrollAreaRef} className="px-4 pt-40 pb-[150px] md:px-6 md:pb-[200px]">
          <ChatTranscript
            hidden={!chatOpen}
            messages={messages}
            className="mx-auto max-w-2xl space-y-3 transition-opacity duration-300 ease-out"
          />
        </ScrollArea>
      </div>

      {/* Tile Layout */}
      <TileLayout chatOpen={chatOpen} />

      {/* Bottom */}
      <MotionBottom
        {...BOTTOM_VIEW_MOTION_PROPS}
        className="fixed inset-x-3 bottom-0 z-50 md:inset-x-12"
      >
        {appConfig.isPreConnectBufferEnabled && (
          <PreConnectMessage messages={messages} className="pb-4" />
        )}
        <div className="bg-background relative mx-auto max-w-2xl pb-3 md:pb-12">
          <Fade bottom className="absolute inset-x-0 top-0 h-4 -translate-y-full" />
          <AgentControlBar
            controls={controls}
            isConnectionActive={isConnectionActive}
            onDisconnect={handleDisconnect}
            onChatOpenChange={setChatOpen}
          />
        </div>
      </MotionBottom>

      <Dialog
        open={permissionDialog.open}
        onOpenChange={(open) => {
          if (!open) return;
          setPermissionDialog((prev) => ({ ...prev, open }));
        }}
      >
        <DialogContent
          className="max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 border border-amber-200">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
            <DialogTitle className="text-center">
              Camera &amp; Microphone Required
            </DialogTitle>
            <DialogDescription className="text-center">
              {permissionDialog.blocked
                ? "Your browser has blocked camera and microphone access for this site. Open the site settings (click the lock icon in the address bar) to allow access, then try again."
                : "We need permission to use your camera and microphone to run the interview. Grant access in the browser prompt and we'll get you back on track."}
            </DialogDescription>
          </DialogHeader>

          <div className="my-2 grid grid-cols-2 gap-2 text-sm text-gray-600">
            <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
              <Camera className="h-4 w-4 text-[#1282A2]" />
              <span>Camera</span>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
              <Mic className="h-4 w-4 text-[#1282A2]" />
              <span>Microphone</span>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
            <Button
              variant="outline"
              onClick={handleExitInterview}
              disabled={permissionDialog.retrying}
            >
              Exit Interview
            </Button>
            <Button
              onClick={handleRetryPermissions}
              disabled={permissionDialog.retrying}
              className="bg-[#034078] hover:bg-[#034078]/90"
            >
              {permissionDialog.retrying ? 'Requesting…' : 'Grant Permissions'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};



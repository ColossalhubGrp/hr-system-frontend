'use client';

import { RoomAudioRenderer, StartAudio } from '@livekit/components-react';
import type { AppConfig } from '@/app-config';
import { ViewController } from '@/components/recruitment/app/view-controller';
import { Toaster } from '@/components/recruitment/livekit/toaster';
import { useAgentErrors } from '@/hooks/useAgentErrors';
import { ConnectionProvider } from '@/hooks/useConnection';
import { useDebugMode } from '@/hooks/useDebug';

const IN_DEVELOPMENT = process.env.NODE_ENV !== 'production';

function AppSetup() {
  useDebugMode({ enabled: IN_DEVELOPMENT });
  useAgentErrors();

  return null;
}

interface AppProps {
  appConfig: AppConfig;
  sessionId?: string;
  interviewDetails?: any;
}

export function App({ appConfig, sessionId, interviewDetails }: AppProps) {
  // Merge sessionId into appConfig
  const configWithSession: AppConfig = {
    ...appConfig,
    sessionId,
  };

  return (
    <ConnectionProvider appConfig={configWithSession}>
      <AppSetup />
      <main className="grid h-svh grid-cols-1 place-content-center">
        <ViewController appConfig={configWithSession} interviewDetails={interviewDetails} />
      </main>
      <StartAudio label="Start Audio" />
      <RoomAudioRenderer />
      <Toaster />
    </ConnectionProvider>
  );
}
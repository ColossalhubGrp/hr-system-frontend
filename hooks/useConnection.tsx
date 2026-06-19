'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import { TokenSource } from 'livekit-client';
import { SessionProvider, useSession } from '@livekit/components-react';
import type { AppConfig } from '@/app-config';
import { apiClient } from '@/lib/recruitment/api-client';

interface ConnectionContextType {
  isConnectionActive: boolean;
  connect: (startSession?: boolean) => void;
  startDisconnectTransition: (transcript?: string) => void;
  onDisconnectTransitionComplete: () => void;
}

const ConnectionContext = createContext<ConnectionContextType>({
  isConnectionActive: false,
  connect: () => { },
  startDisconnectTransition: () => { },
  onDisconnectTransitionComplete: () => { },
});

export function useConnection() {
  const ctx = useContext(ConnectionContext);
  if (!ctx) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return ctx;
}

interface ConnectionProviderProps {
  appConfig: AppConfig;
  children: React.ReactNode;
}

export function ConnectionProvider({ appConfig, children }: ConnectionProviderProps) {
  const [isConnectionActive, setIsConnectionActive] = useState(false);

  const tokenSource = useMemo(() => {
    // Custom token source for external endpoint
    if (typeof process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT === 'string') {
      return TokenSource.custom(async () => {
        const url = new URL(process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT!, window.location.origin);

        try {
          const requestBody: {
            room_config?: {
              agents?: Array<{ agent_name: string }>;
            };
            session_id?: string;
            room_name?: string;
          } = {
            room_config: appConfig.agentName
              ? {
                agents: [{ agent_name: appConfig.agentName }],
              }
              : undefined,
          };

          // Add session_id and format room_name if sessionId is provided
          if (appConfig.sessionId) {
            requestBody.session_id = appConfig.sessionId;
            requestBody.room_name = `interview-${appConfig.sessionId}`;
          }
          const res = await fetch(url.toString(), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Sandbox-Id': appConfig.sandboxId ?? '',
            },
            body: JSON.stringify(requestBody),
            credentials: 'same-origin',
          });

          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }

          return await res.json();
        } catch (error) {
          console.error('Error fetching connection details:', error);
          throw new Error('Error fetching connection details!');
        }
      });
    }

    // Custom token source for local API endpoint
    return TokenSource.custom(async () => {
      try {
        const requestBody: {
          session_id?: string;
          room_name?: string;
        } = {};

        // Add session_id and format room_name if sessionId is provided
        if (appConfig.sessionId) {
          requestBody.session_id = appConfig.sessionId;
          requestBody.room_name = `interview-${appConfig.sessionId}`;
        }

        const res = await fetch('/api/connection-details', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          credentials: 'same-origin',
        });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        return await res.json();
      } catch (error) {
        console.error('Error fetching connection details:', error);
        throw new Error('Error fetching connection details!');
      }
    });
  }, [appConfig]);

  const session = useSession(
    tokenSource,
    appConfig.agentName ? { agentName: appConfig.agentName } : undefined
  );

  const { start: startSession, end: endSession } = session;

  const value = useMemo(() => {
    return {
      isConnectionActive,
      connect: async () => {
        setIsConnectionActive(true);

        // Call backend to mark interview session as started using guest-safe path
        if (appConfig.sessionId) {
          try {
            await apiClient.startInterviewSession(appConfig.sessionId);
          } catch (error) {
            console.error('Failed to start interview session:', error);
            // Continue anyway
          }
        }

        startSession();
      },
      startDisconnectTransition: async (transcript?: string) => {
        // Call the API to end the interview session if we have a sessionId
        if (appConfig.sessionId) {
          try {
            await apiClient.endInterviewSession(appConfig.sessionId, transcript);
          } catch (error) {
            console.error('Failed to end interview session:', error);
            // Continue with disconnect even if API call fails
          }
        }

        setIsConnectionActive(false);
      },
      onDisconnectTransitionComplete: () => {
        endSession();
      },
    };
  }, [startSession, endSession, isConnectionActive, appConfig.sessionId]);

  return (
    <SessionProvider session={session}>
      <ConnectionContext.Provider value={value}>{children}</ConnectionContext.Provider>
    </SessionProvider>
  );
}
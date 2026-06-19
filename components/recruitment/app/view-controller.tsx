'use client';

import { useCallback } from 'react';
import { AnimatePresence, type AnimationDefinition, motion } from 'motion/react';
import type { AppConfig } from '@/app-config';
import { SessionView } from '@/components/recruitment/app/session-view';
import { WelcomeView } from '@/components/recruitment/app/welcome-view';
import { useConnection } from '@/hooks/useConnection';

const MotionWelcomeView = motion.create(WelcomeView);
const MotionSessionView = motion.create(SessionView);

const VIEW_MOTION_PROPS = {
  variants: {
    visible: { opacity: 1 },
    hidden: { opacity: 0 },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
  transition: {
    duration: 0.5,
    ease: 'linear' as const,
  },
};

interface ViewControllerProps {
  appConfig: AppConfig;
  interviewDetails?: any;
}

export function ViewController({ appConfig, interviewDetails }: ViewControllerProps) {
  const { isConnectionActive, connect, onDisconnectTransitionComplete } = useConnection();

  const handleAnimationComplete = useCallback(
    (definition: AnimationDefinition) => {
      // manually end the session when the exit animation completes
      if (definition === 'hidden') {
        onDisconnectTransitionComplete();
      }
    },
    [onDisconnectTransitionComplete]
  );

  return (
    <AnimatePresence mode="wait">
      {/* Welcome view */}
      {!isConnectionActive && (
        <MotionWelcomeView
          key="welcome"
          {...VIEW_MOTION_PROPS}
          startButtonText={appConfig.startButtonText}
          onStartCall={connect}
        />
      )}
      {/* Session view */}
      {isConnectionActive && (
        <MotionSessionView
          key="session-view"
          {...VIEW_MOTION_PROPS}
          appConfig={appConfig}
          sessionId={appConfig.sessionId}
          interviewDetails={interviewDetails}
          onAnimationComplete={handleAnimationComplete}
        />
      )}
    </AnimatePresence>
  );
}



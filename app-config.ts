export interface AppConfig {
  pageTitle: string;
  pageDescription: string;
  companyName: string;

  supportsChatInput: boolean;
  supportsVideoInput: boolean;
  supportsScreenShare: boolean;
  isPreConnectBufferEnabled: boolean;

  logo: string;
  startButtonText: string;
  accent?: string;
  logoDark?: string;
  accentDark?: string;

  // for LiveKit Cloud Sandbox
  sandboxId?: string;
  agentName?: string;

  // Session ID for interview context
  sessionId?: string;
}

export const APP_CONFIG_DEFAULTS: AppConfig = {
  companyName: 'Colossal Hub',
  pageTitle: 'AI Interviewer',
  pageDescription: 'An AI-powered interviewer for seamless recruitment.',

  supportsChatInput: true,
  supportsVideoInput: true,
  supportsScreenShare: true,
  isPreConnectBufferEnabled: true,

  logo: '/lk-logo.svg',
  accent: '#034078',
  logoDark: '/lk-logo-dark.svg',
  accentDark: '#1282A2',
  startButtonText: 'Start Interview',

  // for LiveKit Cloud Sandbox
  sandboxId: undefined,
  agentName: undefined,
  sessionId: undefined,
};
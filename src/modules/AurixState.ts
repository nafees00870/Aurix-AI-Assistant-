/**
 * AurixState module
 * Manages reactive application state, visualizer theme definitions,
 * transcript logging, and tool event notifications.
 */

export type AurixConnectionState = 'disconnected' | 'connecting' | 'listening' | 'speaking';

export type VisualizerThemeKey = 'cyan' | 'magenta' | 'emerald' | 'amber' | 'violet';

export interface VisualizerTheme {
  key: VisualizerThemeKey;
  name: string;
  primary: string;
  glow: string;
  coreGradient: string;
  accent: string;
  bgGradient: string;
  border: string;
}

export const THEMES: Record<VisualizerThemeKey, VisualizerTheme> = {
  cyan: {
    key: 'cyan',
    name: 'Atmospheric Cyan',
    primary: '#22D3EE',
    glow: 'rgba(34, 211, 238, 0.4)',
    coreGradient: 'from-cyan-400 via-sky-500 to-blue-600',
    accent: 'cyan',
    bgGradient: 'radial-gradient(circle at 50% 50%, #0a1219 0%, #050505 100%)',
    border: 'border-cyan-500/20',
  },
  magenta: {
    key: 'magenta',
    name: 'Atmospheric Magenta',
    primary: '#F43F5E',
    glow: 'rgba(244, 63, 94, 0.4)',
    coreGradient: 'from-pink-500 via-rose-500 to-purple-600',
    accent: 'pink',
    bgGradient: 'radial-gradient(circle at 50% 50%, #170810 0%, #050505 100%)',
    border: 'border-pink-500/20',
  },
  emerald: {
    key: 'emerald',
    name: 'Atmospheric Emerald',
    primary: '#10B981',
    glow: 'rgba(16, 185, 129, 0.4)',
    coreGradient: 'from-emerald-400 via-teal-500 to-green-600',
    accent: 'emerald',
    bgGradient: 'radial-gradient(circle at 50% 50%, #07150e 0%, #050505 100%)',
    border: 'border-emerald-500/20',
  },
  amber: {
    key: 'amber',
    name: 'Atmospheric Amber',
    primary: '#F59E0B',
    glow: 'rgba(245, 158, 11, 0.4)',
    coreGradient: 'from-amber-400 via-orange-500 to-red-600',
    accent: 'amber',
    bgGradient: 'radial-gradient(circle at 50% 50%, #171005 0%, #050505 100%)',
    border: 'border-amber-500/20',
  },
  violet: {
    key: 'violet',
    name: 'Atmospheric Violet',
    primary: '#A855F7',
    glow: 'rgba(168, 85, 247, 0.4)',
    coreGradient: 'from-purple-400 via-violet-500 to-indigo-700',
    accent: 'violet',
    bgGradient: 'radial-gradient(circle at 50% 50%, #100a1c 0%, #050505 100%)',
    border: 'border-purple-500/20',
  },
};

export type FeedbackRating = 'thumbs_up' | 'thumbs_down';

export type FeedbackCategory =
  | 'personality'
  | 'accuracy'
  | 'speed'
  | 'tone'
  | 'tool_execution'
  | 'other';

export interface ResponseFeedback {
  id: string;
  turnId: string;
  rating: FeedbackRating;
  userPrompt?: string;
  aurixResponse: string;
  textFeedback?: string;
  category?: FeedbackCategory;
  timestamp: string;
}

export interface TranscriptItem {
  id: string;
  sender: 'user' | 'aurix' | 'system';
  text: string;
  timestamp: Date;
  toolCall?: {
    tool: string;
    data: any;
  };
  feedback?: ResponseFeedback;
}

export interface ToolActionItem {
  id: string;
  tool: string;
  data: any;
  timestamp: Date;
  url?: string;
  title?: string;
}

export interface SystemDiagnosticsData {
  systemName: string;
  version: string;
  architect: string;
  creatorVerification: string;
  audioPipeline: string;
  neuralEngine: string;
  latencyEstMs: number;
  status: string;
  personalityProfile: string;
}

/**
 * MicPermissionModal component
 * Atmospheric modal providing clear instructions and troubleshooting
 * when browser microphone permissions are blocked or restricted in iframes.
 */

import React from 'react';
import { VisualizerTheme } from '../modules/AurixState';
import { X, Mic, ShieldAlert, RefreshCw, Sparkles, Volume2, Radio, ExternalLink, HelpCircle } from 'lucide-react';

interface MicPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  onContinueSpeakerMode: () => void;
  onSimulateSpokenTurn: (samplePhrase: string) => void;
  theme: VisualizerTheme;
}

export const MicPermissionModal: React.FC<MicPermissionModalProps> = ({
  isOpen,
  onClose,
  onRetry,
  onContinueSpeakerMode,
  onSimulateSpokenTurn,
  theme,
}) => {
  if (!isOpen) return null;

  const samplePhrases = [
    'Hey Aurix, who created you?',
    'Aurix kaisa hai? Tell me a witty joke in Roman Urdu.',
    'Open YouTube and search for Cyberpunk 2077 music',
    'Switch visualizer theme to Atmospheric Amber',
  ];

  const handleOpenDirectTab = () => {
    try {
      window.open(window.location.href, '_blank', 'noopener,noreferrer');
    } catch (e) {
      window.location.href = window.location.href;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#070b0e]/95 border border-cyan-500/40 p-6 sm:p-7 shadow-[0_0_80px_rgba(34,211,238,0.2)] flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-950/50 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.3)]">
              <Mic className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold tracking-[0.2em] text-white font-mono uppercase">
                  MICROPHONE ACCESS & AUDIO
                </h3>
                <HelpCircle className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="text-[10px] text-cyan-400/80 uppercase tracking-widest font-mono">
                Microphone Permissions & Direct Mode
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Why this happens explanation */}
        <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3 text-xs text-white/80 font-sans">
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-white/90 leading-relaxed font-medium">
              If browser mic permission is already "On" but denied inside the preview window, your browser may be restricting microphone capture inside embedded preview frames.
            </p>
          </div>

          <div className="space-y-2 text-white/70 font-mono text-[11px] bg-black/40 p-3 rounded-xl border border-white/5">
            <p className="text-cyan-300 font-semibold">Solution 1: Open in a Direct Standalone Window</p>
            <p className="text-white/60">Opening the app in its own tab gives it direct hardware access to your microphone without iframe security limits.</p>
            
            <p className="text-cyan-300 font-semibold pt-1 border-t border-white/5">Solution 2: Site Settings Lock Icon</p>
            <p className="text-white/60">Click the Lock / Site Settings icon in your browser URL bar, ensure Microphone is set to <strong>Allow</strong>, then tap Retry.</p>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={handleOpenDirectTab}
            className="flex-1 py-3 px-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_30px_rgba(34,211,238,0.3)]"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open in Direct Window</span>
          </button>

          <button
            onClick={onRetry}
            className="flex-1 py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border border-white/10"
          >
            <RefreshCw className="w-4 h-4 text-cyan-400" />
            <span>Retry Mic in Current Tab</span>
          </button>
        </div>

        {/* Quick Voice Demo Queries */}
        <div className="space-y-2 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Instant Test (Direct Spoken Output)</span>
            </span>
          </div>
          <p className="text-[11px] text-white/50">
            You can also talk with Aurix immediately using one-click voice queries:
          </p>
          <div className="space-y-1.5">
            {samplePhrases.map((phrase, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onSimulateSpokenTurn(phrase);
                  onClose();
                }}
                className="w-full p-2.5 rounded-xl bg-black/40 border border-white/5 text-left text-xs font-mono text-white/80 hover:border-cyan-500/40 hover:text-cyan-300 transition-all flex items-center justify-between group cursor-pointer"
              >
                <span className="truncate">"{phrase}"</span>
                <Volume2 className="w-3.5 h-3.5 text-white/30 group-hover:text-cyan-400 shrink-0 ml-2" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

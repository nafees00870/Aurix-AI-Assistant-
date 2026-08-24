/**
 * CreatorModal component
 * Atmospheric / Immersive Media modal honoring Aurix's creator Nafees Kiani,
 * outlining the architectural blueprint, persona specs, and Gemini Live engine.
 */

import React from 'react';
import { VisualizerTheme } from '../modules/AurixState';
import { AURIX_PERSONALITY } from '../modules/AurixPersonality';
import { X, ShieldCheck, Sparkles, Cpu, Zap, CheckCircle2 } from 'lucide-react';

interface CreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: VisualizerTheme;
}

export const CreatorModal: React.FC<CreatorModalProps> = ({
  isOpen,
  onClose,
  theme,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#070b0e]/95 border border-cyan-500/30 p-6 sm:p-7 shadow-[0_0_80px_rgba(34,211,238,0.15)] flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.2)]">
              <Sparkles className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold tracking-[0.2em] text-white font-mono uppercase">
                  AURIX ARCHITECTURE
                </h3>
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="text-[10px] text-cyan-400/60 uppercase tracking-widest font-mono">
                System Genesis & Intelligence Core
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

        {/* Creator Hero Card */}
        <div className="p-5 rounded-2xl bg-black/60 border border-white/10 flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono font-bold tracking-[0.25em] text-cyan-400 uppercase">
              CREATOR & LEAD ARCHITECT
            </span>
            <span className="text-[9px] font-mono text-cyan-300 font-semibold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30 uppercase tracking-wider">
              VERIFIED
            </span>
          </div>
          <h2 className="text-xl font-light text-white tracking-[0.1em] font-sans">
            {AURIX_PERSONALITY.creator}
          </h2>
          <p className="text-xs text-white/70 leading-relaxed font-sans">
            Aurix was engineered by <strong className="text-cyan-300 font-medium">Nafees Kiani</strong> as an ultra-low latency, voice-first intelligent companion with personality, witty banter, and real-time execution capabilities.
          </p>
        </div>

        {/* Personality & Persona Specs */}
        <div className="space-y-2.5">
          <h4 className="text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-white/40 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Personality Matrix</span>
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
              <span className="text-[9px] text-white/30 block uppercase tracking-wider">PERSONA TONE</span>
              <span className="text-white/90 font-medium">Young, Confident & Witty</span>
            </div>
            <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
              <span className="text-[9px] text-white/30 block uppercase tracking-wider">VOICE PROFILE</span>
              <span className="text-cyan-300 font-medium">Male 'Puck' / Sassy Edge</span>
            </div>
            <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
              <span className="text-[9px] text-white/30 block uppercase tracking-wider">LANGUAGES</span>
              <span className="text-white/90 font-medium">English, Roman Urdu, Urdu</span>
            </div>
            <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
              <span className="text-[9px] text-white/30 block uppercase tracking-wider">INTERRUPTION SPEED</span>
              <span className="text-cyan-400 font-medium">Zero-Latency / Instant</span>
            </div>
          </div>
        </div>

        {/* Technical Architecture */}
        <div className="space-y-2.5">
          <h4 className="text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-white/40 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Engine Specifications</span>
          </h4>
          <ul className="space-y-2 text-xs text-white/70 font-sans">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span><strong>Gemini Live 3.1 Flash:</strong> Direct WebSocket Audio Pipeline</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span><strong>Audio Codec:</strong> 16kHz PCM Full-Duplex In / 24kHz PCM Out</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span><strong>Real-time Function Calling:</strong> YouTube, Google, Clipboard, System Actions</span>
            </li>
          </ul>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold font-mono text-xs uppercase tracking-widest transition-all cursor-pointer shadow-[0_0_30px_rgba(34,211,238,0.3)]"
        >
          Return to Aurix Core
        </button>
      </div>
    </div>
  );
};

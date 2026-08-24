/**
 * DiagnosticsModal component
 * Atmospheric telemetry modal displaying technical audio metrics, latency,
 * neural sync, and creator verification data.
 */

import React from 'react';
import { AurixConnectionState, VisualizerTheme } from '../modules/AurixState';
import { X, Activity, ShieldCheck } from 'lucide-react';

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AurixConnectionState;
  theme: VisualizerTheme;
  latencyMs: number;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({
  isOpen,
  onClose,
  state,
  theme,
  latencyMs,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#070b0e]/95 border border-cyan-500/30 p-6 sm:p-7 shadow-[0_0_80px_rgba(34,211,238,0.15)] flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30">
              <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-[0.2em] font-semibold text-white font-mono">
                AURIX SYSTEM TELEMETRY
              </h3>
              <p className="text-[10px] text-cyan-400/60 uppercase tracking-widest font-mono">
                Neural Interface Diagnostics
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex flex-col gap-1">
            <span className="text-[9px] text-white/40 uppercase tracking-wider">SYSTEM ARCHITECT</span>
            <div className="flex items-center gap-1.5 text-white/90 font-medium">
              <span>Nafees Kiani</span>
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex flex-col gap-1">
            <span className="text-[9px] text-white/40 uppercase tracking-wider">MODEL RUNTIME</span>
            <span className="text-cyan-300 font-medium">Gemini 3.1 Flash Live</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex flex-col gap-1">
            <span className="text-[9px] text-white/40 uppercase tracking-wider">MIC INPUT PIPELINE</span>
            <span className="text-white/80">16,000 Hz / PCM16 Mono</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex flex-col gap-1">
            <span className="text-[9px] text-white/40 uppercase tracking-wider">SPEECH OUTPUT</span>
            <span className="text-cyan-400">24,000 Hz / PCM16 Gapless</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex flex-col gap-1">
            <span className="text-[9px] text-white/40 uppercase tracking-wider">ROUNDTRIP LATENCY</span>
            <span className="text-cyan-300 font-medium">{latencyMs > 0 ? `${latencyMs} ms` : 'Active / Low ms'}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex flex-col gap-1">
            <span className="text-[9px] text-white/40 uppercase tracking-wider">STATE MACHINE</span>
            <span className="text-cyan-400 uppercase tracking-wider font-semibold">{state}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-black/30 border border-white/5 text-xs font-mono text-white/70 space-y-1.5">
          <div className="text-[9px] text-cyan-400 uppercase tracking-[0.2em] font-semibold">
            CAPABILITY REGISTRY
          </div>
          <p className="text-[11px] text-white/60 leading-relaxed font-sans">
            • <strong className="text-white">openWebsite:</strong> Contextual launching & YouTube / Google deep search.
            <br />
            • <strong className="text-white">searchWeb:</strong> Live Google ground integration.
            <br />
            • <strong className="text-white">changeVisualizerTheme:</strong> Real-time palette morphing.
            <br />
            • <strong className="text-white">copyToClipboard:</strong> Seamless text export.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          Close Diagnostics
        </button>
      </div>
    </div>
  );
};

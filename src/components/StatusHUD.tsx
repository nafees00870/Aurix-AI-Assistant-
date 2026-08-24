/**
 * StatusHUD component
 * Top telemetry bar styled with Atmospheric / Immersive Media design aesthetic,
 * featuring creator recognition (Nafees Kiani), audio status, and minimal telemetry.
 */

import React from 'react';
import { AurixConnectionState, VisualizerTheme } from '../modules/AurixState';
import { ShieldCheck, Sparkles, ExternalLink } from 'lucide-react';

interface StatusHUDProps {
  state: AurixConnectionState;
  theme: VisualizerTheme;
  latencyMs: number;
  onOpenCreatorInfo: () => void;
  onOpenDiagnostics: () => void;
  statusMessage?: string;
}

export const StatusHUD: React.FC<StatusHUDProps> = ({
  state,
  theme,
  latencyMs,
  onOpenCreatorInfo,
  onOpenDiagnostics,
  statusMessage,
}) => {
  const getStateDot = () => {
    switch (state) {
      case 'speaking':
        return 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)] animate-pulse';
      case 'listening':
        return 'bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)] animate-pulse';
      case 'connecting':
        return 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)] animate-ping';
      case 'disconnected':
      default:
        return 'bg-white/30';
    }
  };

  const getStateLabel = () => {
    switch (state) {
      case 'speaking':
        return 'Speaking';
      case 'listening':
        return 'Listening';
      case 'connecting':
        return 'Connecting';
      case 'disconnected':
      default:
        return 'Standby';
    }
  };

  const handleOpenDirect = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      window.open(window.location.href, '_blank', 'noopener,noreferrer');
    } catch (err) {
      window.location.href = window.location.href;
    }
  };

  return (
    <header className="w-full max-w-6xl mx-auto px-6 pt-6 pb-2 flex flex-col gap-3 z-30 select-none">
      <div className="w-full flex justify-between items-start">
        {/* Left Branding */}
        <div
          className="flex flex-col gap-0.5 cursor-pointer group"
          onClick={onOpenDiagnostics}
          title="Open Diagnostics Telemetry"
        >
          <div className="flex items-center gap-2.5">
            <span className={`w-2 h-2 rounded-full transition-all duration-300 ${getStateDot()}`} />
            <h1 className="text-2xl font-light tracking-[0.2em] text-cyan-50 transition-colors group-hover:text-white">
              AURIX
            </h1>
            <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded border border-cyan-500/20 text-cyan-400/80 bg-cyan-950/20 font-mono">
              Live 3.1
            </span>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-cyan-400 opacity-70 flex items-center gap-1.5 pl-4.5">
            <span>Personal AI Assistant</span>
            <span className="opacity-40">•</span>
            <span className="text-white/50">{getStateLabel()}</span>
          </p>
        </div>

        {/* Right Controls: Direct Tab Popout & Creator Attribution */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleOpenDirect}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-cyan-300 hover:border-cyan-500/40 text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer"
            title="Open in Direct Standalone Tab (Fixes iframe mic blocks)"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Direct Tab</span>
          </button>

          <button
            onClick={onOpenCreatorInfo}
            className="text-right flex flex-col items-end group cursor-pointer transition-all hover:opacity-100"
            title="Creator Details & Architecture"
          >
            <div className="text-[10px] uppercase tracking-widest text-white/40 mb-0.5 flex items-center gap-1">
              <span>Architecture by</span>
              <ShieldCheck className="w-3 h-3 text-cyan-400/70 group-hover:text-cyan-400 transition-colors" />
            </div>
            <div className="text-sm font-medium tracking-wide text-white/80 group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
              <span>NAFEES KIANI</span>
              <Sparkles className="w-3 h-3 text-cyan-400 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        </div>
      </div>

      {/* Atmospheric Micro Telemetry Line */}
      {statusMessage && (
        <div className="text-center text-[11px] font-mono tracking-wider text-cyan-400/80 animate-fade-in truncate">
          {statusMessage}
        </div>
      )}
    </header>
  );
};

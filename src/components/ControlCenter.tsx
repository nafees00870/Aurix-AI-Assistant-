/**
 * ControlCenter component
 * Atmospheric / Immersive Media Controller with centered glowing mic orb,
 * quick-launch voice prompt chips, speech interruption, format pills,
 * and bottom status telemetry.
 */

import React, { useEffect, useState } from 'react';
import { AurixConnectionState, VisualizerTheme } from '../modules/AurixState';
import { Mic, MicOff, Hand, MessageSquare, HelpCircle, Palette, Sparkles, Send, Volume2, ShieldCheck, Radio } from 'lucide-react';

interface ControlCenterProps {
  state: AurixConnectionState;
  theme: VisualizerTheme;
  isMuted: boolean;
  isMicActive: boolean;
  onToggleConnect: () => void;
  onToggleMute: () => void;
  onManualInterrupt: () => void;
  onToggleTranscript: () => void;
  onTogglePrompts: () => void;
  onToggleTheme: () => void;
  onRequestEnableMic: () => void;
  onSendTextMessage?: (text: string) => void;
  transcriptCount: number;
  latencyMs: number;
}

export const ControlCenter: React.FC<ControlCenterProps> = ({
  state,
  theme,
  isMuted,
  isMicActive,
  onToggleConnect,
  onToggleMute,
  onManualInterrupt,
  onToggleTranscript,
  onTogglePrompts,
  onToggleTheme,
  onRequestEnableMic,
  onSendTextMessage,
  transcriptCount,
  latencyMs,
}) => {
  const isConnected = state !== 'disconnected';
  const isConnecting = state === 'connecting';
  const isSpeaking = state === 'speaking';
  const isListening = state === 'listening';

  // Live session timer
  const [seconds, setSeconds] = useState(0);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    let timer: number | null = null;
    if (isConnected) {
      timer = window.setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isConnected]);

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const ms = Math.floor((totalSecs * 37) % 99);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(ms).padStart(2, '0')}`;
  };

  const getDynamicQuote = () => {
    if (isSpeaking) return '"Streaming real-time voice response..."';
    if (isListening) return '"Go ahead, Nafees. What brilliant plan are we executing today?"';
    if (isConnecting) return '"Syncing with Gemini Live neural cluster..."';
    return '"Tap the core to begin your ultra-low latency voice session."';
  };

  const handleSendPrompt = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputValue.trim();
    if (!query) return;
    onSendTextMessage?.(query);
    setInputValue('');
  };

  const quickPrompts = [
    { label: 'Who created you?', icon: <ShieldCheck className="w-3 h-3 text-cyan-400" /> },
    { label: 'Aurix kaisa hai?', icon: <Sparkles className="w-3 h-3 text-amber-400" /> },
    { label: 'Open YouTube & search Iron Man', icon: <Volume2 className="w-3 h-3 text-rose-400" /> },
    { label: 'Give me a witty roast', icon: <Sparkles className="w-3 h-3 text-emerald-400" /> },
  ];

  return (
    <div className="w-full max-w-4xl px-4 sm:px-6 pb-6 pt-1 flex flex-col items-center gap-4 z-30 select-none">
      {/* Central Spoken Prompt Quote */}
      <div className="text-center space-y-1.5 max-w-xl">
        <p className="text-sm sm:text-base font-light text-white/80 italic transition-all duration-300">
          {getDynamicQuote()}
        </p>
        <div className="flex items-center justify-center gap-2 sm:gap-3 text-[9px] tracking-[0.15em] text-white/35 uppercase font-mono">
          <span>Roman Urdu & English</span>
          <span className="w-1 h-1 bg-white/20 rounded-full" />
          <span>Gemini 3.1 Flash Live</span>
          <span className="w-1 h-1 bg-white/20 rounded-full" />
          <span>{isMicActive ? 'Full Duplex Voice' : 'Speaker Mode'}</span>
        </div>
      </div>

      {/* Quick Voice Chips */}
      <div className="flex items-center justify-center flex-wrap gap-2 max-w-2xl">
        {quickPrompts.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSendTextMessage?.(item.label)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 border border-white/10 hover:border-cyan-500/40 text-white/70 hover:text-cyan-300 text-xs font-mono transition-all backdrop-blur-md cursor-pointer hover:bg-white/5"
          >
            {item.icon}
            <span>"{item.label}"</span>
          </button>
        ))}
      </div>

      {/* Spoken Query Input Bar */}
      <form
        onSubmit={handleSendPrompt}
        className="w-full max-w-md flex items-center gap-2 p-1.5 rounded-2xl bg-black/50 border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] focus-within:border-cyan-500/50 transition-colors"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask Aurix anything in English or Roman Urdu..."
          className="flex-1 bg-transparent px-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none font-mono"
        />
        <button
          type="submit"
          disabled={!inputValue.trim()}
          className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black transition-colors disabled:opacity-20 cursor-pointer"
          title="Send query"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* Main Interactive Button Array */}
      <div className="flex items-center gap-4 sm:gap-6 mt-1">
        {/* Commands / Voice Prompts Drawer */}
        <button
          onClick={onTogglePrompts}
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all text-white/40 hover:text-white cursor-pointer group hover:border-white/20"
          title="Voice Prompts & Commands"
        >
          <HelpCircle className="w-5 h-5 transition-transform group-hover:scale-110" />
        </button>

        {/* Microphone Mode / Re-enable Mic */}
        <button
          onClick={() => {
            if (!isMicActive) {
              onRequestEnableMic();
            } else {
              onToggleMute();
            }
          }}
          disabled={!isConnected}
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
            !isConnected
              ? 'border-white/5 text-white/20 cursor-not-allowed'
              : !isMicActive
              ? 'border-amber-500/40 bg-amber-950/30 text-amber-300 shadow-md hover:border-amber-400'
              : isMuted
              ? 'border-rose-500/40 bg-rose-950/40 text-rose-400'
              : 'border-white/10 hover:bg-white/5 text-white/40 hover:text-white'
          }`}
          title={
            !isMicActive
              ? 'Click to Grant/Enable Microphone Access'
              : isMuted
              ? 'Unmute Microphone'
              : 'Mute Microphone'
          }
        >
          {!isMicActive ? (
            <Radio className="w-5 h-5 text-amber-400 animate-pulse" />
          ) : isMuted ? (
            <MicOff className="w-5 h-5 text-rose-400" />
          ) : (
            <Mic className="w-5 h-5 text-cyan-400" />
          )}
        </button>

        {/* Central Atmospheric Power / Mic Orb Button */}
        <div className="relative flex items-center justify-center">
          {/* Outer Blur Ambient Aura */}
          <div
            className="absolute -inset-4 blur-xl rounded-full pointer-events-none transition-all duration-500 opacity-60"
            style={{
              backgroundColor: isConnected ? `${theme.primary}40` : 'rgba(255,255,255,0.05)',
            }}
          />

          <button
            onClick={onToggleConnect}
            disabled={isConnecting}
            className={`relative w-18 h-18 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-300 transform active:scale-95 cursor-pointer ${
              !isConnected
                ? 'bg-slate-900 border border-white/10 hover:border-white/30 text-white'
                : isSpeaking
                ? 'bg-cyan-400 text-black animate-pulse'
                : 'bg-cyan-400 text-black'
            }`}
            style={{
              backgroundColor: isConnected ? theme.primary : undefined,
              boxShadow: isConnected ? `0 0 45px ${theme.glow}` : undefined,
            }}
            title={!isConnected ? 'Connect Aurix Session' : 'Disconnect Session'}
          >
            {!isConnected ? (
              <svg className="w-8 h-8 text-white/70" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            ) : isConnecting ? (
              <Sparkles className="w-8 h-8 text-black animate-spin" />
            ) : isSpeaking ? (
              <div className="flex items-center gap-1 h-7">
                <span className="w-1.5 h-5 bg-black rounded-full animate-bounce" />
                <span className="w-1.5 h-7 bg-black rounded-full animate-bounce [animation-delay:0.15s]" />
                <span className="w-1.5 h-4 bg-black rounded-full animate-bounce [animation-delay:0.3s]" />
              </div>
            ) : (
              <svg className="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            )}
          </button>
        </div>

        {/* Manual Speech Interrupt Button or Transcript Drawer */}
        {isConnected && isSpeaking ? (
          <button
            onClick={onManualInterrupt}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-amber-500/40 bg-amber-950/40 flex items-center justify-center transition-all text-amber-400 hover:bg-amber-900/50 cursor-pointer shadow-lg shadow-amber-950/30 animate-pulse"
            title="Interrupt Aurix Speech"
          >
            <Hand className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={onToggleTranscript}
            className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all text-white/40 hover:text-white cursor-pointer group hover:border-white/20"
            title="View Real-Time Voice Transcript"
          >
            <MessageSquare className="w-5 h-5 transition-transform group-hover:scale-110" />
            {transcriptCount > 0 && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-black text-[9px] font-bold flex items-center justify-center"
                style={{ backgroundColor: theme.primary }}
              >
                {transcriptCount > 9 ? '9+' : transcriptCount}
              </span>
            )}
          </button>
        )}

        {/* Theme Palette Switcher */}
        <button
          onClick={onToggleTheme}
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all text-white/40 hover:text-white cursor-pointer group hover:border-white/20"
          title="Switch Visualizer Theme"
        >
          <Palette className="w-5 h-5 transition-transform group-hover:scale-110" />
        </button>
      </div>

      {/* Atmospheric Bottom Telemetry Footer */}
      <div className="w-full flex items-center justify-between pt-3 border-t border-white/5 text-[9px] sm:text-[10px] font-mono tracking-[0.2em] text-white/40 uppercase">
        {/* Left Telemetry: Session Time & Tool Context */}
        <div className="flex items-center gap-5 sm:gap-6">
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] text-white/40">Session Time</span>
            <span className="text-xs font-mono transition-colors" style={{ color: theme.primary }}>
              {isConnected ? formatTime(seconds) : '00:00:00'}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] text-white/40">Audio Link</span>
            <span className="text-xs text-white/80 uppercase tracking-wider">
              {isConnected
                ? isMicActive
                  ? isMuted
                    ? 'Mic Muted'
                    : 'Mic + 24kHz Spkr'
                  : 'Speaker Mode'
                : 'Standby'}
            </span>
          </div>
        </div>

        {/* Right Telemetry: Latency Bar & ms */}
        <div className="flex items-center gap-3">
          <div className="w-16 sm:w-24 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: isConnected ? `${Math.min(100, Math.max(15, latencyMs || 42))}%` : '0%',
                backgroundColor: theme.primary,
              }}
            />
          </div>
          <span className="text-[9px] uppercase tracking-[0.2em] text-white/40">
            Latency {isConnected ? `${latencyMs > 0 ? latencyMs : 42}ms` : '--'}
          </span>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { AurixVoiceKey, AURIX_VOICES } from '../modules/AurixState';
import { Mic, Check, Play, Square, Loader2, ChevronDown, Volume2 } from 'lucide-react';

interface VoiceSelectorProps {
  currentVoice: AurixVoiceKey;
  onVoiceChange: (voice: AurixVoiceKey) => void;
  onPreviewVoice?: (voice: AurixVoiceKey) => Promise<void>;
  previewingVoice?: AurixVoiceKey | null;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  currentVoice,
  onVoiceChange,
  onPreviewVoice,
  previewingVoice = null,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const activeConfig = AURIX_VOICES[currentVoice] || AURIX_VOICES.male;

  const handleSelect = (voiceKey: AurixVoiceKey) => {
    onVoiceChange(voiceKey);
    setIsOpen(false);
  };

  const handlePreviewClick = (e: React.MouseEvent, voiceKey: AurixVoiceKey) => {
    e.stopPropagation();
    if (onPreviewVoice) {
      onPreviewVoice(voiceKey);
    }
  };

  return (
    <div className="relative inline-block text-left z-40" ref={dropdownRef}>
      {/* Selector Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all text-xs font-mono backdrop-blur-md cursor-pointer shadow-[0_0_15px_rgba(0,0,0,0.5)] ${
          isOpen
            ? 'bg-cyan-950/70 border-cyan-400/60 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.25)]'
            : 'bg-white/[0.05] hover:bg-cyan-950/40 border-white/10 hover:border-cyan-500/40 text-white/80 hover:text-cyan-200'
        }`}
        title="Select Aurix Spoken Voice"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="text-[13px] leading-none">🎙</span>
        <span className="font-medium text-[11px] tracking-wide">{activeConfig.label}</span>
        <ChevronDown
          className={`w-3 h-3 text-cyan-400/80 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-cyan-300' : ''
          }`}
        />
      </button>

      {/* Popover / Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-black/90 backdrop-blur-2xl border border-cyan-500/30 p-1.5 shadow-[0_10px_35px_rgba(0,0,0,0.8),0_0_25px_rgba(6,182,212,0.15)] animate-fade-in z-50">
          <div className="px-3 py-1.5 border-b border-white/5 mb-1 flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-wider text-cyan-400/80 uppercase font-semibold">
              Aurix Voice
            </span>
            <span className="text-[9px] font-mono text-white/40">Real-Time</span>
          </div>

          <div className="flex flex-col gap-1">
            {(Object.keys(AURIX_VOICES) as AurixVoiceKey[]).map((voiceKey) => {
              const voice = AURIX_VOICES[voiceKey];
              const isSelected = currentVoice === voiceKey;
              const isPlayingThis = previewingVoice === voiceKey;

              return (
                <div
                  key={voiceKey}
                  onClick={() => handleSelect(voiceKey)}
                  className={`group relative flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-cyan-500/15 border border-cyan-400/40 text-cyan-100 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                      : 'hover:bg-white/[0.06] border border-transparent text-white/70 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span className="text-sm">🎙</span>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold tracking-wide font-sans text-white">
                          {voice.label}
                        </span>
                        {isSelected && (
                          <Check className="w-3 h-3 text-cyan-400 stroke-[3]" />
                        )}
                      </div>
                      <span className="text-[10px] text-white/45 truncate group-hover:text-white/60 transition-colors">
                        {voice.description}
                      </span>
                    </div>
                  </div>

                  {/* Preview Play Button */}
                  {onPreviewVoice && (
                    <button
                      type="button"
                      onClick={(e) => handlePreviewClick(e, voiceKey)}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                        isPlayingThis
                          ? 'bg-cyan-400 text-black border-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.5)]'
                          : 'bg-white/5 hover:bg-cyan-950/60 border-white/10 hover:border-cyan-400/40 text-white/50 hover:text-cyan-300'
                      }`}
                      title={`Preview ${voice.label} voice sample`}
                    >
                      {isPlayingThis ? (
                        <Square className="w-2.5 h-2.5 fill-current" />
                      ) : (
                        <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-1 pt-1.5 px-2.5 pb-0.5 border-t border-white/5 text-[9px] font-mono text-white/35 flex items-center justify-between">
            <span>Dynamic Voice Switch</span>
            <span className="text-cyan-400/60">Live Link</span>
          </div>
        </div>
      )}
    </div>
  );
};

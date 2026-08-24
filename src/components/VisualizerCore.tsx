/**
 * VisualizerCore component
 * Atmospheric / Immersive Media Orb with rotating conic glow, concentric scale rings,
 * deep blur lighting, and real-time audio frequency telemetry.
 */

import React, { useEffect, useRef, useState } from 'react';
import { AurixConnectionState, VisualizerTheme } from '../modules/AurixState';
import { AudioStreamer } from '../modules/AudioStreamer';

interface VisualizerCoreProps {
  state: AurixConnectionState;
  theme: VisualizerTheme;
  audioStreamer: AudioStreamer | null;
  isMuted: boolean;
}

export const VisualizerCore: React.FC<VisualizerCoreProps> = ({
  state,
  theme,
  audioStreamer,
  isMuted,
}) => {
  const [audioLevels, setAudioLevels] = useState<number[]>([12, 24, 32, 20, 28, 16]);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const inputDataArray = new Uint8Array(64);
    const outputDataArray = new Uint8Array(64);

    const updateAudioTelemetry = () => {
      let levels: number[] = [10, 16, 22, 18, 20, 12];

      if (state === 'speaking' && audioStreamer?.outputAnalyser) {
        audioStreamer.outputAnalyser.getByteFrequencyData(outputDataArray);
        levels = [
          Math.max(6, (outputDataArray[2] / 255) * 32),
          Math.max(10, (outputDataArray[6] / 255) * 36),
          Math.max(14, (outputDataArray[12] / 255) * 40),
          Math.max(8, (outputDataArray[18] / 255) * 34),
          Math.max(12, (outputDataArray[24] / 255) * 38),
          Math.max(6, (outputDataArray[30] / 255) * 28),
        ];
      } else if (state === 'listening' && audioStreamer?.inputAnalyser && !isMuted) {
        audioStreamer.inputAnalyser.getByteFrequencyData(inputDataArray);
        levels = [
          Math.max(6, (inputDataArray[2] / 255) * 30),
          Math.max(8, (inputDataArray[6] / 255) * 34),
          Math.max(12, (inputDataArray[10] / 255) * 38),
          Math.max(8, (inputDataArray[14] / 255) * 32),
          Math.max(10, (inputDataArray[18] / 255) * 36),
          Math.max(6, (inputDataArray[22] / 255) * 26),
        ];
      } else if (state === 'connecting') {
        const t = Date.now() / 150;
        levels = [
          14 + Math.sin(t) * 8,
          18 + Math.sin(t + 1) * 10,
          24 + Math.sin(t + 2) * 12,
          18 + Math.sin(t + 3) * 10,
          20 + Math.sin(t + 4) * 11,
          14 + Math.sin(t + 5) * 8,
        ];
      }

      setAudioLevels(levels);
      animationFrameRef.current = requestAnimationFrame(updateAudioTelemetry);
    };

    animationFrameRef.current = requestAnimationFrame(updateAudioTelemetry);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [state, audioStreamer, isMuted]);

  const getStateText = () => {
    switch (state) {
      case 'speaking':
        return 'Aurix Speaking';
      case 'listening':
        return 'Listening';
      case 'connecting':
        return 'Initializing';
      case 'disconnected':
      default:
        return 'Standby';
    }
  };

  return (
    <div className="relative flex items-center justify-center w-full flex-1 min-h-[360px] select-none">
      {/* Outer Atmospheric Blur Glow */}
      <div
        className="absolute w-[450px] h-[450px] sm:w-[540px] sm:h-[540px] rounded-full opacity-20 blur-[100px] pointer-events-none transition-all duration-700"
        style={{
          background: `radial-gradient(circle, ${theme.primary} 0%, transparent 70%)`,
        }}
      />

      {/* Relative Ring Structure */}
      <div className="relative w-72 h-72 sm:w-84 sm:h-84 flex items-center justify-center">
        {/* Concentric Outer Ring 1 */}
        <div className="absolute inset-0 border border-white/5 rounded-full scale-110 pointer-events-none" />

        {/* Concentric Outer Ring 2 with Accent */}
        <div
          className="absolute inset-0 border rounded-full scale-125 pointer-events-none transition-transform duration-700"
          style={{ borderColor: `${theme.primary}33` }}
        />

        {/* Outer Rotating Atmospheric Dashed Track */}
        <div
          className="absolute inset-0 border border-white/10 rounded-full scale-140 border-dashed animate-spin-slow pointer-events-none opacity-40"
        />

        {/* Main Central Orb */}
        <div
          className="w-60 h-60 sm:w-68 sm:h-68 rounded-full flex items-center justify-center relative overflow-hidden bg-black transition-all duration-500"
          style={{
            boxShadow: `0 0 90px ${theme.glow}`,
          }}
        >
          {/* Conic Swirling Plasma Filter */}
          <div
            className="absolute inset-0 opacity-45 animate-spin-slow pointer-events-none"
            style={{
              background: `conic-gradient(from 0deg at 50% 50%, transparent 0%, ${theme.primary} 20%, transparent 40%, ${theme.primary} 60%, transparent 80%, ${theme.primary} 100%)`,
              filter: 'blur(32px)',
            }}
          />

          {/* Reverse Glow Layer for Multi-Dimensional Depth */}
          <div
            className="absolute inset-0 opacity-30 animate-spin-reverse-slow pointer-events-none"
            style={{
              background: `conic-gradient(from 180deg at 50% 50%, transparent 0%, ${theme.primary} 30%, transparent 60%, ${theme.primary} 90%)`,
              filter: 'blur(24px)',
            }}
          />

          {/* Inner Glass Orb Interface */}
          <div className="w-44 h-44 sm:w-50 sm:h-50 rounded-full bg-black/85 backdrop-blur-3xl border border-white/10 z-10 flex flex-col items-center justify-center text-center px-6 shadow-inner">
            {/* Status Micro-Header */}
            <span
              className="text-[11px] font-mono uppercase tracking-[0.3em] mb-3 transition-colors duration-300"
              style={{ color: theme.primary }}
            >
              {getStateText()}
            </span>

            {/* Audio Waveform Equalizer Bars */}
            <div className="flex items-end justify-center gap-[4px] h-9 mb-2">
              {audioLevels.map((lvl, index) => (
                <div
                  key={index}
                  className="w-[3.5px] rounded-full transition-all duration-100 ease-out"
                  style={{
                    height: `${Math.min(36, Math.max(4, lvl))}px`,
                    backgroundColor: state === 'disconnected' ? 'rgba(255,255,255,0.2)' : theme.primary,
                    boxShadow: state !== 'disconnected' ? `0 0 8px ${theme.primary}` : undefined,
                  }}
                />
              ))}
            </div>

            {/* Dynamic Sassy Subtitle / Prompt hint */}
            <span className="text-[9px] uppercase tracking-widest text-white/40 font-mono">
              {state === 'speaking'
                ? 'Ultra-Low Latency'
                : state === 'listening'
                ? 'Mic Active'
                : state === 'connecting'
                ? 'Syncing Neural link'
                : 'Tap to Engage'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

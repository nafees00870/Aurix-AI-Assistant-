/**
 * ThemeSelector component
 * Sleek atmospheric modal to switch between visualizer color themes.
 */

import React from 'react';
import { THEMES, VisualizerTheme, VisualizerThemeKey } from '../modules/AurixState';
import { X, Check, Palette } from 'lucide-react';

interface ThemeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: VisualizerTheme;
  onSelectTheme: (themeKey: VisualizerThemeKey) => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onSelectTheme,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-sm rounded-3xl bg-[#070b0e]/95 border border-cyan-500/30 p-6 shadow-[0_0_80px_rgba(34,211,238,0.15)] flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30">
              <Palette className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-[0.2em] font-semibold text-white font-mono">
                Visualizer Themes
              </h3>
              <p className="text-[10px] text-cyan-400/60 uppercase tracking-widest font-mono">
                Atmospheric Glow Palette
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {Object.values(THEMES).map((thm) => {
            const isSelected = thm.key === currentTheme.key;
            return (
              <button
                key={thm.key}
                onClick={() => {
                  onSelectTheme(thm.key);
                  onClose();
                }}
                className={`w-full p-3.5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-black/80 border-cyan-500/60 shadow-[0_0_25px_rgba(34,211,238,0.15)]'
                    : 'bg-black/30 border-white/5 hover:border-white/20 hover:bg-black/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded-full border border-white/20 shadow-inner"
                    style={{ backgroundColor: thm.primary, boxShadow: `0 0 10px ${thm.glow}` }}
                  />
                  <div className="text-left font-mono">
                    <span className="text-xs font-semibold text-white block">{thm.name}</span>
                    <span className="text-[10px] text-white/40 uppercase tracking-wider">Atmospheric Resonance</span>
                  </div>
                </div>

                {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
              </button>
            );
          })}
        </div>

        <p className="text-[10px] text-center font-mono text-white/40 uppercase tracking-wider">
          Spoken: "Switch theme to Atmospheric Amber"
        </p>
      </div>
    </div>
  );
};

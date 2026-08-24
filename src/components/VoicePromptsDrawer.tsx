/**
 * VoicePromptsDrawer component
 * Atmospheric modal showcasing voice prompt ideas, Roman Urdu phrases,
 * creator inquiries (Nafees Kiani), and contextual commands.
 */

import React from 'react';
import { VisualizerTheme } from '../modules/AurixState';
import { X, Sparkles, Youtube, MessageCircle, HelpCircle, ArrowRight, ShieldCheck } from 'lucide-react';

interface VoicePromptsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  theme: VisualizerTheme;
}

export const VoicePromptsDrawer: React.FC<VoicePromptsDrawerProps> = ({
  isOpen,
  onClose,
  theme,
}) => {
  if (!isOpen) return null;

  const categories = [
    {
      title: 'Identity & Creator (Nafees Kiani)',
      icon: <ShieldCheck className="w-4 h-4 text-cyan-400" />,
      prompts: [
        'Who created you?',
        'Tell me about your architect Nafees Kiani.',
        'Nafees Kiani ne tumhe kaise design kiya?',
      ],
    },
    {
      title: 'Roman Urdu & Urdu Conversation',
      icon: <MessageCircle className="w-4 h-4 text-sky-400" />,
      prompts: [
        'Aurix kaisa hai? Aaj ka kya scene hai?',
        'Haan bhai, kuch mazedaar batao.',
        'Tum meri kya kya help kar sakte ho?',
      ],
    },
    {
      title: 'Contextual Multi-Step Actions',
      icon: <Youtube className="w-4 h-4 text-rose-400" />,
      prompts: [
        'Step 1: "Open YouTube"',
        'Step 2 (Contextual): "Now search for Iron Man"',
        'Open GitHub and search for React projects',
        'Google search the latest space telescope discoveries',
      ],
    },
    {
      title: 'Witty Banter & System Control',
      icon: <Sparkles className="w-4 h-4 text-amber-400" />,
      prompts: [
        'Give me a witty roast or one-liner.',
        'Switch visualizer theme to Atmospheric Amber.',
        'Run complete system diagnostics.',
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-md rounded-3xl bg-[#070b0e]/95 border border-cyan-500/30 p-6 sm:p-7 shadow-[0_0_80px_rgba(34,211,238,0.15)] flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-[0.2em] font-semibold text-white font-mono">
                Spoken Voice Commands
              </h3>
              <p className="text-[10px] text-cyan-400/60 uppercase tracking-widest font-mono">
                Speak Naturally to Aurix
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

        <div className="space-y-4">
          {categories.map((cat, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] font-semibold text-white/50">
                {cat.icon}
                <span>{cat.title}</span>
              </div>
              <div className="space-y-1.5">
                {cat.prompts.map((p, pIdx) => (
                  <div
                    key={pIdx}
                    className="p-3 rounded-2xl bg-black/40 border border-white/5 text-xs text-white/80 flex items-center justify-between hover:border-white/20 transition-colors font-sans"
                  >
                    <span className="leading-snug">"{p}"</span>
                    <ArrowRight className="w-3.5 h-3.5 text-cyan-400/60 shrink-0 ml-2" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold font-mono text-xs uppercase tracking-widest transition-all cursor-pointer shadow-[0_0_25px_rgba(34,211,238,0.3)]"
        >
          Got It, Let's Speak
        </button>
      </div>
    </div>
  );
};

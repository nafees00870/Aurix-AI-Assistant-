/**
 * ToolActionCard component
 * Atmospheric / Immersive Media HUD card triggered upon tool executions.
 */

import React from 'react';
import { ToolActionItem, VisualizerTheme } from '../modules/AurixState';
import { ExternalLink, CheckCircle, Search, Youtube, Globe, Palette, Copy, X } from 'lucide-react';

interface ToolActionCardProps {
  action: ToolActionItem | null;
  theme: VisualizerTheme;
  onDismiss: () => void;
}

export const ToolActionCard: React.FC<ToolActionCardProps> = ({
  action,
  theme,
  onDismiss,
}) => {
  if (!action) return null;

  const getToolIcon = () => {
    switch (action.tool) {
      case 'openWebsite':
        if (action.data?.service === 'youtube' || action.data?.url?.includes('youtube.com')) {
          return <Youtube className="w-4 h-4 text-rose-400" />;
        }
        return <Globe className="w-4 h-4 text-cyan-400" />;
      case 'searchWeb':
        return <Search className="w-4 h-4 text-sky-400" />;
      case 'changeVisualizerTheme':
        return <Palette className="w-4 h-4 text-pink-400" />;
      case 'copyToClipboard':
        return <Copy className="w-4 h-4 text-emerald-400" />;
      default:
        return <CheckCircle className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 w-[92%] max-w-md z-40 animate-slide-down select-none">
      <div className="relative p-4 rounded-3xl bg-[#0a1219]/95 border border-cyan-500/30 backdrop-blur-2xl shadow-[0_0_50px_rgba(34,211,238,0.15)] flex flex-col gap-3">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-black/60 border border-white/10">
              {getToolIcon()}
            </div>
            <div>
              <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-cyan-400 font-bold block">
                TOOL EXECUTED • {action.tool}
              </span>
              <h4 className="text-xs font-semibold text-white/90 truncate max-w-[240px]">
                {action.title || 'Action Executed Successfully'}
              </h4>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Details / URL Link Trigger */}
        {action.url && (
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-black/50 border border-white/5 text-xs font-mono">
            <span className="text-white/50 truncate flex-1 text-[11px]">{action.url}</span>
            <a
              href={action.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-colors shrink-0 shadow-[0_0_15px_rgba(34,211,238,0.3)]"
            >
              <span>Open</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {action.data?.searchQuery && (
          <div className="text-xs text-white/70 font-mono bg-black/40 p-2.5 rounded-xl border border-white/5">
            Query: <span className="text-cyan-300 font-semibold">"{action.data.searchQuery}"</span>
          </div>
        )}

        {action.data?.text && action.tool === 'copyToClipboard' && (
          <div className="text-xs text-emerald-300 font-mono bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-500/20 truncate">
            Copied: "{action.data.text}"
          </div>
        )}
      </div>
    </div>
  );
};

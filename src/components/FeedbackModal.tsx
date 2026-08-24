/**
 * FeedbackModal component
 * Atmospheric dashboard to review stored conversation feedback,
 * personality & latency metrics, satisfaction rates, and detailed notes.
 */

import React, { useState, useEffect } from 'react';
import { ResponseFeedback, VisualizerTheme } from '../modules/AurixState';
import { feedbackService, FeedbackSummary } from '../modules/FeedbackService';
import {
  X,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  MessageSquare,
  Trash2,
  TrendingUp,
  CheckCircle2,
  Clock,
  Filter,
} from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: VisualizerTheme;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [feedbacks, setFeedbacks] = useState<ResponseFeedback[]>([]);
  const [summary, setSummary] = useState<FeedbackSummary>({
    total: 0,
    thumbsUp: 0,
    thumbsDown: 0,
    satisfactionRate: 100,
  });
  const [filter, setFilter] = useState<'all' | 'thumbs_up' | 'thumbs_down'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    feedbackService.loadFromBackend().catch(() => {});

    const unsubscribe = feedbackService.subscribe((list) => {
      setFeedbacks(list);
      setSummary(feedbackService.getSummary());
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredFeedbacks = feedbacks.filter((f) => {
    if (filter === 'all') return true;
    return f.rating === filter;
  });

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all stored feedback logs?')) {
      feedbackService.clearAllFeedback();
    }
  };

  const handleDeleteItem = (turnId: string) => {
    feedbackService.removeFeedback(turnId);
  };

  const getCategoryBadgeColor = (cat?: string) => {
    switch (cat) {
      case 'personality':
        return 'bg-purple-950/60 text-purple-300 border-purple-500/30';
      case 'accuracy':
        return 'bg-cyan-950/60 text-cyan-300 border-cyan-500/30';
      case 'speed':
        return 'bg-amber-950/60 text-amber-300 border-amber-500/30';
      case 'tone':
        return 'bg-rose-950/60 text-rose-300 border-rose-500/30';
      case 'tool_execution':
        return 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-white/10 text-white/70 border-white/10';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#070b0e] border border-cyan-500/30 rounded-3xl shadow-[0_0_80px_rgba(6,182,212,0.2)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-b from-cyan-950/20 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-white tracking-wide font-sans flex items-center gap-2">
                Response Feedback & Quality Insights
              </h2>
              <p className="text-xs text-white/40 font-mono">
                Stored ratings for Aurix personality and response performance
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Analytics Summary Banner */}
        <div className="grid grid-cols-3 gap-3 p-4 sm:p-5 border-b border-white/5 bg-white/[0.02]">
          <div className="p-3 sm:p-4 rounded-2xl bg-black/40 border border-white/5 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] uppercase font-mono tracking-wider text-white/40 mb-1">
              Total Ratings
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-white">
              {summary.total}
            </span>
          </div>

          <div className="p-3 sm:p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400/70 mb-1 flex items-center gap-1">
              <ThumbsUp className="w-3 h-3" /> Satisfaction
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-300">
              {summary.total > 0 ? `${summary.satisfactionRate}%` : '--'}
            </span>
          </div>

          <div className="p-3 sm:p-4 rounded-2xl bg-black/40 border border-white/5 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] uppercase font-mono tracking-wider text-white/40 mb-1">
              Breakdown
            </span>
            <div className="flex items-center gap-2 text-xs font-mono font-medium">
              <span className="text-emerald-400 flex items-center gap-0.5">
                +{summary.thumbsUp}
              </span>
              <span className="text-white/20">/</span>
              <span className="text-rose-400 flex items-center gap-0.5">
                -{summary.thumbsDown}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-white/40 mr-1" />
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full font-mono text-xs transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              All ({feedbacks.length})
            </button>
            <button
              onClick={() => setFilter('thumbs_up')}
              className={`px-3 py-1 rounded-full font-mono text-xs transition-all cursor-pointer ${
                filter === 'thumbs_up'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              Positive ({summary.thumbsUp})
            </button>
            <button
              onClick={() => setFilter('thumbs_down')}
              className={`px-3 py-1 rounded-full font-mono text-xs transition-all cursor-pointer ${
                filter === 'thumbs_down'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              Needs Work ({summary.thumbsDown})
            </button>
          </div>

          {feedbacks.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-[11px] text-white/40 hover:text-rose-400 font-mono transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" /> Clear History
            </button>
          )}
        </div>

        {/* Feedback List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 font-sans text-xs">
          {filteredFeedbacks.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center text-white/30 gap-2.5">
              <MessageSquare className="w-7 h-7 text-cyan-400/40" />
              <p className="text-xs font-mono uppercase tracking-wider">No ratings recorded yet</p>
              <p className="text-[11px] text-white/40 max-w-sm">
                Rate Aurix's responses with 👍 or 👎 in the transcript or after a voice turn to track performance!
              </p>
            </div>
          ) : (
            filteredFeedbacks.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-cyan-500/30 transition-all space-y-2.5 relative group"
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border ${
                        item.rating === 'thumbs_up'
                          ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40'
                          : 'bg-rose-950/50 text-rose-300 border-rose-500/40'
                      }`}
                    >
                      {item.rating === 'thumbs_up' ? (
                        <>
                          <ThumbsUp className="w-3 h-3" /> Helpful / Positive
                        </>
                      ) : (
                        <>
                          <ThumbsDown className="w-3 h-3" /> Needs Improvement
                        </>
                      )}
                    </span>

                    {item.category && (
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase tracking-wider ${getCategoryBadgeColor(
                          item.category
                        )}`}
                      >
                        {item.category.replace('_', ' ')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/30 font-mono flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <button
                      onClick={() => handleDeleteItem(item.turnId)}
                      className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-rose-400 transition-opacity p-1 cursor-pointer"
                      title="Delete this feedback"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* User Prompt (if present) */}
                {item.userPrompt && (
                  <div className="text-[11px] text-white/50 bg-black/30 px-3 py-1.5 rounded-xl border border-white/5 font-mono">
                    <span className="text-cyan-400 font-semibold">User: </span>"{item.userPrompt}"
                  </div>
                )}

                {/* Aurix response excerpt */}
                <div className="text-xs text-white/90 leading-relaxed font-sans pl-2 border-l-2 border-cyan-500/40">
                  <span className="text-[10px] font-mono uppercase text-cyan-400/80 block mb-0.5">
                    Aurix Response:
                  </span>
                  {item.aurixResponse}
                </div>

                {/* Text comment / notes (if provided) */}
                {item.textFeedback && (
                  <div className="text-xs text-amber-200/90 bg-amber-950/20 border border-amber-500/20 px-3 py-2 rounded-xl italic font-sans flex items-start gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>"{item.textFeedback}"</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-[#05080a] flex items-center justify-between text-[11px] font-mono text-white/40">
          <span>Synced locally & to Aurix Feedback Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-sans transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

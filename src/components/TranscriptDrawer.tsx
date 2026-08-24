/**
 * TranscriptDrawer component
 * Slide-out atmospheric HUD inspection panel displaying the real-time transcript stream
 * of user speech, Aurix responses, executed tool calls, and response feedback ratings.
 */

import React, { useEffect, useRef, useState } from 'react';
import { TranscriptItem, VisualizerTheme, FeedbackRating, FeedbackCategory } from '../modules/AurixState';
import { feedbackService } from '../modules/FeedbackService';
import {
  X,
  Copy,
  Trash2,
  Radio,
  Check,
  Volume2,
  User,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Sparkles,
  Send,
} from 'lucide-react';

interface TranscriptDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  transcripts: TranscriptItem[];
  theme: VisualizerTheme;
  onClear: () => void;
  onOpenFeedbackModal?: () => void;
}

export const TranscriptDrawer: React.FC<TranscriptDrawerProps> = ({
  isOpen,
  onClose,
  transcripts,
  theme,
  onClear,
  onOpenFeedbackModal,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeFeedbackTurnId, setActiveFeedbackTurnId] = useState<string | null>(null);
  const [activeTextNotes, setActiveTextNotes] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<FeedbackCategory>('personality');
  const [submittedTurnIds, setSubmittedTurnIds] = useState<Record<string, FeedbackRating>>({});

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts, isOpen]);

  // Real-time subscription to feedback changes
  useEffect(() => {
    const updateRecords = () => {
      const records: Record<string, FeedbackRating> = {};
      transcripts.forEach((t) => {
        if (t.sender === 'aurix') {
          const fb = feedbackService.getFeedbackForTurn(t.id);
          if (fb) {
            records[t.id] = fb.rating;
          }
        }
      });
      setSubmittedTurnIds(records);
    };

    updateRecords();
    const unsubscribe = feedbackService.subscribe(() => {
      updateRecords();
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, transcripts]);

  const handleCopyAll = async () => {
    if (transcripts.length === 0) return;
    const text = transcripts
      .map(
        (t) =>
          `[${t.timestamp.toLocaleTimeString()}] ${
            t.sender === 'aurix' ? 'Aurix' : t.sender === 'user' ? 'User' : 'System'
          }: ${t.text}`
      )
      .join('\n');

    try {
      if (navigator?.clipboard?.writeText && document.hasFocus()) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    } catch (e) {
      console.warn('[TranscriptDrawer] Clipboard copy notice:', e);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRateResponse = async (
    item: TranscriptItem,
    rating: FeedbackRating,
    e?: React.MouseEvent
  ) => {
    e?.stopPropagation();

    // Find preceding user question if available
    const itemIdx = transcripts.findIndex((t) => t.id === item.id);
    let userPrompt: string | undefined = undefined;
    for (let i = itemIdx - 1; i >= 0; i--) {
      if (transcripts[i].sender === 'user') {
        userPrompt = transcripts[i].text;
        break;
      }
    }

    await feedbackService.submitFeedback({
      turnId: item.id,
      rating,
      aurixResponse: item.text,
      userPrompt,
    });

    setSubmittedTurnIds((prev) => ({ ...prev, [item.id]: rating }));
    setActiveFeedbackTurnId(item.id);
  };

  const handleSubmitTextFeedback = async (item: TranscriptItem) => {
    const currentRating = submittedTurnIds[item.id] || 'thumbs_up';
    const itemIdx = transcripts.findIndex((t) => t.id === item.id);
    let userPrompt: string | undefined = undefined;
    for (let i = itemIdx - 1; i >= 0; i--) {
      if (transcripts[i].sender === 'user') {
        userPrompt = transcripts[i].text;
        break;
      }
    }

    await feedbackService.submitFeedback({
      turnId: item.id,
      rating: currentRating,
      aurixResponse: item.text,
      userPrompt,
      textFeedback: activeTextNotes,
      category: activeCategory,
    });

    setActiveTextNotes('');
    setActiveFeedbackTurnId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-md h-full bg-[#070b0e]/95 border-l border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col z-50">
        {/* Drawer Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30">
              <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-[0.2em] font-semibold text-white/90 font-mono">
                Live Voice Stream
              </h3>
              <p className="text-[10px] text-cyan-400/60 font-mono uppercase tracking-wider">
                Full-Duplex Speech & Feedback
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onOpenFeedbackModal && (
              <button
                onClick={onOpenFeedbackModal}
                className="p-2 rounded-xl text-cyan-400/70 hover:text-cyan-300 hover:bg-cyan-950/40 border border-transparent hover:border-cyan-500/30 transition-colors cursor-pointer"
                title="View All Feedback & Insights"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleCopyAll}
              disabled={transcripts.length === 0}
              className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-20 cursor-pointer"
              title="Copy Entire Transcript"
            >
              {copied ? <Check className="w-4 h-4 text-cyan-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={onClear}
              disabled={transcripts.length === 0}
              className="p-2 rounded-xl text-white/40 hover:text-rose-400 hover:bg-white/5 transition-colors disabled:opacity-20 cursor-pointer"
              title="Clear Log"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="Close Drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Transcript Content List */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
          {transcripts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-white/30 gap-3 p-6">
              <Volume2 className="w-8 h-8 opacity-40 text-cyan-400" />
              <p className="text-xs font-mono uppercase tracking-wider">No voice turns recorded yet</p>
              <p className="text-[11px] text-white/40 max-w-xs font-sans">
                Start a session and speak naturally in English, Roman Urdu, or Urdu.
              </p>
            </div>
          ) : (
            transcripts.map((item) => {
              const currentRating = submittedTurnIds[item.id];
              const isFeedbackOpen = activeFeedbackTurnId === item.id;

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    item.sender === 'aurix'
                      ? 'bg-[#0b151e]/90 border-cyan-500/30 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.05)]'
                      : item.sender === 'user'
                      ? 'bg-black/60 border-white/10 text-white/90 ml-4'
                      : 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300 italic'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/5 text-[10px] text-white/40">
                    <span className="flex items-center gap-1.5 font-bold uppercase tracking-widest">
                      {item.sender === 'aurix' ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          <span className="text-cyan-400">Aurix</span>
                        </>
                      ) : item.sender === 'user' ? (
                        <>
                          <User className="w-3 h-3 text-white/40" />
                          <span>You (Spoken)</span>
                        </>
                      ) : (
                        <span className="text-emerald-400">System Tool</span>
                      )}
                    </span>
                    <span>{item.timestamp.toLocaleTimeString()}</span>
                  </div>

                  <p className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-white/80">{item.text}</p>

                  {/* Feedback Controls for Aurix responses */}
                  {item.sender === 'aurix' && (
                    <div className="mt-3 pt-2.5 border-t border-white/5 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/40">
                          <span>Rate response:</span>
                          <button
                            onClick={(e) => handleRateResponse(item, 'thumbs_up', e)}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                              currentRating === 'thumbs_up'
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-400/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                                : 'bg-white/5 text-white/40 hover:text-emerald-400 border-white/10 hover:border-emerald-500/30'
                            }`}
                            title="Good response / Thumbs up"
                          >
                            <ThumbsUp className="w-3 h-3" />
                            {currentRating === 'thumbs_up' && <span className="text-[9px]">Helpful</span>}
                          </button>

                          <button
                            onClick={(e) => handleRateResponse(item, 'thumbs_down', e)}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                              currentRating === 'thumbs_down'
                                ? 'bg-rose-950/60 text-rose-300 border-rose-400/50 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                                : 'bg-white/5 text-white/40 hover:text-rose-400 border-white/10 hover:border-rose-500/30'
                            }`}
                            title="Needs work / Thumbs down"
                          >
                            <ThumbsDown className="w-3 h-3" />
                            {currentRating === 'thumbs_down' && <span className="text-[9px]">Needs Work</span>}
                          </button>
                        </div>

                        {currentRating && (
                          <button
                            onClick={() =>
                              setActiveFeedbackTurnId(isFeedbackOpen ? null : item.id)
                            }
                            className="text-[10px] font-mono text-cyan-400/70 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                          >
                            <MessageSquare className="w-2.5 h-2.5" />
                            <span>{isFeedbackOpen ? 'Hide Notes' : '+ Add Note'}</span>
                          </button>
                        )}
                      </div>

                      {/* Optional Expandable Feedback Details Form */}
                      {isFeedbackOpen && (
                        <div className="mt-1 p-2.5 rounded-xl bg-black/50 border border-cyan-500/20 space-y-2 animate-fade-in font-sans">
                          {/* Quick Category Chips */}
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[9px] font-mono text-white/40 uppercase mr-1">Aspect:</span>
                            {(
                              [
                                { key: 'personality', label: 'Personality' },
                                { key: 'accuracy', label: 'Accuracy' },
                                { key: 'speed', label: 'Speed' },
                                { key: 'tone', label: 'Tone' },
                                { key: 'other', label: 'Other' },
                              ] as const
                            ).map((cat) => (
                              <button
                                key={cat.key}
                                type="button"
                                onClick={() => setActiveCategory(cat.key)}
                                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                                  activeCategory === cat.key
                                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50'
                                    : 'bg-white/5 text-white/40 border-white/10 hover:text-white'
                                }`}
                              >
                                {cat.label}
                              </button>
                            ))}
                          </div>

                          {/* Brief Text Feedback Input */}
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={activeTextNotes}
                              onChange={(e) => setActiveTextNotes(e.target.value)}
                              placeholder="Optional feedback note (e.g., great roast, too slow)..."
                              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/40 font-sans"
                            />
                            <button
                              type="button"
                              onClick={() => handleSubmitTextFeedback(item)}
                              className="p-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black transition-colors cursor-pointer shrink-0"
                              title="Save note"
                            >
                              <Send className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-white/5 bg-[#05080a] flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-white/30 font-mono">
          <span>Gemini Live 3.1 Flash</span>
          {onOpenFeedbackModal && (
            <button
              onClick={onOpenFeedbackModal}
              className="text-cyan-400 hover:underline cursor-pointer"
            >
              Feedback Insights ➔
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


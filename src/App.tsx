/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { LiveSession } from './modules/LiveSession';
import { ToolExecutionManager } from './modules/ToolExecution';
import {
  AurixConnectionState,
  VisualizerThemeKey,
  TranscriptItem,
  THEMES,
  FeedbackRating,
} from './modules/AurixState';
import { Aurix3DCore } from './components/Aurix3DCore';
import { TranscriptDrawer } from './components/TranscriptDrawer';
import { FeedbackModal } from './components/FeedbackModal';
import { feedbackService } from './modules/FeedbackService';
import {
  Mic,
  ArrowUp,
  Image as ImageIcon,
  X,
  MessageSquare,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Check,
} from 'lucide-react';

export default function App() {
  const [state, setState] = useState<AurixConnectionState>('disconnected');
  const [isMicActive, setIsMicActive] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [latestAurixTurn, setLatestAurixTurn] = useState<TranscriptItem | null>(null);
  const [recentRatedTurnId, setRecentRatedTurnId] = useState<string | null>(null);
  const [quickRatedRating, setQuickRatedRating] = useState<FeedbackRating | null>(null);
  const [showQuickFeedbackPrompt, setShowQuickFeedbackPrompt] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Managers
  const liveSessionRef = useRef<LiveSession | null>(null);
  const toolManagerRef = useRef<ToolExecutionManager | null>(null);

  // Initialize tool & live session
  useEffect(() => {
    const toolManager = new ToolExecutionManager({
      onThemeChange: (_newTheme: VisualizerThemeKey) => {},
      onToolExecuted: (action) => {
        if (action.tool === 'openWebsite' && action.data?.url) {
          try {
            window.open(action.data.url, '_blank', 'noopener,noreferrer');
          } catch (e) {
            console.log('[Aurix Tool] Window open handled via action');
          }
        }
      },
      onDiagnosticsReceived: () => {},
    });

    toolManagerRef.current = toolManager;

    const session = new LiveSession(toolManager, {
      onStateChange: (newState) => {
        setState(newState);
      },
      onLatencyUpdate: () => {},
      onTranscriptReceived: (item) => {
        setTranscripts((prev) => {
          const idx = prev.findIndex((t) => t.id === item.id);
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = item;
            return updated;
          }
          return [...prev, item];
        });

        if (item.sender === 'aurix' && item.text?.trim()) {
          setLatestAurixTurn(item);
          setShowQuickFeedbackPrompt(true);
        }
      },
      onMicStateChange: (active) => {
        setIsMicActive(active);
      },
      onError: (errMsg) => {
        console.warn('[Aurix Error]', errMsg);
      },
      onStatusMessage: (msg) => {
        console.log('[Aurix Status]', msg);
      },
    });

    liveSessionRef.current = session;

    return () => {
      session.disconnect();
    };
  }, []);

  const handleToggleMic = async () => {
    if (!liveSessionRef.current) return;

    // Immediately unlock audio context on direct user gesture
    liveSessionRef.current.getAudioStreamer().initPlaybackContext();

    if (state === 'disconnected') {
      try {
        const res = await liveSessionRef.current.connect(true);
        setIsMicActive(res.micActive);
      } catch (err) {
        try {
          await liveSessionRef.current.connect(false);
        } catch (e) {
          console.error(e);
        }
      }
    } else {
      if (isMicActive) {
        liveSessionRef.current.toggleMute();
        setIsMicActive(false);
      } else {
        const success = await liveSessionRef.current.enableMicrophone();
        setIsMicActive(success);
        setState('listening');
      }
    }
  };

  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputValue.trim();
    if (!query && !attachedImage) return;
    if (!liveSessionRef.current) return;

    // Unlock audio context on user gesture
    liveSessionRef.current.getAudioStreamer().initPlaybackContext();
    const currentPrompt = query || 'What is in this image?';
    const payloadImage = attachedImage || undefined;

    setInputValue('');
    setAttachedImage(null);

    // Record user transcript turn locally
    const userTurnItem: TranscriptItem = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: currentPrompt,
      timestamp: new Date(),
    };
    setTranscripts((prev) => [...prev, userTurnItem]);

    // Ensure session is active
    if (state === 'disconnected') {
      try {
        await liveSessionRef.current.connect(false);
      } catch (err) {
        console.warn('[Aurix] Connect notice:', err);
      }
    }

    // Send immediately without artificial delay
    liveSessionRef.current?.sendTextMessage(currentPrompt, payloadImage);
  };

  const handleQuickRate = async (rating: FeedbackRating) => {
    if (!latestAurixTurn) return;

    // Find preceding user question if available
    const itemIdx = transcripts.findIndex((t) => t.id === latestAurixTurn.id);
    let userPrompt: string | undefined = undefined;
    for (let i = itemIdx - 1; i >= 0; i--) {
      if (transcripts[i].sender === 'user') {
        userPrompt = transcripts[i].text;
        break;
      }
    }

    await feedbackService.submitFeedback({
      turnId: latestAurixTurn.id,
      rating,
      aurixResponse: latestAurixTurn.text,
      userPrompt,
    });

    setRecentRatedTurnId(latestAurixTurn.id);
    setQuickRatedRating(rating);

    // Auto-hide the quick rating prompt after 3.5s
    setTimeout(() => {
      setShowQuickFeedbackPrompt(false);
      setQuickRatedRating(null);
    }, 3500);
  };

  const handleImageFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      if (base64) {
        setAttachedImage(base64);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const isListeningOrSpeaking = (state === 'listening' || state === 'speaking') && isMicActive;
  const isAlreadyRated = latestAurixTurn && recentRatedTurnId === latestAurixTurn.id;

  return (
    <div className="relative w-screen h-[100dvh] overflow-hidden flex flex-col justify-between items-center bg-[#000000] text-white font-sans select-none px-4 py-3 sm:py-5">
      {/* Deep Subtle Cyan Ambient Lighting */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
        style={{
          background: 'radial-gradient(circle at 50% 45%, rgba(6, 45, 55, 0.32) 0%, rgba(2, 12, 18, 0.15) 45%, #000000 80%)',
        }}
      />

      {/* 1. Header Typography & HUD Quick Actions */}
      <header className="w-full max-w-2xl pt-1 sm:pt-2 z-20 flex items-center justify-between px-2">
        {/* Left: Feedback & Quality Insights */}
        <button
          onClick={() => setIsFeedbackModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-cyan-950/40 border border-white/10 hover:border-cyan-500/30 text-white/60 hover:text-cyan-300 transition-all text-xs font-mono backdrop-blur-md cursor-pointer shadow-[0_0_15px_rgba(0,0,0,0.4)]"
          title="View Conversation Feedback & Insights"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden xs:inline text-[11px]">Insights</span>
        </button>

        {/* Center: Title */}
        <h1 className="text-xs sm:text-sm font-mono tracking-[0.45em] text-cyan-100/70 uppercase font-light drop-shadow-[0_0_15px_rgba(34,211,238,0.35)] flex items-center gap-2">
          AURIX
        </h1>

        {/* Right: Transcript Drawer Button */}
        <button
          onClick={() => setIsTranscriptOpen(true)}
          className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-cyan-950/40 border border-white/10 hover:border-cyan-500/30 text-white/60 hover:text-cyan-300 transition-all text-xs font-mono backdrop-blur-md cursor-pointer shadow-[0_0_15px_rgba(0,0,0,0.4)]"
          title="Open Live Voice Transcripts & Feedback"
        >
          <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden xs:inline text-[11px]">Logs</span>
          {transcripts.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-cyan-500 text-black text-[9px] font-bold">
              {transcripts.length > 99 ? '99+' : transcripts.length}
            </span>
          )}
        </button>
      </header>

      {/* Hidden File Input for Device Image Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFileSelected}
        className="hidden"
      />

      {/* 2. Main Stage: 3D Aurix Core Visualizer */}
      <main className="flex-1 w-full max-w-lg flex items-center justify-center relative my-auto z-10 px-1">
        <Aurix3DCore
          state={state}
          audioStreamer={liveSessionRef.current?.getAudioStreamer() || null}
          isMicActive={isMicActive}
        />
      </main>

      {/* 3. Lower Interaction Section: Feedback Pill + Input Bar + Central Microphone */}
      <div className="w-full max-w-sm sm:max-w-md flex flex-col items-center gap-2.5 sm:gap-3.5 z-20 mb-1 sm:mb-3">
        {/* Floating Quick Response Feedback Pill */}
        {showQuickFeedbackPrompt && latestAurixTurn && (
          <div className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-xl border border-cyan-500/30 text-xs shadow-[0_0_25px_rgba(6,182,212,0.15)] animate-fade-in font-sans">
            <span className="text-[11px] text-white/70 truncate max-w-[180px] sm:max-w-[220px]">
              {isAlreadyRated
                ? quickRatedRating === 'thumbs_up'
                  ? '✨ Marked helpful!'
                  : '📝 Feedback noted!'
                : 'Rate Aurix response:'}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleQuickRate('thumbs_up')}
                className={`p-1.5 rounded-full border transition-all cursor-pointer ${
                  quickRatedRating === 'thumbs_up'
                    ? 'bg-emerald-500 text-black border-emerald-400'
                    : 'bg-white/5 hover:bg-emerald-950/40 text-white/50 hover:text-emerald-300 border-white/10 hover:border-emerald-500/40'
                }`}
                title="Helpful / Good response"
              >
                {quickRatedRating === 'thumbs_up' ? (
                  <Check className="w-3 h-3 stroke-[3]" />
                ) : (
                  <ThumbsUp className="w-3 h-3" />
                )}
              </button>

              <button
                onClick={() => handleQuickRate('thumbs_down')}
                className={`p-1.5 rounded-full border transition-all cursor-pointer ${
                  quickRatedRating === 'thumbs_down'
                    ? 'bg-rose-500 text-white border-rose-400'
                    : 'bg-white/5 hover:bg-rose-950/40 text-white/50 hover:text-rose-300 border-white/10 hover:border-rose-500/40'
                }`}
                title="Needs improvement"
              >
                <ThumbsDown className="w-3 h-3" />
              </button>

              <button
                onClick={() => setIsTranscriptOpen(true)}
                className="text-[10px] text-cyan-400 hover:underline font-mono ml-1 cursor-pointer"
                title="Open transcript & add text comment"
              >
                + Note
              </button>

              <button
                onClick={() => setShowQuickFeedbackPrompt(false)}
                className="p-1 text-white/30 hover:text-white transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Attached Image Thumbnail Preview */}
        {attachedImage && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-cyan-200 text-xs shadow-md animate-fade-in">
            <img
              src={`data:image/jpeg;base64,${attachedImage}`}
              alt="Attached preview"
              className="w-5 h-5 rounded-md object-cover border border-cyan-400/60"
            />
            <span className="text-[10px] font-mono tracking-wider">Image Attached</span>
            <button
              type="button"
              onClick={() => setAttachedImage(null)}
              className="ml-1 p-0.5 rounded-full hover:bg-white/20 text-white/70 hover:text-white cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Text Input Bar */}
        <form
          onSubmit={handleSendText}
          className="w-full relative flex items-center rounded-full bg-white/[0.04] backdrop-blur-xl border border-cyan-500/25 px-4 py-2 sm:py-2.5 shadow-[0_0_25px_rgba(6,182,212,0.12)] transition-all duration-300 focus-within:border-cyan-400/50 focus-within:shadow-[0_0_35px_rgba(34,211,238,0.22)]"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={attachedImage ? 'Ask about this image...' : 'Ask Aurix anything...'}
            className="w-full bg-transparent text-xs sm:text-sm font-sans text-white/90 placeholder:text-white/35 focus:outline-none pr-14 tracking-wide"
          />

          <div className="absolute right-2 flex items-center gap-1.5">
            {/* Image Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-cyan-300 hover:border-cyan-400/30 transition-all cursor-pointer"
              title="Attach an Image"
            >
              <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputValue.trim() && !attachedImage}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 transition-all duration-200 hover:bg-cyan-500/40 hover:text-cyan-100 disabled:opacity-0 disabled:pointer-events-none cursor-pointer"
              aria-label="Send"
            >
              <ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
            </button>
          </div>
        </form>

        {/* Central Microphone Button */}
        <div className="relative flex items-center justify-center">
          {/* Animated Expanding Glow Ring on Active */}
          {isListeningOrSpeaking && (
            <div className="absolute inset-0 -m-3 sm:-m-4 rounded-full border border-cyan-400/30 animate-ping pointer-events-none opacity-40" />
          )}

          <button
            onClick={handleToggleMic}
            className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-500 cursor-pointer backdrop-blur-xl ${
              isListeningOrSpeaking
                ? 'bg-cyan-950/40 border-2 border-cyan-400 text-cyan-300 shadow-[0_0_40px_rgba(34,211,238,0.55)] scale-105'
                : 'bg-white/[0.04] border border-cyan-500/30 text-white/70 hover:text-cyan-300 hover:border-cyan-400/60 shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:shadow-[0_0_30px_rgba(34,211,238,0.3)]'
            }`}
            aria-label="Toggle Microphone"
          >
            <Mic
              className={`w-6 h-6 sm:w-6.5 sm:h-6.5 transition-transform duration-300 ${
                isListeningOrSpeaking ? 'scale-110 text-cyan-300' : 'text-white/60'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 4. Creator Credit (Very Bottom) */}
      <footer className="pb-1.5 sm:pb-2.5 flex flex-col items-center justify-center select-none z-20">
        <span className="text-[8px] sm:text-[9px] font-mono tracking-[0.38em] text-white/25 uppercase">
          CREATED BY
        </span>
        <span className="text-[10px] sm:text-[11px] font-mono tracking-[0.28em] text-cyan-400/75 uppercase font-medium mt-0.5 drop-shadow-[0_0_8px_rgba(34,211,238,0.25)]">
          NAFEES KIANI
        </span>
      </footer>

      {/* Slide-out Live Transcript & Feedback Drawer */}
      <TranscriptDrawer
        isOpen={isTranscriptOpen}
        onClose={() => setIsTranscriptOpen(false)}
        transcripts={transcripts}
        theme={THEMES.cyan}
        onClear={() => setTranscripts([])}
        onOpenFeedbackModal={() => setIsFeedbackModalOpen(true)}
      />

      {/* Response Feedback & Insights Dashboard Modal */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        theme={THEMES.cyan}
      />
    </div>
  );
}


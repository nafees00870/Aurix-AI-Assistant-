import React, { useState, useEffect } from 'react';
import { apiKeyManager } from '../modules/ApiKeyManager';
import {
  Key,
  Eye,
  EyeOff,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Sparkles,
  Trash2,
  Clipboard,
} from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyConfigured?: (key: string) => void;
  isMandatoryInitialPrompt?: boolean;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onKeyConfigured,
  isMandatoryInitialPrompt = false,
}) => {
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [hasExistingKey, setHasExistingKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const existing = apiKeyManager.getApiKey();
      setKeyInput(existing);
      setHasExistingKey(Boolean(existing));
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setKeyInput(text.trim());
        }
      }
    } catch {
      // Clipboard access might be blocked in some iframe contexts
    }
  };

  const handleVerifyAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = keyInput.trim();
    if (!cleanKey) {
      setErrorMsg('Please enter a valid Gemini API key.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const result = await apiKeyManager.verifyApiKey(cleanKey);
    setIsVerifying(false);

    if (result.valid) {
      apiKeyManager.setApiKey(cleanKey);
      setSuccessMsg('Gemini API Key verified and activated successfully!');
      setHasExistingKey(true);

      setTimeout(() => {
        onKeyConfigured?.(cleanKey);
        onClose();
      }, 1100);
    } else {
      setErrorMsg(result.error || 'Failed to verify API key. Please double-check the key.');
    }
  };

  const handleRemoveKey = () => {
    apiKeyManager.clearApiKey();
    setKeyInput('');
    setHasExistingKey(false);
    setSuccessMsg('API Key removed. Aurix will require a key to connect.');
    setTimeout(() => {
      onKeyConfigured?.('');
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-cyan-500/35 bg-[#071118] p-6 shadow-[0_0_50px_rgba(6,182,212,0.2)] text-slate-100">
        
        {/* Glow ambient background element */}
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white font-mono flex items-center gap-2">
                Connect Gemini API Key
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Required
                </span>
              </h3>
              <p className="text-xs text-white/50">
                Setup your personal key once • Stored securely on your device
              </p>
            </div>
          </div>

          {!isMandatoryInitialPrompt && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleVerifyAndSave} className="py-5 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-cyan-300 tracking-wider uppercase">
                Google Gemini API Key
              </label>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-200 hover:underline transition"
              >
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>Get Free Key (Google AI Studio)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="relative flex items-center">
              <input
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => {
                  setKeyInput(e.target.value);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                placeholder="AIzaSy..."
                className="w-full bg-black/60 rounded-xl border border-white/15 focus:border-cyan-400 pl-3.5 pr-20 py-2.5 text-xs sm:text-sm font-mono text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition"
                autoFocus
              />

              <div className="absolute right-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePaste}
                  className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-md transition"
                  title="Paste from clipboard"
                >
                  <Clipboard className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-md transition"
                  title={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-white/40">
              No need to edit any <code>.env</code> file. Your key stays in your phone/browser local storage and activates real-time voice streaming immediately.
            </p>
          </div>

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            {hasExistingKey ? (
              <button
                type="button"
                onClick={handleRemoveKey}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove Key
              </button>
            ) : (
              <div />
            )}

            <div className="w-full sm:w-auto flex items-center justify-end gap-2">
              {!isMandatoryInitialPrompt && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs text-white/60 hover:text-white transition"
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                disabled={isVerifying || !keyInput.trim()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.3)] transition disabled:opacity-40 disabled:pointer-events-none active:scale-95"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Key className="w-3.5 h-3.5" />
                    <span>Connect & Start Aurix</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Informative Footer */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-white/40 font-mono">
          <span>Security: Client-side Encrypted Storage</span>
          <span>Model: Gemini 2.5 Flash / Live API</span>
        </div>

      </div>
    </div>
  );
};

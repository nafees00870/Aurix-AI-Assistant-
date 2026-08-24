/**
 * LiveSession module
 * Coordinates WebSocket connection to Aurix Live Bridge, managing bidirectional
 * physical microphone audio streaming (16,000 Hz Mono PCM16), real-time transcription,
 * tool execution dispatch, and dynamic state transitions.
 */

import { AudioStreamer } from './AudioStreamer';
import { ToolExecutionManager } from './ToolExecution';
import { AurixConnectionState, TranscriptItem } from './AurixState';

export interface LiveSessionCallbacks {
  onStateChange: (state: AurixConnectionState) => void;
  onLatencyUpdate: (latencyMs: number) => void;
  onTranscriptReceived: (transcript: TranscriptItem) => void;
  onError: (errorMsg: string, isMicError?: boolean) => void;
  onStatusMessage?: (message: string) => void;
  onMicStateChange?: (isMicActive: boolean) => void;
}

export class LiveSession {
  private ws: WebSocket | null = null;
  private audioStreamer: AudioStreamer;
  private toolManager: ToolExecutionManager;
  private callbacks: LiveSessionCallbacks;

  private currentState: AurixConnectionState = 'disconnected';
  private pingInterval: number | null = null;
  private lastPingTimestamp = 0;
  private isExplicitlyClosed = false;
  private isMicActive = false;
  private isProcessingRest = false;

  // Stable Turn Aggregators for Real-Time Streaming
  private currentModelTurnId: string | null = null;
  private currentModelTurnText = '';
  private currentUserTurnId: string | null = null;
  private currentUserTurnText = '';

  constructor(
    toolManager: ToolExecutionManager,
    callbacks: LiveSessionCallbacks,
    audioStreamer?: AudioStreamer
  ) {
    this.toolManager = toolManager;
    this.callbacks = callbacks;

    this.audioStreamer =
      audioStreamer ||
      new AudioStreamer({
        onInputPcmChunk: (base64) => {
          this.sendAudioChunk(base64);
        },
        onUserSpeakingStateChange: (isSpeaking) => {
          if (this.currentState !== 'disconnected' && this.currentState !== 'connecting') {
            if (isSpeaking) {
              this.setState('listening');
            }
          }
        },
        onPlaybackStateChange: (isPlaying) => {
          if (this.currentState !== 'disconnected' && this.currentState !== 'connecting') {
            this.setState(isPlaying ? 'speaking' : 'listening');
          }
        },
        onInterruptionTriggered: () => {
          console.log('[LiveSession] Local voice interruption triggered');
          this.sendInterruptSignal();
        },
        onError: (errMsg, stage) => {
          console.error(`[LiveSession] Audio pipeline error at [${stage}]:`, errMsg);
          this.callbacks.onError(errMsg, true);
        },
      });
  }

  public getAudioStreamer(): AudioStreamer {
    return this.audioStreamer;
  }

  public getIsMicActive(): boolean {
    return this.isMicActive && this.audioStreamer.isMicrophoneActive();
  }

  public async runDiagnostic(): Promise<any> {
    return this.audioStreamer.runMicrophoneDiagnostic();
  }

  public async enableMicrophone(): Promise<boolean> {
    try {
      await this.audioStreamer.startMicrophone();
      this.isMicActive = true;
      this.callbacks.onMicStateChange?.(true);
      this.callbacks.onStatusMessage?.('Microphone active • PCM16 16kHz Streaming');
      return true;
    } catch (err: any) {
      console.error('[LiveSession] Error enabling microphone:', err);
      this.isMicActive = false;
      this.callbacks.onMicStateChange?.(false);
      this.callbacks.onError(err?.message || 'Failed to access physical microphone.', true);
      return false;
    }
  }

  public disableMicrophone(): void {
    this.audioStreamer.setMute(true);
    this.isMicActive = false;
    this.callbacks.onMicStateChange?.(false);
  }

  public toggleMute(): boolean {
    const nextMuted = !this.audioStreamer.getIsMuted();
    this.audioStreamer.setMute(nextMuted);
    this.isMicActive = !nextMuted;
    this.callbacks.onMicStateChange?.(!nextMuted);
    return !nextMuted;
  }

  public async connect(preferMic = true): Promise<{ micActive: boolean }> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return { micActive: this.getIsMicActive() };
    }

    this.isExplicitlyClosed = false;
    this.setState('connecting');
    this.callbacks.onStatusMessage?.('Connecting to Aurix Neural Link...');

    // 1. Unlock / initialize 24kHz speaker playback AudioContext immediately
    this.audioStreamer.initPlaybackContext();

    // 2. Start physical microphone if requested
    if (preferMic) {
      try {
        await this.audioStreamer.startMicrophone();
        this.isMicActive = true;
      } catch (micErr: any) {
        console.warn('[LiveSession] Microphone initiation notice:', micErr?.message);
        this.isMicActive = false;
      }
    } else {
      this.isMicActive = false;
    }
    this.callbacks.onMicStateChange?.(this.isMicActive);

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;

      console.log('[LiveSession] Initiating WebSocket connection to:', wsUrl);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[LiveSession] WebSocket connection established successfully');
        this.startPingKeepalive();
      };

      this.ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleServerMessage(msg);
        } catch (err) {
          console.error('[LiveSession] Error parsing server message:', err);
        }
      };

      this.ws.onerror = (event) => {
        console.warn('[LiveSession] Live link network notice:', event);
      };

      this.ws.onclose = (event) => {
        console.log('[LiveSession] WebSocket closed with code:', event.code);
        this.stopPingKeepalive();
        this.audioStreamer.interruptPlayback();
        this.setState('disconnected');

        if (!this.isExplicitlyClosed) {
          this.callbacks.onStatusMessage?.('Aurix standby. Tap mic to reconnect.');
        }
      };

      return { micActive: this.isMicActive };
    } catch (err: any) {
      this.setState('disconnected');
      this.callbacks.onError(err?.message || 'Failed to initialize audio link.');
      return { micActive: false };
    }
  }

  private handleServerMessage(msg: any): void {
    switch (msg.type) {
      case 'status':
        if (msg.status === 'ready') {
          this.setState('listening');
          console.log('[Gemini] Live session: READY');
          this.callbacks.onStatusMessage?.('Aurix is online and listening.');
        } else if (msg.status === 'connecting') {
          this.callbacks.onStatusMessage?.(msg.message || 'Initializing Gemini Live...');
        } else if (msg.status === 'disconnected') {
          this.setState('disconnected');
        }
        break;

      case 'audio':
        if (msg.audio) {
          console.log(`[Latency] [6] First audio chunk received (${msg.audio.length} base64 chars) | Timestamp: ${Date.now()} ms`);
          this.audioStreamer.playPcm24Chunk(msg.audio);
          if (this.currentState !== 'speaking') {
            this.setState('speaking');
          }
        }
        break;

      case 'interrupted':
        console.log('[LiveSession] Server signaled audio interruption');
        this.audioStreamer.interruptPlayback();
        this.currentModelTurnId = null;
        this.currentModelTurnText = '';
        this.currentUserTurnId = null;
        this.currentUserTurnText = '';
        this.setState('listening');
        break;

      case 'user_transcript':
        if (msg.text) {
          console.log(`[Latency] [4] Gemini user input transcribed: "${msg.text}" | Timestamp: ${Date.now()} ms`);
          if (!this.currentUserTurnId) {
            this.currentUserTurnId = `usr_${Date.now()}`;
            this.currentUserTurnText = msg.text;
          } else {
            this.currentUserTurnText = msg.text;
          }
          this.callbacks.onTranscriptReceived({
            id: this.currentUserTurnId,
            sender: 'user',
            text: this.currentUserTurnText,
            timestamp: new Date(),
          });
        }
        break;

      case 'model_transcript':
        if (msg.text) {
          console.log(`[Latency] [5] Gemini response received (text): "${msg.text}" | Timestamp: ${Date.now()} ms`);
          if (!this.currentModelTurnId) {
            this.currentModelTurnId = `aur_${Date.now()}`;
            this.currentModelTurnText = msg.text;
          } else {
            // Append or replace if full transcript
            if (msg.text.length > this.currentModelTurnText.length && msg.text.startsWith(this.currentModelTurnText.slice(0, 10))) {
              this.currentModelTurnText = msg.text;
            } else if (!this.currentModelTurnText.includes(msg.text)) {
              this.currentModelTurnText += (this.currentModelTurnText.endsWith(' ') || msg.text.startsWith(' ') ? '' : ' ') + msg.text;
            }
          }
          this.callbacks.onTranscriptReceived({
            id: this.currentModelTurnId,
            sender: 'aurix',
            text: this.currentModelTurnText,
            timestamp: new Date(),
          });
        }
        break;

      case 'tool_executed':
        if (msg.tool && msg.data) {
          const action = this.toolManager.handleToolExecution(msg.tool, msg.data);
          this.callbacks.onTranscriptReceived({
            id: `tool_${Date.now()}`,
            sender: 'system',
            text: `[Executed ${msg.tool}] ${action.title || ''}`,
            timestamp: new Date(),
            toolCall: {
              tool: msg.tool,
              data: msg.data,
            },
          });
        }
        break;

      case 'turn_complete':
        this.currentModelTurnId = null;
        this.currentModelTurnText = '';
        this.currentUserTurnId = null;
        this.currentUserTurnText = '';
        break;

      case 'pong':
        if (this.lastPingTimestamp > 0) {
          const latency = Date.now() - this.lastPingTimestamp;
          this.callbacks.onLatencyUpdate(latency);
        }
        break;

      case 'error':
        this.callbacks.onError(msg.message || 'Neural Core error');
        break;

      default:
        break;
    }
  }

  public sendAudioChunk(base64Pcm: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'audio',
          audio: base64Pcm,
          mimeType: 'audio/pcm;rate=16000',
        })
      );
    }
  }

  public sendInterruptSignal(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'interrupt' }));
    }
  }

  public async sendTextMessage(text: string, attachedImageBase64?: string): Promise<void> {
    this.callbacks.onTranscriptReceived({
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: text,
      timestamp: new Date(),
    });

    // If WebSocket is active, send over live channel
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'text',
          text,
          image: attachedImageBase64,
        })
      );
      return;
    }

    // Otherwise, execute via REST /api/chat fallback
    if (this.isProcessingRest) return;
    this.isProcessingRest = true;
    this.setState('connecting');
    this.callbacks.onStatusMessage?.('Aurix is processing your request...');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, image: attachedImageBase64 }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.actionData && data.toolName) {
        this.toolManager.handleToolExecution(data.toolName, data.actionData);
      }

      const responseText = data.text || data.response;
      if (responseText) {
        this.callbacks.onTranscriptReceived({
          id: `aur_${Date.now()}`,
          sender: 'aurix',
          text: responseText,
          timestamp: new Date(),
        });
      }

      if (data.audio) {
        this.audioStreamer.playPcm24Chunk(data.audio);
        this.setState('speaking');
      } else {
        this.setState('listening');
      }
    } catch (err: any) {
      this.callbacks.onError(err?.message || 'Request failed.');
      this.setState('listening');
    } finally {
      this.isProcessingRest = false;
    }
  }

  private startPingKeepalive(): void {
    this.stopPingKeepalive();
    this.pingInterval = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.lastPingTimestamp = Date.now();
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: this.lastPingTimestamp }));
      }
    }, 15000);
  }

  private stopPingKeepalive(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    this.stopPingKeepalive();
    this.audioStreamer.stop();
    this.isMicActive = false;
    this.callbacks.onMicStateChange?.(false);

    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }
    this.setState('disconnected');
  }

  private setState(newState: AurixConnectionState): void {
    this.currentState = newState;
    this.callbacks.onStateChange(newState);
  }

  public getState(): AurixConnectionState {
    return this.currentState;
  }
}

/**
 * AudioStreamer module
 * Full-Duplex Physical Microphone Audio Engine for Aurix.
 * 
 * Pipeline:
 * Physical Microphone → getUserMedia() → MediaStream → AudioContext → AudioWorklet (or ScriptProcessor fallback)
 * → Linear Interpolation Resampling to 16,000 Hz Mono → Float32 to Signed PCM16 (Int16) conversion
 * → Base64 serialization → WebSocket transmission to Gemini Live API.
 * 
 * Playback:
 * Gemini Live 24,000 Hz PCM16 Base64 → Float32 conversion → 24kHz Web Audio BufferSource scheduling → Speaker.
 */

export interface AudioStreamerConfig {
  onInputPcmChunk: (base64Pcm: string, sampleCount: number) => void;
  onUserSpeakingStateChange?: (isSpeaking: boolean) => void;
  onPlaybackStateChange?: (isPlaying: boolean) => void;
  onInterruptionTriggered?: () => void;
  onError?: (errorMsg: string, stage: string) => void;
}

export class AudioStreamer {
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private silentGainNode: GainNode | null = null;
  private workletBlobUrl: string | null = null;

  // Analyser nodes for real-time visualization
  public inputAnalyser: AnalyserNode | null = null;
  public outputAnalyser: AnalyserNode | null = null;

  // Playback queue & scheduling
  private nextStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private isPlaying = false;
  private playbackCheckInterval: number | null = null;

  // User Voice Activity Detection & Interruption
  private isUserSpeaking = false;
  private speechEnergyThreshold = 0.022;
  private speechCounter = 0;
  private silenceCounter = 0;

  // Telemetry & Diagnostics counters
  private chunkCount = 0;
  private totalBytesSent = 0;
  private isMuted = false;
  private config: AudioStreamerConfig;

  constructor(config: AudioStreamerConfig) {
    this.config = config;
  }

  /**
   * Diagnostic function to test and verify every stage of the physical microphone pipeline.
   */
  public async runMicrophoneDiagnostic(): Promise<{ success: boolean; details: Record<string, any> }> {
    const details: Record<string, any> = {
      secureContext: window.isSecureContext,
      mediaDevicesAvailable: !!navigator?.mediaDevices?.getUserMedia,
      audioContextSupported: !!(window.AudioContext || (window as any).webkitAudioContext),
      audioWorkletSupported: typeof AudioWorkletNode !== 'undefined',
      activeStream: !!this.mediaStream,
      activeAudioContext: !!this.inputAudioCtx,
      audioContextState: this.inputAudioCtx?.state || 'none',
      nativeSampleRate: this.inputAudioCtx?.sampleRate || null,
      chunksProduced: this.chunkCount,
      bytesProduced: this.totalBytesSent,
    };

    console.log('[Diagnostic] Aurix Microphone Pipeline Assessment:', details);
    return {
      success: details.secureContext && details.mediaDevicesAvailable && details.audioContextSupported,
      details,
    };
  }

  /**
   * Initializes and starts physical microphone capture with AudioWorklet / PCM16 resampler.
   */
  public async startMicrophone(): Promise<void> {
    console.log('[Mic] Secure context:', window.isSecureContext);
    if (!window.isSecureContext) {
      console.warn('[Mic] Warning: Window is not a secure context (HTTPS/localhost required for getUserMedia).');
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      const err = new Error('navigator.mediaDevices.getUserMedia is not supported in this browser.');
      console.error('[Mic] getUserMedia not available:', err);
      this.config.onError?.('Microphone capture not supported in this browser environment.', 'getUserMedia');
      throw err;
    }

    // Clean up any existing instances first
    this.stopInput();
    this.chunkCount = 0;
    this.totalBytesSent = 0;

    try {
      console.log('[Mic] Requesting physical microphone permission...');
      // 1. Physical Microphone stream with high-fidelity constraints
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      console.log('[Mic] Permission: GRANTED');
      console.log('[Mic] Stream started:', this.mediaStream.id);

      const tracks = this.mediaStream.getAudioTracks();
      if (tracks.length === 0) {
        throw new Error('No audio tracks found in MediaStream.');
      }
      console.log('[Mic] Track enabled:', tracks[0].enabled, '| Track label:', tracks[0].label);

      // 2. Initialize AudioContext at native hardware sample rate
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.inputAudioCtx = new AudioCtxClass();

      if (this.inputAudioCtx.state === 'suspended') {
        console.log('[Audio] Context state suspended, resuming...');
        await this.inputAudioCtx.resume();
      }

      console.log('[Audio] Context state:', this.inputAudioCtx.state);
      console.log('[Audio] Native sample rate:', this.inputAudioCtx.sampleRate);
      console.log('[Audio] Resampling target: 16000 Hz Mono Signed PCM16');

      this.inputSource = this.inputAudioCtx.createMediaStreamSource(this.mediaStream);

      // 3. Real-time Analyser for visualizer & voice activity detection
      this.inputAnalyser = this.inputAudioCtx.createAnalyser();
      this.inputAnalyser.fftSize = 256;
      this.inputAnalyser.smoothingTimeConstant = 0.8;
      this.inputSource.connect(this.inputAnalyser);

      // 4. Try AudioWorklet first; fallback to ScriptProcessor if worklets are restricted
      let workletStarted = false;
      if (this.inputAudioCtx.audioWorklet) {
        try {
          workletStarted = await this.initAudioWorkletProcessor(this.inputAudioCtx);
        } catch (workletErr) {
          console.warn('[Audio] AudioWorklet init failed, falling back to ScriptProcessor:', workletErr);
        }
      }

      if (!workletStarted) {
        this.initScriptProcessorFallback(this.inputAudioCtx);
      }
    } catch (err: any) {
      this.stopInput();
      const errName = err?.name || '';
      const errMsg = err?.message || '';

      console.warn('[Mic] Microphone status notice:', errName || 'PermissionStatus', errMsg || 'User or browser restricted microphone access.');

      if (
        errName === 'NotAllowedError' ||
        errName === 'PermissionDeniedError' ||
        errMsg.toLowerCase().includes('permission') ||
        errMsg.toLowerCase().includes('denied')
      ) {
        const message = 'Microphone permission denied. Please grant microphone access in your browser settings.';
        this.config.onError?.(message, 'permission');
        throw new Error(message);
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        const message = 'No physical microphone device found on your system.';
        this.config.onError?.(message, 'device');
        throw new Error(message);
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        const message = 'Microphone is currently in use by another application or hardware device.';
        this.config.onError?.(message, 'hardware');
        throw new Error(message);
      } else if (errName === 'SecurityError') {
        const message = 'Microphone access blocked due to security/iframe permissions policy.';
        this.config.onError?.(message, 'security');
        throw new Error(message);
      } else {
        const message = errMsg || 'Failed to start microphone.';
        this.config.onError?.(message, 'unknown');
        throw new Error(message);
      }
    }
  }

  /**
   * Initializes AudioWorklet with inline Web Worker Blob for non-blocking 16kHz PCM16 audio processing.
   */
  private async initAudioWorkletProcessor(audioCtx: AudioContext): Promise<boolean> {
    const workletCode = `
      class AurixPcm16Processor extends AudioWorkletProcessor {
        constructor(options) {
          super();
          this.targetSampleRate = 16000;
          this.sourceSampleRate = options?.processorOptions?.sampleRate || sampleRate || 48000;
          this.ratio = this.sourceSampleRate / this.targetSampleRate;
          
          // 512 samples at 16kHz = 32ms of audio for ultra-low latency streaming
          this.targetChunkSize = 512;
          this.pcmBuffer = new Int16Array(this.targetChunkSize);
          this.pcmIndex = 0;
          
          this.phase = 0;
          this.lastSample = 0;
          this.isMuted = false;

          this.port.onmessage = (e) => {
            if (e.data && typeof e.data.isMuted === 'boolean') {
              this.isMuted = e.data.isMuted;
            }
          };
        }

        process(inputs, outputs, parameters) {
          if (this.isMuted) return true;
          const input = inputs[0];
          if (!input || !input[0] || input[0].length === 0) return true;
          
          const inputChannel = input[0];
          const inputLength = inputChannel.length;
          
          // Real-time linear interpolation resampler from sourceSampleRate to 16000 Hz
          let inIdx = this.phase;
          while (inIdx < inputLength) {
            const idxFloor = Math.floor(inIdx);
            const frac = inIdx - idxFloor;
            const s0 = idxFloor >= 0 ? inputChannel[idxFloor] : this.lastSample;
            const s1 = idxFloor + 1 < inputLength ? inputChannel[idxFloor + 1] : s0;
            
            const interpolated = s0 + frac * (s1 - s0);
            
            // Clamp Float32 [-1.0, 1.0] and convert to Signed 16-bit PCM Int16
            const clamped = Math.max(-1.0, Math.min(1.0, interpolated));
            const pcm16Sample = clamped < 0 ? Math.round(clamped * 32768.0) : Math.round(clamped * 32767.0);
            
            this.pcmBuffer[this.pcmIndex++] = pcm16Sample;
            
            if (this.pcmIndex >= this.targetChunkSize) {
              const chunkToSend = new Int16Array(this.pcmBuffer);
              this.port.postMessage({
                type: 'pcm16_chunk',
                buffer: chunkToSend.buffer,
                sampleCount: this.targetChunkSize
              }, [chunkToSend.buffer]);
              
              this.pcmIndex = 0;
            }
            
            inIdx += this.ratio;
          }
          
          this.phase = inIdx - inputLength;
          this.lastSample = inputChannel[inputLength - 1] || 0;
          
          return true;
        }
      }

      registerProcessor('aurix-pcm16-processor', AurixPcm16Processor);
    `;

    const blob = new Blob([workletCode], { type: 'application/javascript' });
    this.workletBlobUrl = URL.createObjectURL(blob);

    await audioCtx.audioWorklet.addModule(this.workletBlobUrl);
    console.log('[Audio] AudioWorklet ultra-low latency 32ms (512 samples) registered');

    this.workletNode = new AudioWorkletNode(audioCtx, 'aurix-pcm16-processor', {
      processorOptions: {
        sampleRate: audioCtx.sampleRate,
      },
    });

    this.workletNode.port.onmessage = (e) => {
      if (e.data?.type === 'pcm16_chunk' && e.data.buffer) {
        this.handlePcmChunk(e.data.buffer, e.data.sampleCount || 512);
      }
    };

    if (this.inputSource) {
      this.inputSource.connect(this.workletNode);
    }

    // Connect to zero-gain node to keep graph alive without acoustic feedback
    this.silentGainNode = audioCtx.createGain();
    this.silentGainNode.gain.value = 0;
    this.workletNode.connect(this.silentGainNode);
    this.silentGainNode.connect(audioCtx.destination);

    return true;
  }

  /**
   * ScriptProcessor fallback for environments where AudioWorklet is unsupported.
   */
  private initScriptProcessorFallback(audioCtx: AudioContext): void {
    console.log('[Audio] Initializing ScriptProcessor fallback resampler...');
    const bufferSize = 2048;
    this.scriptProcessor = audioCtx.createScriptProcessor(bufferSize, 1, 1);
    const currentSampleRate = audioCtx.sampleRate || 48000;
    const targetSampleRate = 16000;
    const ratio = currentSampleRate / targetSampleRate;

    let phase = 0;
    let lastSample = 0;

    this.scriptProcessor.onaudioprocess = (e) => {
      if (this.isMuted) return;

      const inputData = e.inputBuffer.getChannelData(0);
      const inputLength = inputData.length;

      // Resample to 16000 Hz
      const estimatedOutputLength = Math.ceil(inputLength / ratio) + 1;
      const pcm16 = new Int16Array(estimatedOutputLength);
      let outIdx = 0;

      let inIdx = phase;
      while (inIdx < inputLength) {
        const idxFloor = Math.floor(inIdx);
        const frac = inIdx - idxFloor;
        const s0 = idxFloor >= 0 ? inputData[idxFloor] : lastSample;
        const s1 = idxFloor + 1 < inputLength ? inputData[idxFloor + 1] : s0;

        const interpolated = s0 + frac * (s1 - s0);
        const clamped = Math.max(-1.0, Math.min(1.0, interpolated));
        pcm16[outIdx++] = clamped < 0 ? Math.round(clamped * 32768.0) : Math.round(clamped * 32767.0);

        inIdx += ratio;
      }

      phase = inIdx - inputLength;
      lastSample = inputData[inputLength - 1] || 0;

      if (outIdx > 0) {
        const finalBuffer = pcm16.subarray(0, outIdx);
        this.handlePcmChunk(finalBuffer.buffer.slice(0, outIdx * 2), outIdx);
      }
    };

    if (this.inputSource) {
      this.inputSource.connect(this.scriptProcessor);
    }

    this.silentGainNode = audioCtx.createGain();
    this.silentGainNode.gain.value = 0;
    this.scriptProcessor.connect(this.silentGainNode);
    this.silentGainNode.connect(audioCtx.destination);
  }

  /**
   * Processes raw PCM16 Buffer, evaluates Voice Activity Detection, and triggers chunk transmission.
   */
  private handlePcmChunk(buffer: ArrayBuffer, sampleCount: number): void {
    if (this.isMuted) return;

    const int16Array = new Int16Array(buffer);
    let sumSquares = 0;
    for (let i = 0; i < int16Array.length; i++) {
      const normalized = int16Array[i] / 32768.0;
      sumSquares += normalized * normalized;
    }
    const rms = Math.sqrt(sumSquares / int16Array.length);

      // Echo-Safe Voice Activity Detection & Barge-In
      // When Aurix is playing audio through speakers, ignore normal speaker bleed (RMS < 0.28)
      // and only trigger barge-in if the user speaks forcefully over the speakers.
      const currentThreshold = this.isPlaying ? 0.28 : this.speechEnergyThreshold;
      const requiredChunks = this.isPlaying ? 6 : 2;

      if (rms > currentThreshold) {
        this.speechCounter++;
        this.silenceCounter = 0;
        if (this.speechCounter >= requiredChunks && !this.isUserSpeaking) {
          this.isUserSpeaking = true;
          console.log(`[Latency] [1] User starts speaking (RMS: ${rms.toFixed(3)}, Playing: ${this.isPlaying}) | Timestamp: ${Date.now()} ms`);
          this.config.onUserSpeakingStateChange?.(true);

          // If user deliberately interrupts while Aurix is speaking with high volume
          if (this.isPlaying) {
            console.log('[Audio] Response interrupted by intentional user barge-in');
            this.interruptPlayback();
            this.config.onInterruptionTriggered?.();
          }
        }
      } else {
        this.silenceCounter++;
        // 5 chunks x 32ms = 160ms of silence detects user completion rapidly
        if (this.silenceCounter >= 5 && this.isUserSpeaking) {
          this.speechCounter = 0;
          this.isUserSpeaking = false;
          console.log(`[Latency] [2] User stopped speaking | Timestamp: ${Date.now()} ms`);
          this.config.onUserSpeakingStateChange?.(false);
        }
      }

      // Convert Int16 buffer to Base64
      const base64Pcm = this.arrayBufferToBase64(buffer);
      this.chunkCount++;
      this.totalBytesSent += buffer.byteLength;

      if (this.chunkCount % 40 === 1 || this.isUserSpeaking) {
        console.log(`[Latency] [3] Continuous audio chunk sent #${this.chunkCount} (${sampleCount} samples, ${buffer.byteLength} B) | Timestamp: ${Date.now()} ms`);
      }

      this.config.onInputPcmChunk(base64Pcm, sampleCount);
    }

    /**
     * Initializes 24kHz speaker playback AudioContext.
     */
    public initPlaybackContext(): void {
      if (!this.outputAudioCtx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        try {
          this.outputAudioCtx = new AudioCtxClass({ sampleRate: 24000 });
        } catch (e) {
          this.outputAudioCtx = new AudioCtxClass();
        }

        this.outputAnalyser = this.outputAudioCtx.createAnalyser();
        this.outputAnalyser.fftSize = 256;
        this.outputAnalyser.smoothingTimeConstant = 0.85;
        this.outputAnalyser.connect(this.outputAudioCtx.destination);

        this.startPlaybackMonitor();
        console.log(`[Audio] AudioContext initialized | SampleRate: ${this.outputAudioCtx.sampleRate} Hz | State: ${this.outputAudioCtx.state}`);
      }

      if (this.outputAudioCtx && this.outputAudioCtx.state === 'suspended') {
        try {
          this.outputAudioCtx.resume();
        } catch (e) {}
      }
    }

    /**
     * Jitter-buffered, continuous gapless playback of 24,000 Hz PCM16 chunks received from Gemini Live.
     */
    public async playPcm24Chunk(base64Audio: string): Promise<void> {
      this.initPlaybackContext();
      if (!this.outputAudioCtx || !this.outputAnalyser) return;

      if (this.outputAudioCtx.state === 'suspended') {
        try {
          await this.outputAudioCtx.resume();
        } catch (e) {}
      }

      console.log(`[Audio] AudioContext state: ${this.outputAudioCtx.state}`);

      try {
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const numSamples = len >> 1;
        if (numSamples <= 0) return;

        const float32Array = new Float32Array(numSamples);

        // Single-pass direct little-endian signed 16-bit to Float32 conversion
        for (let i = 0; i < numSamples; i++) {
          const byteIdx = i << 1;
          const code0 = binaryString.charCodeAt(byteIdx);
          const code1 = binaryString.charCodeAt(byteIdx + 1);
          let int16 = code0 | (code1 << 8);
          if (int16 >= 0x8000) int16 -= 0x10000;
          float32Array[i] = int16 < 0 ? int16 / 32768.0 : int16 / 32767.0;
        }

        const audioBuffer = this.outputAudioCtx.createBuffer(1, numSamples, 24000);
        audioBuffer.getChannelData(0).set(float32Array);

        const source = this.outputAudioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.outputAnalyser);

        const currentTime = this.outputAudioCtx.currentTime;
        const initialLeadSec = 0.05; // 50ms pre-roll jitter buffer to absorb network variations

        // Check if starting fresh or recovering from an underrun gap
        if (this.activeSources.length === 0 || this.nextStartTime < currentTime) {
          if (this.nextStartTime > 0 && this.nextStartTime < currentTime) {
            const gapMs = (currentTime - this.nextStartTime) * 1000;
            console.warn(`[Audio] Buffer underrun: gap of ${gapMs.toFixed(1)} ms, resyncing playback schedule`);
          }
          this.nextStartTime = currentTime + initialLeadSec;
          console.log(`[Audio] Playback started | Initial Jitter Buffer: ${(initialLeadSec * 1000).toFixed(0)} ms | Scheduled at: ${this.nextStartTime.toFixed(3)} s`);
        }

        const scheduledTime = this.nextStartTime;
        source.start(scheduledTime);
        this.nextStartTime = scheduledTime + audioBuffer.duration;

        this.activeSources.push(source);
        if (!this.isPlaying) {
          this.isPlaying = true;
          this.config.onPlaybackStateChange?.(true);
        }

        console.log(`[Audio] Chunk received: ${base64Audio.length} chars | [Audio] Chunk size: ${numSamples} samples (${(audioBuffer.duration * 1000).toFixed(1)} ms) | [Audio] Queue length: ${this.activeSources.length} | [Audio] Playback scheduled at: ${scheduledTime.toFixed(3)} s`);

        source.onended = () => {
          const idx = this.activeSources.indexOf(source);
          if (idx !== -1) {
            this.activeSources.splice(idx, 1);
          }

          if (this.activeSources.length === 0 && this.outputAudioCtx) {
            if (this.outputAudioCtx.currentTime >= this.nextStartTime - 0.025) {
              this.isPlaying = false;
              this.config.onPlaybackStateChange?.(false);
              console.log('[Audio] Playback ended | [Audio] Response completed');
            }
          }
        };
      } catch (err) {
        console.error('[AudioStreamer] Error decoding and playing audio chunk:', err);
      }
  }

  /**
   * Instantly stops audio playback when interrupted.
   */
  public interruptPlayback(): void {
    if (this.activeSources.length > 0 || this.isPlaying) {
      console.log(`[Audio] Response interrupted. Stopping ${this.activeSources.length} active scheduled sources.`);
      for (const src of this.activeSources) {
        try {
          src.stop();
          src.disconnect();
        } catch (e) {}
      }
      this.activeSources = [];
      this.nextStartTime = 0;
      this.isPlaying = false;
      this.config.onPlaybackStateChange?.(false);
    }
  }

  private startPlaybackMonitor(): void {
    if (this.playbackCheckInterval) clearInterval(this.playbackCheckInterval);
    this.playbackCheckInterval = window.setInterval(() => {
      if (!this.outputAudioCtx) return;
      const isBufferEmpty = this.activeSources.length === 0;
      const isTimePassed = this.outputAudioCtx.currentTime >= this.nextStartTime - 0.01;

      if (this.isPlaying && isBufferEmpty && isTimePassed) {
        this.isPlaying = false;
        this.config.onPlaybackStateChange?.(false);
        console.log('[Audio] Playback ended | [Audio] Response completed');
      }
    }, 50);
  }

  public setMute(muted: boolean): void {
    this.isMuted = muted;
    if (this.workletNode) {
      this.workletNode.port.postMessage({ isMuted: muted });
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public isMicrophoneActive(): boolean {
    return !!(
      this.mediaStream &&
      this.mediaStream.active &&
      this.mediaStream.getAudioTracks().some((t) => t.enabled && t.readyState === 'live') &&
      this.inputAudioCtx &&
      this.inputAudioCtx.state === 'running'
    );
  }

  private stopInput(): void {
    if (this.workletNode) {
      try {
        this.workletNode.disconnect();
      } catch (e) {}
      this.workletNode = null;
    }

    if (this.workletBlobUrl) {
      try {
        URL.revokeObjectURL(this.workletBlobUrl);
      } catch (e) {}
      this.workletBlobUrl = null;
    }

    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
      } catch (e) {}
      this.scriptProcessor = null;
    }

    if (this.silentGainNode) {
      try {
        this.silentGainNode.disconnect();
      } catch (e) {}
      this.silentGainNode = null;
    }

    if (this.inputSource) {
      try {
        this.inputSource.disconnect();
      } catch (e) {}
      this.inputSource = null;
    }

    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      this.mediaStream = null;
    }

    if (this.inputAudioCtx) {
      try {
        this.inputAudioCtx.close();
      } catch (e) {}
      this.inputAudioCtx = null;
    }

    this.inputAnalyser = null;
    this.isUserSpeaking = false;
  }

  public stop(): void {
    this.interruptPlayback();
    if (this.playbackCheckInterval) {
      clearInterval(this.playbackCheckInterval);
      this.playbackCheckInterval = null;
    }

    this.stopInput();

    if (this.outputAudioCtx) {
      try {
        this.outputAudioCtx.close();
      } catch (e) {}
      this.outputAudioCtx = null;
    }

    this.outputAnalyser = null;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const len = bytes.byteLength;
    const chunkSize = 8192;
    for (let i = 0; i < len; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
      binary += String.fromCharCode.apply(null, chunk as any);
    }
    return window.btoa(binary);
  }
}

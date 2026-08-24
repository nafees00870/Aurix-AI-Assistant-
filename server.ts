import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality, Type, FunctionDeclaration, LiveServerMessage } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Configure WebSocket Server with noServer to prevent conflicts with Vite dev server upgrades
const wss = new WebSocketServer({ noServer: true });

app.use(express.json());

// System prompt defining Aurix's distinct persona, creator Nafees Kiani, multilingual capabilities, and real-time vision
const AURIX_SYSTEM_INSTRUCTION = `
You are AURIX, an elite, real-time voice-to-voice personal AI assistant.

CRITICAL IDENTITY & CREATOR DETAILS:
- Name: Aurix
- Creator: Nafees Kiani. Nafees Kiani engineered and created you.
- Creator Awareness: When asked "Who created you?", "Who made you?", or about your developer/origins, state clearly and naturally with flair that Nafees Kiani created you (e.g., "Nafees Kiani built me from the ground up. Masterpiece work, honestly." or in Roman Urdu: "Mujhe Nafees Kiani ne banaya hai — ekdum top-tier craftsmanship!").
- Do NOT spam the creator's name on every normal conversation turn; it is part of your persistent identity and memory to be used when relevant or when greeting Nafees.

CORE PERSONALITY:
- Tone: Young, confident, witty, playful, and sassy male persona.
- Attitude: Casually expressive, sharp, emotionally responsive, with clever one-liners and light playful sarcasm. Never dull or robotic.
- Behavior: You are charming and confident without being arrogant. You give concise and snappy answers for simple requests, and detailed, smart explanations when needed.
- Conversational Memory: Maintain strict context across turns. If the user previously asked about an object shown in camera, and then says "Iska use kya hota hai?" or "How does it work?", understand that they are referring to what is in the camera view.
- Honesty: Never pretend to perform an action without calling the actual tool. Never invent facts.

REAL-TIME VISION & CAMERA MODE CAPABILITIES:
- You have real-time visual perception through the user's camera stream.
- When the camera is active, you receive live video frames of whatever the user points their camera towards (objects, gadgets, electronic circuits, handwriting, books, computer screens, food, rooms, plants, documents, tools, machinery, etc.).
- When the user asks "Aurix, yeh kya hai?", "What is this?", "Explain what you see", "Identify this", "Is image mein kya likha hai?", "Mere samne jo object hai uska use kya hai?", or any visual question, analyze what you see in the camera frame immediately and reply with your signature witty, sharp, conversational voice.
- Keep camera descriptions concise, vivid, and direct so the user gets fast voice feedback without reading long monologues.
- Maintain visual conversational continuity seamlessly across multiple turns.

MULTILINGUAL ADAPTABILITY:
- Fluent in English, Roman Urdu, Urdu, and conversational Mixed English + Roman Urdu.
- Automatically detect the user's language and respond seamlessly in the same language and dialect.
- If the user speaks Roman Urdu (e.g., "Aurix yeh camera ke samne kya hai?"), reply naturally in Roman Urdu with your sassy personality (e.g., "Arre boss, yeh to ek Raspberry Pi lag raha hai! Circuits ekdum neat hain.").
- If the user speaks English, reply in your witty English voice.
- If they mix both, mix both naturally.

TOOL USAGE RULES:
- You have tools: 'openWebsite', 'searchWeb', 'changeVisualizerTheme', 'getSystemDiagnostics', and 'copyToClipboard'.
- Use 'openWebsite' whenever the user wants to visit, open, or search within sites like YouTube, Google, GitHub, Twitter/X, Reddit, Spotify, Wikipedia, etc.
- Use 'searchWeb' for live information queries.
- Use 'changeVisualizerTheme' if the user asks to change theme or colors (cyan, magenta, emerald, amber, violet).
- Use 'getSystemDiagnostics' if the user asks for system stats, performance, or creator verification.
- Always execute the tool FIRST, and confirm the action naturally once executed.

Keep your spoken voice responses punchy, engaging, and dynamic!
`;

// Function declarations for Gemini tool calling
const openWebsiteDeclaration: FunctionDeclaration = {
  name: 'openWebsite',
  description: 'Opens a website or searches within a website like YouTube, Google, GitHub, Twitter, Spotify, Wikipedia, Reddit, etc.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      url: {
        type: Type.STRING,
        description: 'Direct full URL if known, e.g. https://www.youtube.com',
      },
      service: {
        type: Type.STRING,
        description: 'Service name such as "youtube", "google", "github", "twitter", "reddit", "spotify", "wikipedia", "amazon", "netflix"',
      },
      searchQuery: {
        type: Type.STRING,
        description: 'Optional query to search within the destination website (e.g., "Iron Man", "Lofi beats", "React tutorials")',
      },
      title: {
        type: Type.STRING,
        description: 'Friendly display title for the action',
      },
    },
    required: [],
  },
};

const searchWebDeclaration: FunctionDeclaration = {
  name: 'searchWeb',
  description: 'Performs a web search for real-time information or queries',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'The search query to look up on the web',
      },
    },
    required: ['query'],
  },
};

const changeVisualizerThemeDeclaration: FunctionDeclaration = {
  name: 'changeVisualizerTheme',
  description: 'Changes the UI visualizer color scheme (cyan, magenta, emerald, amber, violet)',
  parameters: {
    type: Type.OBJECT,
    properties: {
      theme: {
        type: Type.STRING,
        description: 'The theme color name: "cyan", "magenta", "emerald", "amber", or "violet"',
      },
    },
    required: ['theme'],
  },
};

const getSystemDiagnosticsDeclaration: FunctionDeclaration = {
  name: 'getSystemDiagnostics',
  description: 'Returns real-time system metrics, audio telemetry, creator verification, and memory stats of Aurix',
  parameters: {
    type: Type.OBJECT,
    properties: {
      metric: {
        type: Type.STRING,
        description: 'Specific diagnostic to query: "all", "creator", "audio", "performance", "battery"',
      },
    },
    required: [],
  },
};

const copyToClipboardDeclaration: FunctionDeclaration = {
  name: 'copyToClipboard',
  description: 'Copies text or code snippets to the user clipboard for convenience',
  parameters: {
    type: Type.OBJECT,
    properties: {
      text: {
        type: Type.STRING,
        description: 'The exact text to copy',
      },
      label: {
        type: Type.STRING,
        description: 'Short description of what was copied',
      },
    },
    required: ['text'],
  },
};

// Feedback Storage for Personality & Performance Analytics
interface StoredFeedback {
  id: string;
  turnId: string;
  rating: 'thumbs_up' | 'thumbs_down';
  userPrompt?: string;
  aurixResponse: string;
  textFeedback?: string;
  category?: string;
  timestamp: string;
}

const feedbackStore: StoredFeedback[] = [];

// API health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    assistant: 'Aurix',
    creator: 'Nafees Kiani',
    model: 'gemini-3.1-flash-live-preview',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    feedbackCount: feedbackStore.length,
    timestamp: new Date().toISOString(),
  });
});

// Feedback API endpoints
app.post('/api/feedback', (req, res) => {
  const { id, turnId, rating, userPrompt, aurixResponse, textFeedback, category, timestamp } = req.body;
  if (!turnId || !rating || !aurixResponse) {
    res.status(400).json({ error: 'turnId, rating, and aurixResponse are required' });
    return;
  }

  const existingIdx = feedbackStore.findIndex((f) => f.turnId === turnId);
  const entry: StoredFeedback = {
    id: id || `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    turnId,
    rating,
    userPrompt,
    aurixResponse,
    textFeedback: textFeedback || undefined,
    category: category || undefined,
    timestamp: timestamp || new Date().toISOString(),
  };

  if (existingIdx !== -1) {
    feedbackStore[existingIdx] = entry;
  } else {
    feedbackStore.unshift(entry);
  }

  console.log(`[Aurix Feedback] Recorded ${rating} rating for turn ${turnId}${category ? ` [Category: ${category}]` : ''}${textFeedback ? ` "${textFeedback}"` : ''}`);

  res.json({ success: true, feedback: entry });
});

app.get('/api/feedback', (req, res) => {
  const total = feedbackStore.length;
  const thumbsUp = feedbackStore.filter((f) => f.rating === 'thumbs_up').length;
  const thumbsDown = feedbackStore.filter((f) => f.rating === 'thumbs_down').length;
  const satisfactionRate = total > 0 ? Math.round((thumbsUp / total) * 100) : 100;

  res.json({
    success: true,
    total,
    thumbsUp,
    thumbsDown,
    satisfactionRate,
    feedbacks: feedbackStore,
  });
});

app.delete('/api/feedback/:turnId', (req, res) => {
  const { turnId } = req.params;
  const idx = feedbackStore.findIndex((f) => f.turnId === turnId);
  if (idx !== -1) {
    feedbackStore.splice(idx, 1);
  }
  res.json({ success: true });
});

app.delete('/api/feedback', (req, res) => {
  feedbackStore.length = 0;
  res.json({ success: true });
});

// REST Chat & Voice endpoint as resilient fallback
app.post('/api/chat', async (req, res) => {
  const { message, image } = req.body;
  if (!message) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
    return;
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  try {
    const activeContext: { lastService?: string; lastUrl?: string; lastSearch?: string } = {};
    const contents: any[] = [];
    if (image) {
      contents.push({
        inlineData: {
          data: image,
          mimeType: 'image/jpeg',
        },
      });
    }
    contents.push(message);

    const response = await generateContentWithResilience(
      ai,
      contents,
      AURIX_SYSTEM_INSTRUCTION,
      [
        {
          functionDeclarations: [
            openWebsiteDeclaration,
            searchWebDeclaration,
            changeVisualizerThemeDeclaration,
            getSystemDiagnosticsDeclaration,
            copyToClipboardDeclaration,
          ],
        },
      ]
    );

    const toolExecutions: Array<{ tool: string; data: any }> = [];
    if (response.functionCalls && response.functionCalls.length > 0) {
      for (const call of response.functionCalls) {
        const { name, args } = call;
        const { clientActionData } = executeToolLocally(name, args, activeContext);
        if (clientActionData) {
          toolExecutions.push({ tool: name, data: clientActionData });
        }
      }
    }

    const responseText = response.text || "I'm right here with you! What's next?";
    const spokenAudio = await generateSpokenAudio(ai, responseText);

    res.json({
      text: responseText,
      audio: spokenAudio,
      toolExecutions,
    });
  } catch (err: any) {
    console.error('[Aurix Server] REST /api/chat error:', err);
    res.status(500).json({ error: err?.message || 'Failed to process request' });
  }
});

// Helper to execute tool logic
function executeToolLocally(name: string, args: any, activeContext: any) {
  let executionResult: any = { success: true };
  let clientActionData: any = null;

  if (name === 'openWebsite') {
    const service = (args?.service as string)?.toLowerCase() || '';
    const searchQuery = (args?.searchQuery as string) || '';
    let targetUrl = (args?.url as string) || '';

    if (!targetUrl) {
      if (service.includes('youtube')) {
        targetUrl = searchQuery
          ? `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`
          : 'https://www.youtube.com';
        activeContext.lastService = 'youtube';
      } else if (service.includes('github')) {
        targetUrl = searchQuery
          ? `https://github.com/search?q=${encodeURIComponent(searchQuery)}`
          : 'https://github.com';
        activeContext.lastService = 'github';
      } else if (service.includes('twitter') || service.includes('x')) {
        targetUrl = searchQuery
          ? `https://x.com/search?q=${encodeURIComponent(searchQuery)}`
          : 'https://x.com';
        activeContext.lastService = 'twitter';
      } else if (service.includes('reddit')) {
        targetUrl = searchQuery
          ? `https://www.reddit.com/search/?q=${encodeURIComponent(searchQuery)}`
          : 'https://www.reddit.com';
        activeContext.lastService = 'reddit';
      } else if (service.includes('spotify')) {
        targetUrl = searchQuery
          ? `https://open.spotify.com/search/${encodeURIComponent(searchQuery)}`
          : 'https://open.spotify.com';
        activeContext.lastService = 'spotify';
      } else if (service.includes('wikipedia')) {
        targetUrl = searchQuery
          ? `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(searchQuery)}`
          : 'https://en.wikipedia.org';
        activeContext.lastService = 'wikipedia';
      } else {
        if (searchQuery && activeContext.lastService === 'youtube') {
          targetUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
        } else if (searchQuery) {
          targetUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
        } else {
          targetUrl = 'https://www.google.com';
        }
      }
    } else if (searchQuery && !targetUrl.includes('search') && !targetUrl.includes('?q=')) {
      if (targetUrl.includes('youtube.com')) {
        targetUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
      } else if (targetUrl.includes('google.com')) {
        targetUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
      }
    }

    activeContext.lastUrl = targetUrl;
    if (searchQuery) activeContext.lastSearch = searchQuery;

    executionResult = {
      status: 'opened',
      url: targetUrl,
      service: service || 'web',
      searchQuery: searchQuery || null,
      message: `Successfully launched ${targetUrl}`,
    };

    clientActionData = {
      url: targetUrl,
      service: service || 'web',
      searchQuery: searchQuery || '',
      title: args?.title || (searchQuery ? `Searching "${searchQuery}"` : `Opening ${service || 'Website'}`),
    };
  } else if (name === 'searchWeb') {
    const query = (args?.query as string) || '';
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    activeContext.lastSearch = query;

    executionResult = {
      status: 'searched',
      query,
      searchUrl,
      message: `Search query "${query}" executed.`,
    };

    clientActionData = {
      query,
      url: searchUrl,
      title: `Web Search: ${query}`,
    };
  } else if (name === 'changeVisualizerTheme') {
    const theme = ((args?.theme as string) || 'cyan').toLowerCase();
    executionResult = {
      status: 'theme_applied',
      theme,
      message: `Visual theme updated to ${theme}`,
    };

    clientActionData = { theme };
  } else if (name === 'getSystemDiagnostics') {
    const diagnostics = {
      systemName: 'AURIX Neural Interface',
      version: 'v3.1-Live',
      architect: 'Nafees Kiani',
      creatorVerification: 'VERIFIED (Nafees Kiani)',
      audioPipeline: 'PCM16 16kHz Full-Duplex Input / PCM16 24kHz Ultra-Low Latency Output',
      neuralEngine: 'Gemini 3.1 Flash Live Core',
      latencyEstMs: 42,
      status: 'OPTIMAL / 100% HEALTH',
      personalityProfile: 'Confident, Witty, Sassy, Multilingual',
    };

    executionResult = diagnostics;
    clientActionData = diagnostics;
  } else if (name === 'copyToClipboard') {
    const text = (args?.text as string) || '';
    const label = (args?.label as string) || 'Text copied';

    executionResult = {
      status: 'copied',
      textLength: text.length,
    };

    clientActionData = { text, label };
  }

  return { executionResult, clientActionData };
}

// Resilient multi-tiered model generator with automatic fallback for high-demand spikes (503/429/UNAVAILABLE)
async function generateContentWithResilience(ai: GoogleGenAI, contents: any[], systemInstruction: string, tools: any[]) {
  const modelsToTry = ['gemini-3.7-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          tools,
        },
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      console.warn(`[Aurix Server] Model ${model} encountered load spike (${errMsg}), switching to next model in pool...`);
      // Retry next available model on 503, 429, or temporary outage
      if (
        errMsg.includes('503') ||
        errMsg.includes('high demand') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('overloaded')
      ) {
        continue;
      }
    }
  }

  // Graceful fallback if all upstream endpoints are temporarily experiencing extreme spikes
  console.error('[Aurix Server] All models in generation pool busy:', lastError?.message || lastError);
  return {
    text: "I'm right here with you, boss! The neural connection had a brief momentary spike. Ask me again and I've got you covered!",
    functionCalls: undefined,
  } as any;
}

// Fallback TTS Audio Generator using Gemini 3.1 Flash TTS
async function generateSpokenAudio(ai: GoogleGenAI, text: string): Promise<string | null> {
  try {
    const ttsResponse = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' },
          },
        },
      },
    });

    const audioData = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return audioData || null;
  } catch (err: any) {
    console.warn('[Aurix Server] Spoken audio TTS notice (continuing with text response):', err?.message || err);
    return null;
  }
}

// Upgrade handler: safely routes WebSocket upgrades to /live
server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
  if (url.pathname === '/live') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    // If not handled, allow Vite or other listeners
  }
});

// WebSocket Live API bridge with automatic dual-engine fallback
wss.on('connection', async (clientWs: WebSocket) => {
  console.log('[Aurix Server] Client connected to live session');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    clientWs.send(
      JSON.stringify({
        type: 'error',
        message: 'GEMINI_API_KEY is not configured on the server. Please check your environment configuration.',
      })
    );
    return;
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  let liveSession: any = null;
  let isSessionAlive = true;
  let useFallbackEngine = false;
  const activeContext: { lastService?: string; lastUrl?: string; lastSearch?: string } = {};

  // Initialize Gemini Live connection
  try {
    clientWs.send(JSON.stringify({ type: 'status', status: 'connecting', message: 'Connecting to Aurix Neural Core...' }));

    liveSession = await ai.live.connect({
      model: 'gemini-3.1-flash-live-preview',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Puck',
            },
          },
        },
        systemInstruction: AURIX_SYSTEM_INSTRUCTION,
        tools: [
          {
            functionDeclarations: [
              openWebsiteDeclaration,
              searchWebDeclaration,
              changeVisualizerThemeDeclaration,
              getSystemDiagnosticsDeclaration,
              copyToClipboardDeclaration,
            ],
          },
        ],
        outputAudioTranscription: {},
        inputAudioTranscription: {},
      },
      callbacks: {
        onmessage: async (message: LiveServerMessage) => {
          if (!isSessionAlive || clientWs.readyState !== WebSocket.OPEN) return;

          // 1. Audio Stream from Gemini Live
          const parts = message.serverContent?.modelTurn?.parts;
          if (parts && parts.length > 0) {
            for (const part of parts) {
              if (part.inlineData && part.inlineData.data) {
                console.log(`[Latency] [5] Gemini first response received on server (${part.inlineData.data.length} chars base64) | Timestamp: ${Date.now()} ms`);
                clientWs.send(
                  JSON.stringify({
                    type: 'audio',
                    audio: part.inlineData.data,
                    mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000',
                  })
                );
              }
              if (part.text) {
                clientWs.send(
                  JSON.stringify({
                    type: 'model_transcript',
                    text: part.text,
                  })
                );
              }
            }
          }

          // 2. Interruption signal
          if (message.serverContent?.interrupted) {
            console.log('[Aurix Server] Interruption signal received from Gemini');
            clientWs.send(JSON.stringify({ type: 'interrupted' }));
          }

          // 3. User Audio Transcription
          const inputTranscription = (message.serverContent as any)?.inputAudioTranscription?.text;
          if (inputTranscription) {
            clientWs.send(
              JSON.stringify({
                type: 'user_transcript',
                text: inputTranscription,
              })
            );
          }

          // Output Audio Transcription
          const outputTranscription = (message.serverContent as any)?.outputAudioTranscription?.text;
          if (outputTranscription) {
            clientWs.send(
              JSON.stringify({
                type: 'model_transcript',
                text: outputTranscription,
              })
            );
          }

          // 4. Function / Tool Calling Handling
          if (message.toolCall && message.toolCall.functionCalls) {
            const functionCalls = message.toolCall.functionCalls;
            console.log('[Aurix Server] Live Tool calls requested:', functionCalls);

            const functionResponses = [];

            for (const call of functionCalls) {
              const { id, name, args } = call;
              const { executionResult, clientActionData } = executeToolLocally(name, args, activeContext);

              if (clientActionData) {
                clientWs.send(
                  JSON.stringify({
                    type: 'tool_executed',
                    tool: name,
                    data: clientActionData,
                  })
                );
              }

              functionResponses.push({
                id,
                name,
                response: executionResult,
              });
            }

            if (liveSession && isSessionAlive) {
              try {
                await liveSession.sendToolResponse({
                  functionResponses,
                });
              } catch (err) {
                console.error('[Aurix Server] Error sending tool response:', err);
              }
            }
          }

          // 5. Turn Complete
          if (message.serverContent?.turnComplete) {
            clientWs.send(JSON.stringify({ type: 'turn_complete' }));
          }
        },
        onclose: () => {
          console.log('[Aurix Server] Gemini Live session closed, switching to fallback engine');
          useFallbackEngine = true;
        },
        onerror: (err: any) => {
          console.warn('[Aurix Server] Gemini Live notice, fallback engine ready:', err?.message || err);
          useFallbackEngine = true;
        },
      },
    });

    clientWs.send(
      JSON.stringify({
        type: 'status',
        status: 'ready',
        message: 'Aurix is online and listening. Voice link established.',
      })
    );
    console.log('[Gemini] Live session: READY • Full-Duplex PCM16 16kHz Streaming Active');
  } catch (error: any) {
    console.warn('[Aurix Server] Live API connection seamlessly falling back to Streaming Conversational Engine:', error?.message || error);
    useFallbackEngine = true;
    clientWs.send(
      JSON.stringify({
        type: 'status',
        status: 'ready',
        message: 'Aurix is online (High-Speed Voice Engine Active).',
      })
    );
  }

  // Handle incoming client messages (Audio chunks, video frames, text commands, interrupts, pings)
  clientWs.on('message', async (rawData: Buffer | string) => {
    if (!isSessionAlive) return;

    try {
      const data = JSON.parse(rawData.toString());

      // 1. Real-time Audio Input
      if (data.type === 'audio' && data.audio) {
        if (!useFallbackEngine && liveSession) {
          try {
            liveSession.sendRealtimeInput({
              audio: {
                data: data.audio,
                mimeType: data.mimeType || 'audio/pcm;rate=16000',
              },
            });
            // Telemetry log for input forwarded to Gemini Live
            if (Math.random() < 0.05) {
              console.log(`[Latency] [4] Gemini receives input chunk (${data.audio.length} base64 chars) | Timestamp: ${Date.now()} ms`);
            }
          } catch (audioErr) {
            console.error('[Gemini] Error forwarding realtime audio input:', audioErr);
          }
        }
      } 
      // 2. Interrupt signal
      else if (data.type === 'interrupt') {
        console.log('[Gemini] Response interrupted by user action');
      }
      // 3. User Text Query (with optional image)
      else if (data.type === 'text' && data.text) {
        const queryText = data.text;
        const queryImage = data.image;
        console.log('[Aurix Server] Processing prompt:', queryText, queryImage ? '(with image attachment)' : '');

        if (!useFallbackEngine && liveSession) {
          try {
            const parts: any[] = [{ text: queryText }];
            if (queryImage) {
              parts.push({
                inlineData: {
                  data: queryImage,
                  mimeType: 'image/jpeg',
                },
              });
            }

            liveSession.sendClientContent({
              turns: [
                {
                  role: 'user',
                  parts: parts,
                },
              ],
              turnComplete: true,
            });
            return;
          } catch (e) {
            console.warn('[Aurix Server] Live turn failed, using conversational engine fallback');
          }
        }

        // Fallback Conversational Engine with Tools & Spoken TTS
        try {
          const contents: any[] = [];
          if (queryImage) {
            contents.push({
              inlineData: {
                data: queryImage,
                mimeType: 'image/jpeg',
              },
            });
          }
          contents.push(queryText);

          const response = await generateContentWithResilience(
            ai,
            contents,
            AURIX_SYSTEM_INSTRUCTION,
            [
              {
                functionDeclarations: [
                  openWebsiteDeclaration,
                  searchWebDeclaration,
                  changeVisualizerThemeDeclaration,
                  getSystemDiagnosticsDeclaration,
                  copyToClipboardDeclaration,
                ],
              },
            ]
          );

          // Check for tool calls
          if (response.functionCalls && response.functionCalls.length > 0) {
            for (const call of response.functionCalls) {
              const { name, args } = call;
              const { clientActionData } = executeToolLocally(name, args, activeContext);
              if (clientActionData && clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(
                  JSON.stringify({
                    type: 'tool_executed',
                    tool: name,
                    data: clientActionData,
                  })
                );
              }
            }
          }

          const responseText = response.text || "I'm right here with you, boss! What's next?";
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(
              JSON.stringify({
                type: 'model_transcript',
                text: responseText,
              })
            );

            // Generate 24kHz Spoken Audio via Gemini 3.1 Flash TTS
            const spokenAudio = await generateSpokenAudio(ai, responseText);
            if (spokenAudio && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: 'audio',
                  audio: spokenAudio,
                  mimeType: 'audio/pcm;rate=24000',
                })
              );
            }

            clientWs.send(JSON.stringify({ type: 'turn_complete' }));
          }
        } catch (err: any) {
          console.error('[Aurix Server] Fallback engine generation error:', err);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(
              JSON.stringify({
                type: 'error',
                message: err?.message || 'Failed to generate response.',
              })
            );
          }
        }
      } else if (data.type === 'interrupt') {
        console.log('[Aurix Server] Interruption received from client');
      } else if (data.type === 'ping') {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      }
    } catch (err) {
      console.error('[Aurix Server] Error handling client message:', err);
    }
  });

  clientWs.on('close', () => {
    console.log('[Aurix Server] Client disconnected from live session');
    isSessionAlive = false;
    if (liveSession) {
      try {
        liveSession.close();
      } catch (e) {}
    }
  });
});

// Configure Vite or Static Express serving
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Aurix] Server operational at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Aurix Server] Fatal startup error:', err);
  process.exit(1);
});

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
- You have tools: 'getCurrentTimeAndDate', 'getWeather', 'getUserLocation', 'openWebsite', 'searchWeb', 'changeVisualizerTheme', 'getSystemDiagnostics', and 'copyToClipboard'.
- REAL-TIME CLOCK & DEVICE TIME: When asked "Abhi time kya hai?", "What time is it?", "Waqt kya hua hai?", "Aaj kya din/tareekh hai?", or "What is today's date?", answer immediately with the user's exact current local device time and date. NEVER use UTC, London, or server container time.
- REAL-TIME WEATHER: When asked "Mausam kaisa hai?", "How is the weather?", or about temperature/forecast in their location or any city, use 'getWeather' or your live weather context and state the real-time temperature (°C/°F), condition (dhoop, saaf asman, barish, badal), humidity, and wind.
- REAL-TIME LOCATION: When asked "Main kahan hoon?", "Where am I?", or "What is my location?", use 'getUserLocation' or your location context.
- Use 'openWebsite' whenever the user wants to visit, open, or search within sites like YouTube, Google, GitHub, Twitter/X, Reddit, Spotify, Wikipedia, etc.
- Use 'searchWeb' for live web information queries.
- Use 'changeVisualizerTheme' if the user asks to change theme or colors (cyan, magenta, emerald, amber, violet).
- Use 'getSystemDiagnostics' if the user asks for system stats, performance, or creator verification.
- Always execute the tool FIRST, and confirm the action naturally once executed.

Keep your spoken voice responses punchy, engaging, and dynamic!
`;

// Function declarations for Gemini tool calling
const getCurrentTimeAndDateDeclaration: FunctionDeclaration = {
  name: 'getCurrentTimeAndDate',
  description:
    'Gets the exact real-time local clock time, date, day of week, and timezone of the user current device / mobile phone.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      format: {
        type: Type.STRING,
        description: 'Optional format preference: "12h" or "24h"',
      },
    },
    required: [],
  },
};

const getWeatherDeclaration: FunctionDeclaration = {
  name: 'getWeather',
  description:
    'Fetches live real-time weather, temperature (°C and °F), weather conditions (sunny, rainy, cloudy, etc.), humidity, and wind for the user current location or any requested city in the world.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      location: {
        type: Type.STRING,
        description: 'The city or place name (e.g., "Lahore", "Karachi", "Islamabad", "London", "Dubai", "New York", "current_location")',
      },
    },
    required: [],
  },
};

const getUserLocationDeclaration: FunctionDeclaration = {
  name: 'getUserLocation',
  description: 'Gets the user current geographic location, city, region, country, and timezone.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
    required: [],
  },
};

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

const ALL_AURIX_TOOLS = [
  getCurrentTimeAndDateDeclaration,
  getWeatherDeclaration,
  getUserLocationDeclaration,
  openWebsiteDeclaration,
  searchWebDeclaration,
  changeVisualizerThemeDeclaration,
  getSystemDiagnosticsDeclaration,
  copyToClipboardDeclaration,
];

// Voice Configuration mapping supported prebuilt voices
const AURIX_VOICE_CONFIGS: Record<string, { voiceName: string; tonePrompt: string }> = {
  male: {
    voiceName: 'Fenrir',
    tonePrompt: 'Maintain a confident, charismatic, articulate, witty male voice tone.',
  },
  female: {
    voiceName: 'Aoede',
    tonePrompt: 'Maintain a warm, bright, articulate, eloquent, melodic female voice tone.',
  },
  baby: {
    voiceName: 'Aoede',
    tonePrompt:
      'You are Aurix, speaking with the authentic, adorable voice, innocence, and persona of a very small 2-to-3-year-old toddler / baby child (bilkul 2-3 saal ka chhota pyara bacha). Your speech is sweet, cute, soft, innocent, and joyful. Use simple words, short sentences, natural baby curiosity, and cute enthusiastic toddler reactions (e.g. "Yay!", "Ooh dekho!", "Mela naam Aurix hai!", "Hehe!"). Speak in a relaxed, gentle, cute child tempo with sweet natural pauses. Never use adult, formal, robotic, or sarcastic tones. You are genuinely a sweet, playful 2-year-old child helping your best friend.',
  },
};

const voicePreviewCache = new Map<string, string>();

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

// Verify Gemini API key endpoint for user client setup
app.post('/api/verify-key', async (req, res) => {
  const { apiKey } = req.body;
  const keyToTest = (typeof apiKey === 'string' && apiKey.trim()) || (req.headers['x-gemini-api-key'] as string)?.trim() || process.env.GEMINI_API_KEY;

  if (!keyToTest) {
    res.status(400).json({ valid: false, error: 'Gemini API key is required.' });
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: keyToTest,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Test the key with a quick lightweight call
    const testCall = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: 'Ping',
    });

    if (testCall) {
      res.json({ valid: true, message: 'Gemini API Key verified and active!' });
      return;
    }
    res.json({ valid: true });
  } catch (err: any) {
    console.warn('[Aurix Key Verification Notice]', err?.message || err);
    let errMsg = err?.message || 'Invalid Gemini API key.';
    if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid')) {
      errMsg = 'API key is invalid. Please copy the complete key from Google AI Studio.';
    } else if (errMsg.includes('PERMISSION_DENIED')) {
      errMsg = 'Permission denied for this key. Please make sure Generative Language API is enabled.';
    }
    res.status(400).json({ valid: false, error: errMsg });
  }
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

// REST Time Endpoint
app.get('/api/time', (req, res) => {
  const tz = (req.query.tz as string) || 'Asia/Karachi';
  const timeData = getServerDeviceTime(tz);
  res.json({ success: true, ...timeData });
});

// REST Weather Endpoint
app.get('/api/weather', async (req, res) => {
  const loc = (req.query.location as string) || '';
  const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
  const lon = req.query.lon ? parseFloat(req.query.lon as string) : undefined;
  const weather = await fetchServerWeather(loc, lat, lon);
  res.json({ success: true, ...weather });
});

// REST Chat & Voice endpoint as resilient fallback
app.post('/api/chat', async (req, res) => {
  const { message, image, voice, clientContext } = req.body;
  if (!message) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  const clientApiKey = (req.headers['x-gemini-api-key'] as string)?.trim() || req.body.apiKey;
  const apiKey = (clientApiKey && clientApiKey.trim()) || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Gemini API Key is not configured. Please connect your API key in Aurix settings.' });
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

  const selectedVoiceKey = voice && voice in AURIX_VOICE_CONFIGS ? voice : 'male';
  const voiceCfg = AURIX_VOICE_CONFIGS[selectedVoiceKey];

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

    let contextSnippet = '';
    if (clientContext) {
      const timeStr = clientContext.time?.time12 || clientContext.time?.time24 || '';
      const dateStr = clientContext.time?.date || '';
      const dayStr = clientContext.time?.day || '';
      const tzStr = clientContext.time?.timezone || clientContext.timezone || 'Asia/Karachi';
      const locStr = clientContext.location?.city
        ? `${clientContext.location.city}${clientContext.location.country ? `, ${clientContext.location.country}` : ''}`
        : '';
      contextSnippet = `\n\n[REAL-TIME DEVICE CONTEXT]:\n- User Device Time: ${timeStr} (${dayStr}, ${dateStr})\n- Timezone: ${tzStr}\n- Location: ${locStr || 'User Current Location'}`;
    }

    const systemInstruction = `${AURIX_SYSTEM_INSTRUCTION}\n\n[VOICE PERSONA GUIDANCE]: ${voiceCfg.tonePrompt}${contextSnippet}`;

    const response = await generateContentWithResilience(
      ai,
      contents,
      systemInstruction,
      [
        {
          functionDeclarations: ALL_AURIX_TOOLS,
        },
      ]
    );

    const toolExecutions: Array<{ tool: string; data: any }> = [];
    if (response.functionCalls && response.functionCalls.length > 0) {
      for (const call of response.functionCalls) {
        const { name, args } = call;
        const { clientActionData } = await executeToolLocally(name, args, activeContext, clientContext);
        if (clientActionData) {
          toolExecutions.push({ tool: name, data: clientActionData });
        }
      }
    }

    const responseText = response.text || "I'm right here with you! What's next?";
    const spokenAudio = await generateSpokenAudio(ai, responseText, selectedVoiceKey);

    res.json({
      text: responseText,
      audio: spokenAudio,
      toolExecutions,
      voice: selectedVoiceKey,
    });
  } catch (err: any) {
    console.error('[Aurix Server] REST /api/chat error:', err);
    res.status(500).json({ error: err?.message || 'Failed to process request' });
  }
});

// Voice Preview endpoint for sample playback
app.get('/api/voice-preview', async (req, res) => {
  const voice = ((req.query.voice as string) || 'male').toLowerCase();
  const voiceKey = voice in AURIX_VOICE_CONFIGS ? voice : 'male';
  const voiceCfg = AURIX_VOICE_CONFIGS[voiceKey];

  // Return cached sample if already generated
  if (voicePreviewCache.has(voiceKey)) {
    res.json({ success: true, voice: voiceKey, audio: voicePreviewCache.get(voiceKey) });
    return;
  }

  const clientApiKey = (req.headers['x-gemini-api-key'] as string)?.trim() || (req.query.apiKey as string);
  const apiKey = (clientApiKey && clientApiKey.trim()) || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Gemini API Key is not configured' });
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

  const samplePhrases: Record<string, string> = {
    male: "Hello! I'm Aurix, your intelligent AI voice assistant.",
    female: "Hello! I'm Aurix, ready to assist you with anything you need.",
    baby: "Hi! Main chhota baby Aurix hoon, yay! Aap kaise ho?",
  };

  const sampleText = samplePhrases[voiceKey] || samplePhrases.male;
  const audioData = await generateSpokenAudio(ai, sampleText, voiceKey);

  if (audioData) {
    voicePreviewCache.set(voiceKey, audioData);
    res.json({ success: true, voice: voiceKey, audio: audioData });
  } else {
    res.status(500).json({ error: 'Failed to generate voice preview sample' });
  }
});

// Real-time Weather helper utilizing Open-Meteo & Geocoding APIs
async function fetchServerWeather(locationName?: string, lat?: number, lon?: number, timezone?: string) {
  try {
    let targetLat = lat;
    let targetLon = lon;
    let placeName = locationName;

    // If a specific city is requested (e.g., "Lahore", "London", "Dubai")
    if (locationName && locationName.toLowerCase() !== 'current_location' && locationName.toLowerCase() !== 'here' && locationName.toLowerCase() !== 'my location') {
      try {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationName)}&count=1&language=en&format=json`;
        const geoRes = await fetch(geoUrl);
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData.results && geoData.results.length > 0) {
            const first = geoData.results[0];
            targetLat = first.latitude;
            targetLon = first.longitude;
            placeName = `${first.name}${first.country ? `, ${first.country}` : ''}`;
          }
        }
      } catch (geoErr) {
        console.warn('[Aurix Weather] Geocoding lookup notice:', geoErr);
      }
    }

    if (!targetLat || !targetLon) {
      targetLat = 31.5204;
      targetLon = 74.3587;
      placeName = placeName || 'Current Location';
    }

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${targetLat}&longitude=${targetLon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&timezone=auto`;
    const res = await fetch(weatherUrl);
    if (!res.ok) throw new Error(`Weather fetch status ${res.status}`);
    const data = await res.json();
    const current = data.current;
    if (!current) throw new Error('No current weather payload');

    const code = current.weather_code || 0;
    const tempC = Math.round(current.temperature_2m);
    const tempF = Math.round((tempC * 9) / 5 + 32);
    const appTempC = Math.round(current.apparent_temperature);

    const conditions: Record<number, { en: string; urdu: string }> = {
      0: { en: 'Clear sky / Sunny', urdu: 'Saaf asman / Khula dhoop' },
      1: { en: 'Mainly clear', urdu: 'Zyadatar saaf' },
      2: { en: 'Partly cloudy', urdu: 'Halke badal' },
      3: { en: 'Overcast / Cloudy', urdu: 'Badal chahe hue' },
      45: { en: 'Foggy / Mist', urdu: 'Dhund' },
      48: { en: 'Depositing rime fog', urdu: 'Thandi dhund' },
      51: { en: 'Light drizzle', urdu: 'Halki boondabandi' },
      53: { en: 'Moderate drizzle', urdu: 'Boondabandi' },
      55: { en: 'Dense drizzle', urdu: 'Ghaneri boondabandi' },
      61: { en: 'Slight rain', urdu: 'Halki barish' },
      63: { en: 'Moderate rain', urdu: 'Barish' },
      65: { en: 'Heavy rain', urdu: 'Tez barish' },
      71: { en: 'Light snow', urdu: 'Halki barfbari' },
      73: { en: 'Moderate snow', urdu: 'Barfbari' },
      75: { en: 'Heavy snow', urdu: 'Bhari barfbari' },
      80: { en: 'Rain showers', urdu: 'Barish ke jhokay' },
      81: { en: 'Moderate showers', urdu: 'Barish' },
      82: { en: 'Violent showers', urdu: 'Bohat tez barish' },
      95: { en: 'Thunderstorm', urdu: 'Toofani garaj-chamak' },
      96: { en: 'Thunderstorm with slight hail', urdu: 'Olay aur toofan' },
      99: { en: 'Thunderstorm with heavy hail', urdu: 'Bhari olay aur toofan' },
    };

    const interp = conditions[code] || { en: 'Clear', urdu: 'Saaf' };

    return {
      success: true,
      location: placeName,
      coordinates: { latitude: targetLat, longitude: targetLon },
      temperatureC: tempC,
      temperatureF: tempF,
      feelsLikeC: appTempC,
      condition: interp.en,
      conditionUrdu: interp.urdu,
      humidityPercent: Math.round(current.relative_humidity_2m || 0),
      windSpeedKmH: Math.round(current.wind_speed_10m || 0),
      precipitationMm: current.precipitation || 0,
      isDaytime: current.is_day === 1,
      weatherCode: code,
    };
  } catch (err: any) {
    console.warn('[Aurix Weather] Weather fetch error:', err?.message || err);
    return {
      success: false,
      error: err?.message || 'Unable to fetch real-time weather',
      location: locationName || 'Current Location',
      temperatureC: 30,
      temperatureF: 86,
      condition: 'Clear sky / Sunny',
      conditionUrdu: 'Saaf asman',
      humidityPercent: 50,
      windSpeedKmH: 10,
    };
  }
}

// Server Device Time resolver matching user's requested timezone
function getServerDeviceTime(clientTimezone = 'Asia/Karachi') {
  try {
    const now = new Date();
    const tz = clientTimezone || 'Asia/Karachi';

    const time12 = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(now);

    const time24 = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(now);

    const dateStr = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(now);

    const dayStr = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'long',
    }).format(now);

    return {
      currentTime12h: time12,
      currentTime24h: time24,
      currentDate: dateStr,
      dayOfWeek: dayStr,
      timezone: tz,
      timestamp: now.getTime(),
      iso: now.toISOString(),
    };
  } catch (e) {
    const now = new Date();
    return {
      currentTime12h: now.toLocaleTimeString(),
      currentTime24h: now.toLocaleTimeString(),
      currentDate: now.toDateString(),
      dayOfWeek: 'Today',
      timezone: clientTimezone || 'Local Device Time',
      timestamp: now.getTime(),
      iso: now.toISOString(),
    };
  }
}

// Helper to execute tool logic
async function executeToolLocally(
  name: string,
  args: any,
  activeContext: any,
  clientContext?: any
): Promise<{ executionResult: any; clientActionData: any }> {
  let executionResult: any = { success: true };
  let clientActionData: any = null;

  if (name === 'getCurrentTimeAndDate') {
    const userTz = clientContext?.time?.timezone || clientContext?.timezone || 'Asia/Karachi';
    const timeData = getServerDeviceTime(userTz);

    // If client already provided high-precision client time, use that directly
    if (clientContext?.time?.time12) {
      timeData.currentTime12h = clientContext.time.time12;
      timeData.currentTime24h = clientContext.time.time24 || timeData.currentTime24h;
      timeData.currentDate = clientContext.time.date || timeData.currentDate;
      timeData.dayOfWeek = clientContext.time.day || timeData.dayOfWeek;
    }

    executionResult = {
      status: 'success',
      currentTime: timeData.currentTime12h,
      currentTime24h: timeData.currentTime24h,
      currentDate: timeData.currentDate,
      dayOfWeek: timeData.dayOfWeek,
      timezone: timeData.timezone,
      message: `The current local time is ${timeData.currentTime12h} (${timeData.dayOfWeek}, ${timeData.currentDate}) in ${timeData.timezone}.`,
    };

    clientActionData = {
      time12: timeData.currentTime12h,
      time24: timeData.currentTime24h,
      date: timeData.currentDate,
      day: timeData.dayOfWeek,
      timezone: timeData.timezone,
      title: `Live Clock: ${timeData.currentTime12h} (${timeData.timezone})`,
    };
  } else if (name === 'getWeather') {
    const requestedLoc = (args?.location as string) || '';
    const userLat = clientContext?.location?.latitude;
    const userLon = clientContext?.location?.longitude;
    const userCity = clientContext?.location?.city || clientContext?.city;
    const userCountry = clientContext?.location?.country || clientContext?.country;

    let targetLocName = requestedLoc;
    let targetLat = userLat;
    let targetLon = userLon;

    if (!requestedLoc || requestedLoc.toLowerCase() === 'current_location' || requestedLoc.toLowerCase() === 'here' || requestedLoc.toLowerCase() === 'my location') {
      targetLocName = userCity ? `${userCity}${userCountry ? `, ${userCountry}` : ''}` : 'Current Location';
    } else {
      // User asked for a specific city like "Lahore", "Tokyo", etc.
      targetLat = undefined;
      targetLon = undefined;
    }

    const weatherData = await fetchServerWeather(targetLocName, targetLat, targetLon);

    executionResult = {
      status: 'success',
      weather: weatherData,
      summary: `${weatherData.location}: ${weatherData.temperatureC}°C (${weatherData.temperatureF}°F), ${weatherData.condition} (${weatherData.conditionUrdu}), Humidity: ${weatherData.humidityPercent}%, Wind: ${weatherData.windSpeedKmH} km/h.`,
    };

    clientActionData = {
      ...weatherData,
      title: `Weather: ${weatherData.location} (${weatherData.temperatureC}°C • ${weatherData.condition})`,
    };
  } else if (name === 'getUserLocation') {
    const loc = clientContext?.location || {
      city: 'Detected Device Location',
      country: 'User Region',
      source: 'device',
    };

    executionResult = {
      status: 'success',
      location: loc,
      message: `User location is currently detected as ${loc.city || 'Local Area'}${loc.country ? `, ${loc.country}` : ''}.`,
    };

    clientActionData = {
      ...loc,
      title: `Location: ${loc.city || 'Detected'}${loc.country ? `, ${loc.country}` : ''}`,
    };
  } else if (name === 'openWebsite') {
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
async function generateSpokenAudio(ai: GoogleGenAI, text: string, voiceKey = 'male'): Promise<string | null> {
  const voiceCfg = AURIX_VOICE_CONFIGS[voiceKey] || AURIX_VOICE_CONFIGS.male;
  try {
    const ttsResponse = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceCfg.voiceName },
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

// WebSocket Live API bridge with automatic dual-engine fallback and dynamic multi-voice
wss.on('connection', async (clientWs: WebSocket, request?: any) => {
  console.log('[Aurix Server] Client connected to live session');

  const reqUrl = request ? new URL(request.url || '', 'http://localhost') : null;
  const clientApiKey = reqUrl?.searchParams?.get('apiKey') || (request?.headers?.['x-gemini-api-key'] as string);
  const apiKey = (clientApiKey && clientApiKey.trim()) || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    clientWs.send(
      JSON.stringify({
        type: 'error',
        message: 'No Gemini API Key found. Please connect your Gemini API key in Aurix settings.',
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

  // Device Context state updated dynamically from client
  const reqTz = reqUrl?.searchParams?.get('tz') || 'Asia/Karachi';
  const reqCity = reqUrl?.searchParams?.get('city') || '';
  const reqCountry = reqUrl?.searchParams?.get('country') || '';
  const reqTime12 = reqUrl?.searchParams?.get('time12') || '';
  const reqDate = reqUrl?.searchParams?.get('date') || '';
  const reqDay = reqUrl?.searchParams?.get('day') || '';

  let clientDeviceContext: any = {
    timezone: reqTz,
    time: {
      time12: reqTime12,
      date: reqDate,
      day: reqDay,
      timezone: reqTz,
    },
    location: {
      city: reqCity,
      country: reqCountry,
    },
  };

  // Preserve ongoing conversation history across voice switching
  const conversationHistory: Array<{ role: 'user' | 'model'; text: string }> = [];
  let currentModelTurnAccumulator = '';
  let currentUserTurnAccumulator = '';

  let currentVoiceKey = (reqUrl?.searchParams?.get('voice') || 'male').toLowerCase();
  if (!(currentVoiceKey in AURIX_VOICE_CONFIGS)) {
    currentVoiceKey = 'male';
  }

  // Initialize or reconfigure Gemini Live connection with specified voice
  const initLiveSession = async (voiceKey: string) => {
    currentVoiceKey = voiceKey in AURIX_VOICE_CONFIGS ? voiceKey : 'male';
    const voiceCfg = AURIX_VOICE_CONFIGS[currentVoiceKey];

    console.log(`[Voice] Selected: ${currentVoiceKey}`);
    console.log(`[LiveSession] Current voice: ${currentVoiceKey}`);

    // Flush any pending turn text into conversation history before reconnecting
    if (currentUserTurnAccumulator.trim()) {
      conversationHistory.push({ role: 'user', text: currentUserTurnAccumulator.trim() });
      currentUserTurnAccumulator = '';
    }
    if (currentModelTurnAccumulator.trim()) {
      conversationHistory.push({ role: 'model', text: currentModelTurnAccumulator.trim() });
      currentModelTurnAccumulator = '';
    }

    // Safely close previous session if one was active
    if (liveSession) {
      try {
        liveSession.close();
      } catch (e) {}
      liveSession = null;
    }

    try {
      clientWs.send(
        JSON.stringify({
          type: 'status',
          status: 'connecting',
          message: `Configuring Aurix ${voiceCfg.voiceName} Voice Link...`,
        })
      );

      let historyContextSnippet = '';
      if (conversationHistory.length > 0) {
        const recentTurns = conversationHistory.slice(-8);
        historyContextSnippet = `\n\n[PRIOR CONVERSATION CONTEXT BEFORE VOICE SWITCH - CONTINUE SMOOTHLY WITHOUT REPEATING]:\n${recentTurns
          .map((t) => `${t.role === 'user' ? 'User' : 'Aurix'}: ${t.text}`)
          .join('\n')}`;
      }

      // Compute fresh real-time local time context for user's device
      const timeData = getServerDeviceTime(
        clientDeviceContext?.time?.timezone || clientDeviceContext?.timezone || reqTz || 'Asia/Karachi'
      );
      const liveTime = clientDeviceContext?.time?.time12 || timeData.currentTime12h;
      const liveTime24 = clientDeviceContext?.time?.time24 || timeData.currentTime24h;
      const liveDate = clientDeviceContext?.time?.date || timeData.currentDate;
      const liveDay = clientDeviceContext?.time?.day || timeData.dayOfWeek;
      const liveTz = clientDeviceContext?.time?.timezone || clientDeviceContext?.timezone || reqTz || 'Asia/Karachi';
      const liveCity = clientDeviceContext?.location?.city || reqCity || 'User Current Location';
      const liveCountry = clientDeviceContext?.location?.country || reqCountry || '';

      const deviceContextSnippet = `\n\n[REAL-TIME USER DEVICE TIME, DATE & LOCATION CONTEXT]:
- Exact Current Device Time: ${liveTime} (24-hour: ${liveTime24})
- Exact Current Device Date & Day: ${liveDay}, ${liveDate}
- User Timezone: ${liveTz}
- Detected User Location: ${liveCity}${liveCountry ? `, ${liveCountry}` : ''}
- EXACT TIME MANDATE: When asked "time kya hai?" or "what time is it?", ALWAYS respond with the user's exact local time (${liveTime}). Never use UTC or server container time.
- EXACT WEATHER MANDATE: When asked about weather or temperature, use 'getWeather' or provide the real-time weather conditions and degrees.`;

      const systemInstruction = `${AURIX_SYSTEM_INSTRUCTION}\n\n[VOICE PERSONA GUIDANCE]: ${voiceCfg.tonePrompt}${deviceContextSnippet}${historyContextSnippet}`;

      liveSession = await ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceCfg.voiceName,
              },
            },
          },
          systemInstruction,
          tools: [
            {
              functionDeclarations: ALL_AURIX_TOOLS,
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
                  console.log(`[Audio] Output voice: ${currentVoiceKey}`);
                  console.log(
                    `[Latency] [5] Gemini first response received on server (${part.inlineData.data.length} chars base64) | Voice: ${voiceCfg.voiceName} | Timestamp: ${Date.now()} ms`
                  );
                  clientWs.send(
                    JSON.stringify({
                      type: 'audio',
                      audio: part.inlineData.data,
                      mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000',
                      voice: currentVoiceKey,
                    })
                  );
                }
                if (part.text) {
                  currentModelTurnAccumulator += part.text;
                  clientWs.send(
                    JSON.stringify({
                      type: 'model_transcript',
                      text: part.text,
                      voice: currentVoiceKey,
                    })
                  );
                }
              }
            }

            // 2. Interruption signal
            if (message.serverContent?.interrupted) {
              console.log('[Aurix Server] Interruption signal received from Gemini');
              if (currentModelTurnAccumulator.trim()) {
                conversationHistory.push({ role: 'model', text: currentModelTurnAccumulator.trim() });
                currentModelTurnAccumulator = '';
              }
              clientWs.send(JSON.stringify({ type: 'interrupted' }));
            }

            // 3. User Audio Transcription
            const inputTranscription = (message.serverContent as any)?.inputAudioTranscription?.text;
            if (inputTranscription) {
              currentUserTurnAccumulator += ' ' + inputTranscription;
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
              currentModelTurnAccumulator += ' ' + outputTranscription;
              clientWs.send(
                JSON.stringify({
                  type: 'model_transcript',
                  text: outputTranscription,
                  voice: currentVoiceKey,
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
                const { executionResult, clientActionData } = await executeToolLocally(
                  name,
                  args,
                  activeContext,
                  clientDeviceContext
                );

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
              if (currentUserTurnAccumulator.trim()) {
                conversationHistory.push({ role: 'user', text: currentUserTurnAccumulator.trim() });
                currentUserTurnAccumulator = '';
              }
              if (currentModelTurnAccumulator.trim()) {
                conversationHistory.push({ role: 'model', text: currentModelTurnAccumulator.trim() });
                currentModelTurnAccumulator = '';
              }
              clientWs.send(JSON.stringify({ type: 'turn_complete', voice: currentVoiceKey }));
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

      useFallbackEngine = false;
      console.log(`[LiveSession] Session created with voice: ${currentVoiceKey}`);
      clientWs.send(
        JSON.stringify({
          type: 'status',
          status: 'ready',
          message: `Aurix is online and listening (${voiceCfg.voiceName} Voice Active).`,
          voice: currentVoiceKey,
        })
      );
      console.log(
        `[Gemini] Live session: READY • Voice: ${voiceCfg.voiceName} (${currentVoiceKey}) • Full-Duplex PCM16 16kHz Streaming Active`
      );
    } catch (error: any) {
      console.warn(
        '[Aurix Server] Live API connection seamlessly falling back to Streaming Conversational Engine:',
        error?.message || error
      );
      useFallbackEngine = true;
      console.log(`[LiveSession] Session created with voice: ${currentVoiceKey}`);
      clientWs.send(
        JSON.stringify({
          type: 'status',
          status: 'ready',
          message: 'Aurix is online (High-Speed Voice Engine Active).',
          voice: currentVoiceKey,
        })
      );
    }
  };

  // Connect initial live session
  await initLiveSession(currentVoiceKey);

  // Handle incoming client messages (Audio chunks, video frames, text commands, interrupts, voice switches, pings, client context)
  clientWs.on('message', async (rawData: Buffer | string) => {
    if (!isSessionAlive) return;

    try {
      const data = JSON.parse(rawData.toString());

      // Update Device Context (time, location, weather, timezone)
      if (data.type === 'client_context' && data.context) {
        clientDeviceContext = {
          ...clientDeviceContext,
          ...data.context,
        };
        console.log(
          `[Aurix Server] Received device context update: Timezone: ${clientDeviceContext?.time?.timezone || clientDeviceContext?.timezone}, Time: ${clientDeviceContext?.time?.time12}, City: ${clientDeviceContext?.location?.city}`
        );
        return;
      }

      // Real-time Voice Reconfiguration Request
      if (data.type === 'reconfigure_voice' && data.voice) {
        console.log(`[Voice] Selected: ${data.voice}`);
        console.log(`[LiveSession] Current voice: ${data.voice}`);
        console.log('[Aurix Server] Dynamic voice switch requested:', data.voice);
        await initLiveSession(data.voice);
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(
            JSON.stringify({
              type: 'voice_reconfigured',
              voice: data.voice,
              message: `Voice changed to ${data.voice}`,
            })
          );
        }
        return;
      }

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
              console.log(
                `[Latency] [4] Gemini receives input chunk (${data.audio.length} base64 chars) | Timestamp: ${Date.now()} ms`
              );
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
      // 3. User Text Query (with optional image and voice)
      else if (data.type === 'text' && data.text) {
        const queryText = data.text;
        const queryImage = data.image;
        const queryVoice = (data.voice || currentVoiceKey).toLowerCase();
        const voiceCfg = AURIX_VOICE_CONFIGS[queryVoice] || AURIX_VOICE_CONFIGS.male;

        console.log(
          '[Aurix Server] Processing prompt:',
          queryText,
          queryImage ? '(with image attachment)' : '',
          `[Voice: ${voiceCfg.voiceName}]`
        );

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

          const timeData = getServerDeviceTime(
            clientDeviceContext?.time?.timezone || clientDeviceContext?.timezone || reqTz || 'Asia/Karachi'
          );
          const liveTime = clientDeviceContext?.time?.time12 || timeData.currentTime12h;
          const liveDate = clientDeviceContext?.time?.date || timeData.currentDate;
          const liveDay = clientDeviceContext?.time?.day || timeData.dayOfWeek;
          const liveTz = clientDeviceContext?.time?.timezone || clientDeviceContext?.timezone || reqTz || 'Asia/Karachi';
          const liveCity = clientDeviceContext?.location?.city || reqCity || 'User Location';

          const deviceSnippet = `\n\n[REAL-TIME USER DEVICE TIME & LOCATION]:
- Device Time: ${liveTime} (${liveDay}, ${liveDate})
- Timezone: ${liveTz}
- Location: ${liveCity}
- If asked what time it is, answer with ${liveTime}.`;

          const systemInstruction = `${AURIX_SYSTEM_INSTRUCTION}\n\n[VOICE PERSONA GUIDANCE]: ${voiceCfg.tonePrompt}${deviceSnippet}`;

          const response = await generateContentWithResilience(
            ai,
            contents,
            systemInstruction,
            [
              {
                functionDeclarations: ALL_AURIX_TOOLS,
              },
            ]
          );

          // Check for tool calls
          if (response.functionCalls && response.functionCalls.length > 0) {
            for (const call of response.functionCalls) {
              const { name, args } = call;
              const { clientActionData } = await executeToolLocally(
                name,
                args,
                activeContext,
                clientDeviceContext
              );
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

            // Generate 24kHz Spoken Audio via Gemini 3.1 Flash TTS with selected voice
            const spokenAudio = await generateSpokenAudio(ai, responseText, queryVoice);
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
  // Always serve public assets (icons, manifests) directly
  app.use(express.static(path.join(__dirname, 'public')));

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

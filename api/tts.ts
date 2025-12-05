import { GoogleGenAI, Modality } from "@google/genai";

// --- Mock Database / Cache Implementation ---
// In a real production environment on Vercel, you would use Vercel KV (Redis) or a Postgres DB.
// Example: import { kv } from '@vercel/kv';
// Since we cannot provision infrastructure here, we use a global variable.
// Note: Global variables in serverless functions are not persistent across cold starts, 
// but this demonstrates the structure for "Server Database Caching".
const GLOBAL_CACHE = new Map<string, string>();

async function getFromDatabase(key: string): Promise<string | null> {
  // REAL IMPL: return await kv.get(key);
  return GLOBAL_CACHE.get(key) || null;
}

async function saveToDatabase(key: string, data: string): Promise<void> {
  // REAL IMPL: await kv.set(key, data);
  GLOBAL_CACHE.set(key, data);
}
// --------------------------------------------

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { text } = await request.json();

    if (!text) {
      return new Response(JSON.stringify({ error: 'Text is required' }), { status: 400 });
    }

    // 1. Check Server Database Cache
    const cachedAudio = await getFromDatabase(text);
    if (cachedAudio) {
      console.log(`Cache HIT for: ${text}`);
      return new Response(JSON.stringify({ audioData: cachedAudio }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`Cache MISS for: ${text}, calling Gemini...`);

    // 2. Call Gemini API
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Read this Chinese Pinyin sound clearly and slowly: "${text}".`;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const audioData = result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!audioData) {
      throw new Error('Failed to generate audio');
    }

    // 3. Save to Server Database
    await saveToDatabase(text, audioData);

    return new Response(JSON.stringify({ audioData }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('TTS API Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
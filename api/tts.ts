import { GoogleGenAI, Modality } from "@google/genai";
import { put, list } from "@vercel/blob";

// --- Vercel Blob Cache Implementation ---

/**
 * Tries to fetch cached audio data (base64 string) from Vercel Blob storage.
 */
async function getFromCache(text: string): Promise<string | null> {
  try {
    // Use encodeURIComponent to handle special characters like 'ü' safely in filenames
    const filename = `audio/${encodeURIComponent(text)}.pcm`;
    
    // Check if the file exists using list (more efficient than trying to fetch and failing)
    const { blobs } = await list({ prefix: filename, limit: 1 });
    
    // Ensure we have an exact match on the pathname to avoid prefix collisions
    const blob = blobs.find(b => b.pathname === filename);

    if (blob) {
      console.log(`Blob Cache HIT for: ${text}`);
      const response = await fetch(blob.url);
      if (!response.ok) throw new Error("Failed to fetch blob content");
      
      const arrayBuffer = await response.arrayBuffer();
      // Convert raw binary back to base64 for the client
      return Buffer.from(arrayBuffer).toString('base64');
    }
  } catch (e) {
    console.warn("Blob cache read error:", e);
  }
  return null;
}

/**
 * Saves generated audio data (base64 string) to Vercel Blob storage.
 */
async function saveToCache(text: string, base64Audio: string): Promise<void> {
  try {
    const filename = `audio/${encodeURIComponent(text)}.pcm`;
    const buffer = Buffer.from(base64Audio, 'base64');
    
    await put(filename, buffer, { 
      access: 'public',
      // No need to return the URL here as we serve base64 directly to client currently
    });
    console.log(`Blob Cache SAVED for: ${text}`);
  } catch (e) {
    console.warn("Blob cache write error:", e);
  }
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

    // 1. Check Vercel Blob Cache
    const cachedAudio = await getFromCache(text);
    if (cachedAudio) {
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

    // 3. Save to Vercel Blob (Background async optional, but awaiting ensures safety)
    await saveToCache(text, audioData);

    return new Response(JSON.stringify({ audioData }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('TTS API Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
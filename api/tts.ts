import { put, list } from "@vercel/blob";

// --- Vercel Blob Cache Implementation ---

/**
 * Tries to fetch cached audio data (base64 string) from Vercel Blob storage.
 */
async function getFromCache(text: string): Promise<string | null> {
  try {
    // Use encodeURIComponent to handle special characters safely
    // stored as .mp3
    const filename = `audio/${encodeURIComponent(text)}.mp3`;
    
    // Check if the file exists using list
    const { blobs } = await list({ prefix: filename, limit: 1 });
    
    // Ensure we have an exact match on the pathname
    const blob = blobs.find(b => b.pathname === filename);

    if (blob) {
      console.log(`Blob Cache HIT for: ${text}`);
      const response = await fetch(blob.url);
      if (!response.ok) throw new Error("Failed to fetch blob content");
      
      const arrayBuffer = await response.arrayBuffer();
      // Convert binary back to base64 for the client
      return Buffer.from(arrayBuffer).toString('base64');
    }
  } catch (e) {
    console.warn("Blob cache read error:", e);
  }
  return null;
}

/**
 * Saves audio data (base64 string) to Vercel Blob storage.
 */
async function saveToCache(text: string, base64Audio: string): Promise<void> {
  try {
    const filename = `audio/${encodeURIComponent(text)}.mp3`;
    const buffer = Buffer.from(base64Audio, 'base64');
    
    await put(filename, buffer, { 
      access: 'public',
      addRandomSuffix: false // Ensure exact filename match for cache lookup
    });
    console.log(`Blob Cache SAVED for: ${text}`);
  } catch (e) {
    console.warn("Blob cache write error:", e);
  }
}
// --------------------------------------------

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    return response.status(405).send('Method Not Allowed');
  }

  try {
    const { text } = request.body || {};

    if (!text) {
      return response.status(400).json({ error: 'Text is required' });
    }

    // 1. Check Vercel Blob Cache
    const cachedAudio = await getFromCache(text);
    if (cachedAudio) {
      return response.status(200).json({ audioData: cachedAudio });
    }

    console.log(`Cache MISS for: ${text}, fetching from external source...`);

    // 2. Fetch from external MP3 source
    // MAPPING FIX: Replace all occurrences of 'ü' with 'v' for the file URL
    // This handles 'ü' -> 'v', 'üe' -> 've', 'lü' -> 'lv', etc.
    const downloadChar = text.replace(/ü/g, 'v');

    const externalUrl = `http://du.hanyupinyin.cn/du/pinyin/${downloadChar}.mp3`;
    
    const externalResponse = await fetch(externalUrl);
    
    // ERROR HANDLING: Check status code
    if (!externalResponse.ok) {
      console.error(`External fetch failed: ${externalResponse.status} for ${text} (mapped to ${downloadChar})`);
      return response.status(404).json({ error: `Audio source not found (Status: ${externalResponse.status})` });
    }

    // ERROR HANDLING: Check Content-Type to avoid caching 404 HTML pages
    const contentType = externalResponse.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      console.error(`Invalid Content-Type: ${contentType} for ${text}`);
      return response.status(404).json({ error: 'Audio source returned HTML instead of Audio' });
    }

    const arrayBuffer = await externalResponse.arrayBuffer();

    // ERROR HANDLING: Check for empty files
    if (arrayBuffer.byteLength < 100) {
      console.error(`File too small (${arrayBuffer.byteLength} bytes) for ${text}`);
      return response.status(500).json({ error: 'Audio file invalid or empty' });
    }

    const base64Audio = Buffer.from(arrayBuffer).toString('base64');

    // 3. Save to Vercel Blob
    // We save using the ORIGINAL text ('ü') as the key, so the cache hit works next time
    await saveToCache(text, base64Audio);

    return response.status(200).json({ audioData: base64Audio });

  } catch (error) {
    console.error('TTS API Error:', error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}
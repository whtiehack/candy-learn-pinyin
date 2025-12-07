import { Buffer } from "buffer";
import { sql } from "@vercel/postgres";

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    return response.status(405).send('Method Not Allowed');
  }

  try {
    let { text } = request.body || {};

    if (!text) {
      return response.status(400).json({ error: 'Text is required' });
    }
    
    // Normalization: 'ü' -> 'v'
    text = text.replace(/ü/g, 'v');

    // 1. Try fetching from Postgres Cache
    try {
      // Optimistic approach: Assume table exists and try to select.
      const { rows } = await sql`SELECT audio_data FROM tts_cache WHERE text = ${text} LIMIT 1;`;
      
      if (rows.length > 0) {
        console.log(`Cache HIT (Postgres) for: ${text}`);
        return response.status(200).json({ audioData: rows[0].audio_data });
      }
    } catch (dbError) {
      // If SELECT fails (likely because table doesn't exist yet), try to create it here.
      // This ensures we don't run CREATE TABLE on every single request, only on errors.
      console.log("Cache lookup failed (likely table missing). Initializing table...");
      try {
        await sql`CREATE TABLE IF NOT EXISTS tts_cache (
          text VARCHAR(255) PRIMARY KEY,
          audio_data TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`;
      } catch (createError) {
        console.error("Failed to create table:", createError);
      }
    }

    console.log(`Cache MISS. Fetching external TTS for: ${text}`);

    // 2. Fetch from external MP3 source
    const downloadChar = text;
    let externalUrl = `http://du.hanyupinyin.cn/du/pinyin/${downloadChar}.mp3`;
    let externalResponse = await fetch(externalUrl);
    
    // Fallback logic for tones
    if (externalResponse.status === 404) {
        console.log(`Source 404 for ${downloadChar}.mp3, trying fallback with tone 1...`);
        const fallbackChar = `${downloadChar}1`;
        externalUrl = `http://du.hanyupinyin.cn/du/pinyin/${fallbackChar}.mp3`;
        externalResponse = await fetch(externalUrl);
    }
    
    if (!externalResponse.ok) {
      console.error(`External fetch failed: ${externalResponse.status} for ${text}`);
      return response.status(404).json({ error: `Audio source not found (Status: ${externalResponse.status})` });
    }

    const contentType = externalResponse.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      console.error(`Invalid Content-Type: ${contentType} for ${text}`);
      return response.status(404).json({ error: 'Audio source returned HTML instead of Audio' });
    }

    const arrayBuffer = await externalResponse.arrayBuffer();
    if (arrayBuffer.byteLength < 100) {
      console.error(`File too small (${arrayBuffer.byteLength} bytes) for ${text}`);
      return response.status(500).json({ error: 'Audio file invalid or empty' });
    }

    const base64Audio = Buffer.from(arrayBuffer).toString('base64');

    // 3. Save to Postgres Cache
    try {
        await sql`
          INSERT INTO tts_cache (text, audio_data)
          VALUES (${text}, ${base64Audio})
          ON CONFLICT (text) DO NOTHING;
        `;
        console.log(`Saved to Postgres cache: ${text}`);
    } catch (dbWriteError) {
        console.error("Database error (Cache Write):", dbWriteError);
    }

    return response.status(200).json({ audioData: base64Audio });

  } catch (error) {
    console.error('TTS API Error:', error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}
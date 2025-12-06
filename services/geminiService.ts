// Caches
const audioBufferCache = new Map<string, AudioBuffer>(); // For Web Audio (Non-iOS)
const audioUrlCache = new Map<string, string>(); // For HTML5 Audio (iOS)
const pendingRequests = new Map<string, Promise<ArrayBuffer>>(); // Raw Data Promise

// Prefix for LocalStorage keys
const LOCAL_STORAGE_PREFIX = 'candy_pinyin_cache_v1_';

// AudioContext Singleton (Lazy load)
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  return audioCtx;
}

// --- Platform Detection ---
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
              (navigator.userAgent.includes("Mac") && "ontouchend" in document);

// --- iOS Silent Switch Helper ---
const SILENT_WAV_BASE64 = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
let isAudioUnlocked = false;

export const unlockAudio = () => {
  // 1. Always try to resume AudioContext (Good practice for all platforms)
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  // 2. iOS-specific "Silent Switch Bypass" hack
  // Only play the silent audio file on iOS to wake up the media session
  if (!isIOS) return;
  if (isAudioUnlocked) return;

  const audio = new Audio(SILENT_WAV_BASE64);
  audio.play().then(() => {
    isAudioUnlocked = true;
    console.log("Audio unlocked (iOS)");
  }).catch(() => {
    // Interaction might not be sufficient yet
  });
};

// Helper: Decode Base64 string to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const cleanBase64 = base64.replace(/\s/g, '');
  const binaryString = atob(cleanBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Shared logic to fetch audio data as ArrayBuffer.
 * Handles deduplication (pendingRequests) and persistent cache (LocalStorage).
 */
async function fetchAudioData(pinyin: string): Promise<ArrayBuffer> {
  // Return existing promise if already fetching
  if (pendingRequests.has(pinyin)) {
    const buffer = await pendingRequests.get(pinyin)!;
    // Return a copy to prevent one consumer from neutering the buffer (via decodeAudioData)
    return buffer.slice(0);
  }

  const promise = (async () => {
    const storageKey = `${LOCAL_STORAGE_PREFIX}${pinyin}`;
    const storedBase64 = localStorage.getItem(storageKey);

    if (storedBase64) {
      return base64ToArrayBuffer(storedBase64);
    }

    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: pinyin }),
    });

    if (!response.ok) throw new Error(`Server error: ${response.statusText}`);

    const data = await response.json();
    if (!data.audioData) throw new Error("No audio data received");

    try {
      localStorage.setItem(storageKey, data.audioData);
    } catch (e) {
      console.warn("LocalStorage write failed:", e);
    }

    return base64ToArrayBuffer(data.audioData);
  })();

  pendingRequests.set(pinyin, promise);

  try {
    const buffer = await promise;
    return buffer.slice(0); // Return copy
  } finally {
    // Keep promise in map for a short while? No, remove immediately to free memory,
    // relying on the specialized caches (buffer/url) instead.
    pendingRequests.delete(pinyin);
  }
}

/**
 * Strategy 1: HTML5 Audio (Best for iOS)
 * - Respects the hardware mute switch better on some configurations.
 * - Simpler for single-shot playback on iOS Safari.
 */
async function playWithHtml5Audio(pinyin: string): Promise<number> {
  let url = audioUrlCache.get(pinyin);

  if (!url) {
    const buffer = await fetchAudioData(pinyin);
    const blob = new Blob([buffer], { type: 'audio/mp3' });
    url = URL.createObjectURL(blob);
    audioUrlCache.set(pinyin, url);
  }

  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    audio.volume = 1.0;
    
    const onLoadedMetadata = () => {
      const duration = audio.duration || 1.0;
      audio.play()
        .then(() => resolve(duration))
        .catch(e => {
            console.warn("iOS Autoplay prevented:", e);
            reject(e);
        });
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('error', (e) => reject(e));
    
    // Fallback: If metadata loads very fast or is already cached by browser
    if (audio.readyState >= 1) {
        onLoadedMetadata();
    } else {
        audio.load();
    }
  });
}

/**
 * Strategy 2: Web Audio API (Best for Android/Desktop)
 * - Low latency.
 * - High concurrency support (sound effects).
 */
async function playWithWebAudio(pinyin: string): Promise<number> {
  const ctx = getAudioContext();
  
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  let buffer = audioBufferCache.get(pinyin);

  if (!buffer) {
    const rawData = await fetchAudioData(pinyin);
    // decodeAudioData detaches/consumes the ArrayBuffer, so we MUST ensure we pass a slice
    // if we wanted to reuse the buffer (though here fetchAudioData already returns a slice).
    buffer = await ctx.decodeAudioData(rawData);
    audioBufferCache.set(pinyin, buffer);
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);

  return buffer.duration;
}

/**
 * Main Entry Point
 */
export const playPinyinAudio = async (pinyin: string): Promise<number> => {
  try {
    if (isIOS) {
      // console.log("Playing with HTML5 Audio (iOS Mode)");
      return await playWithHtml5Audio(pinyin);
    } else {
      // console.log("Playing with Web Audio API");
      return await playWithWebAudio(pinyin);
    }
  } catch (error) {
    console.error("Error playing Pinyin audio:", error);
    throw error;
  }
};
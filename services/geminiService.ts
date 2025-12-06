// Client-side Memory Cache for Decoded AudioBuffers (optimized for AudioContext)
const audioBufferCache = new Map<string, AudioBuffer>();
const pendingRequests = new Map<string, Promise<AudioBuffer>>();

// Prefix for LocalStorage keys to avoid collisions
const LOCAL_STORAGE_PREFIX = 'candy_pinyin_cache_v1_';

// Singleton AudioContext
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  return audioCtx;
}

// --- iOS Silent Switch Helper ---
// A silent audio file to wake up the audio subsystem on first user interaction
const SILENT_WAV_BASE64 = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
let isAudioUnlocked = false;

export const unlockAudio = () => {
  // 1. Always try to resume AudioContext (Required for Chrome/Safari autoplay policies)
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(e => console.warn("AudioContext resume failed:", e));
  }

  // 2. Detect iOS: iPhone, iPad, iPod or iPad (iPadOS 13+ desktop mode)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.userAgent.includes("Mac") && "ontouchend" in document);

  // 3. Only execute the HTML5 Audio "Silent Switch Bypass" hack on iOS devices
  if (!isIOS) return;

  if (isAudioUnlocked) return;
  const audio = new Audio(SILENT_WAV_BASE64);
  audio.play().then(() => {
    isAudioUnlocked = true;
    console.log("Audio unlocked (iOS)");
  }).catch(() => {
    // Interaction might not be sufficient yet, ignore
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
 * Fetches Pinyin audio and plays it using Web Audio API (AudioContext).
 * Returns the duration of the audio in seconds.
 */
export const playPinyinAudio = async (pinyin: string): Promise<number> => {
  const ctx = getAudioContext();

  // Ensure context is running before playing
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  try {
    let buffer: AudioBuffer;

    // 1. Check In-Memory Cache (Decoded buffers - Fastest)
    if (audioBufferCache.has(pinyin)) {
      buffer = audioBufferCache.get(pinyin)!;
    }
    // 2. Check Pending Requests (Deduplication)
    else if (pendingRequests.has(pinyin)) {
      buffer = await pendingRequests.get(pinyin)!;
    }
    // 3. Check LocalStorage & Fetch (Persistence)
    else {
      const fetchPromise = (async () => {
        const storageKey = `${LOCAL_STORAGE_PREFIX}${pinyin}`;
        const storedBase64 = localStorage.getItem(storageKey);
        
        let arrayBuffer: ArrayBuffer;

        if (storedBase64) {
          // Cache Hit in LocalStorage: Convert Base64 to ArrayBuffer
          arrayBuffer = base64ToArrayBuffer(storedBase64);
        } else {
          // Cache Miss: Fetch from Server
          const response = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: pinyin }),
          });

          if (!response.ok) throw new Error(`Server error: ${response.statusText}`);

          const data = await response.json();
          if (!data.audioData) throw new Error("No audio data received");

          // Save to LocalStorage for next visit
          try {
            localStorage.setItem(storageKey, data.audioData);
          } catch (e) {
            console.warn("LocalStorage write failed (quota exceeded?):", e);
          }

          arrayBuffer = base64ToArrayBuffer(data.audioData);
        }

        // Decode audio data for AudioContext
        // This is async and CPU intensive, so we cache the result
        return await ctx.decodeAudioData(arrayBuffer);
      })();

      pendingRequests.set(pinyin, fetchPromise);

      try {
        buffer = await fetchPromise;
        audioBufferCache.set(pinyin, buffer);
      } finally {
        pendingRequests.delete(pinyin);
      }
    }

    // 4. Play using AudioBufferSourceNode
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);

    return buffer.duration;

  } catch (error) {
    console.error("Error playing Pinyin audio:", error);
    throw error;
  }
};
// Client-side Memory Cache for Audio URLs (Blob URLs)
const audioUrlCache = new Map<string, string>();
const pendingRequests = new Map<string, Promise<string>>();

// Prefix for LocalStorage keys to avoid collisions
const LOCAL_STORAGE_PREFIX = 'candy_pinyin_cache_v1_';

// --- iOS Silent Switch Helper ---
// A silent audio file to wake up the audio subsystem on first user interaction
const SILENT_WAV_BASE64 = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
let isAudioUnlocked = false;

export const unlockAudio = () => {
  // Detect iOS: iPhone, iPad, iPod or iPad (iPadOS 13+ desktop mode)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.userAgent.includes("Mac") && "ontouchend" in document);

  // Only execute this hack on iOS devices
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

// Helper: Decode Base64 string to Uint8Array
function decodeBase64(base64: string) {
  const cleanBase64 = base64.replace(/\s/g, '');
  const binaryString = atob(cleanBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Fetches Pinyin audio from the server API and plays it using HTML5 Audio.
 * Returns the duration of the audio in seconds.
 */
export const playPinyinAudio = async (pinyin: string): Promise<number> => {
  try {
    let audioUrl: string;

    // 1. Check In-Memory Cache (Fastest, for current session)
    if (audioUrlCache.has(pinyin)) {
      audioUrl = audioUrlCache.get(pinyin)!;
    } 
    // 2. Check Pending Requests (Deduplication)
    else if (pendingRequests.has(pinyin)) {
      audioUrl = await pendingRequests.get(pinyin)!;
    } 
    // 3. Check LocalStorage & Fetch (Persistence)
    else {
      const storageKey = `${LOCAL_STORAGE_PREFIX}${pinyin}`;
      const storedBase64 = localStorage.getItem(storageKey);

      if (storedBase64) {
        // Cache Hit in LocalStorage: Rehydrate Blob
        const audioBytes = decodeBase64(storedBase64);
        const blob = new Blob([audioBytes], { type: 'audio/mp3' });
        audioUrl = URL.createObjectURL(blob);
        audioUrlCache.set(pinyin, audioUrl);
      } else {
        // Cache Miss: Fetch from Server
        const fetchPromise = (async () => {
          // console.log(`Fetching audio for: ${pinyin}`);
          
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

          const audioBytes = decodeBase64(data.audioData);
          const blob = new Blob([audioBytes], { type: 'audio/mp3' });
          const url = URL.createObjectURL(blob);
          return url;
        })();

        pendingRequests.set(pinyin, fetchPromise);

        try {
          audioUrl = await fetchPromise;
          audioUrlCache.set(pinyin, audioUrl);
        } finally {
          pendingRequests.delete(pinyin);
        }
      }
    }

    // 4. Play using HTML5 Audio (Bypasses iOS Mute Switch better than AudioContext)
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);
      
      // Allow audio to play concurrently
      audio.volume = 1.0;
      
      // Preload metadata to get duration
      audio.addEventListener('loadedmetadata', () => {
         // Resolve immediately with duration, don't wait for end
         // But we need to actually play it
         const duration = audio.duration || 1.0; // Fallback 1s
         
         audio.play()
           .then(() => resolve(duration))
           .catch((e) => {
             console.warn("Autoplay prevented or failed:", e);
             reject(e);
           });
      });

      audio.addEventListener('error', (e) => {
        reject(e);
      });

      // Fallback if metadata takes too long
      audio.load();
    });

  } catch (error) {
    console.error("Error playing Pinyin audio:", error);
    throw error;
  }
};
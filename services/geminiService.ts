// Audio Context Management
let outputAudioContext: AudioContext | null = null;

// Client-side Memory Cache (avoids re-fetching within the same session)
const audioCache = new Map<string, AudioBuffer>();
const pendingRequests = new Map<string, Promise<AudioBuffer>>();

// --- iOS Silent Switch Bypass ---
// A tiny, silent WAV file encoded in Base64.
// Playing this via an HTML5 Audio element forces iOS to switch the Audio Session category 
// to "Playback", which allows sound to play even if the physical mute switch is on.
const SILENT_WAV_BASE64 = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

const unlockIOSAudioSession = () => {
  const audio = new Audio(SILENT_WAV_BASE64);
  audio.play().catch((e) => {
    // Ignore autoplay errors
  });
};
// -------------------------------

const getAudioContext = async () => {
  if (!outputAudioContext) {
    outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  
  if (outputAudioContext.state === 'suspended') {
    await outputAudioContext.resume();
  }
  return outputAudioContext;
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

// Play Audio Buffer
function playBuffer(buffer: AudioBuffer, ctx: AudioContext) {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
}

/**
 * Fetches Pinyin audio (MP3) from the server API and plays it.
 * Returns the duration of the audio in seconds.
 */
export const playPinyinAudio = async (pinyin: string): Promise<number> => {
  try {
    // 0. Fix for iOS Silent Switch
    unlockIOSAudioSession();

    // 1. Get Audio Context
    const ctx = await getAudioContext();
    
    let audioBuffer: AudioBuffer;

    // 2. Check Memory Cache
    if (audioCache.has(pinyin)) {
      audioBuffer = audioCache.get(pinyin)!;
    } 
    // 3. Check Pending Requests
    else if (pendingRequests.has(pinyin)) {
      audioBuffer = await pendingRequests.get(pinyin)!;
    } 
    // 4. Fetch from Server API
    else {
      const fetchPromise = (async () => {
        console.log(`Fetching audio for: ${pinyin}`);
        
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: pinyin }),
        });

        if (!response.ok) {
          throw new Error(`Server error: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.audioData) {
          throw new Error("No audio data received from server");
        }

        const audioBytes = decodeBase64(data.audioData);
        
        // Use browser's native decoder for MP3 data.
        // We must copy the buffer because decodeAudioData might detach it.
        const bufferCopy = audioBytes.buffer.slice(0) as ArrayBuffer;
        return await ctx.decodeAudioData(bufferCopy);
      })();

      pendingRequests.set(pinyin, fetchPromise);

      try {
        audioBuffer = await fetchPromise;
        audioCache.set(pinyin, audioBuffer);
      } finally {
        pendingRequests.delete(pinyin);
      }
    }

    // 5. Play
    playBuffer(audioBuffer, ctx);
    return audioBuffer.duration;

  } catch (error) {
    console.error("Error playing Pinyin audio:", error);
    throw error;
  }
};
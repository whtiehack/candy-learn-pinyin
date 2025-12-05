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
  // We check if it looks like an iOS device (simple check) or just run it everywhere as it's harmless.
  // Running it everywhere ensures consistency.
  const audio = new Audio(SILENT_WAV_BASE64);
  
  // We must play it. Since we are inside a user interaction (click), this is allowed.
  // We catch errors just in case, so we don't block the main flow.
  audio.play().catch((e) => {
    // This might fail if not triggered by a user click, but our app only plays on click.
    // Console log optional to avoid noise.
  });
};
// -------------------------------

const getAudioContext = async () => {
  if (!outputAudioContext) {
    // We do NOT set sampleRate here. We let the browser/hardware decide the output rate.
    // Setting it to 24000 explicitly can cause silence or failure on devices that don't support it.
    outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  
  // Browsers require user interaction to resume AudioContext.
  // We ensure it is running before trying to play.
  if (outputAudioContext.state === 'suspended') {
    await outputAudioContext.resume();
  }
  return outputAudioContext;
};

// Helper: Decode Base64 string to Uint8Array
function decode(base64: string) {
  // Fix for potential whitespace in base64 string
  const cleanBase64 = base64.replace(/\s/g, '');
  const binaryString = atob(cleanBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper: Decode raw audio data to AudioBuffer
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  // Ensure the data length is even because Int16Array requires multiples of 2 bytes.
  // If we have an odd number of bytes, we pad with one zero byte.
  let bufferToDecode = data;
  if (data.byteLength % 2 !== 0) {
    console.warn("Audio data length is odd, padding with 1 byte to fit Int16Array");
    const newBuffer = new Uint8Array(data.byteLength + 1);
    newBuffer.set(data);
    bufferToDecode = newBuffer;
  }

  // Create Int16Array view on the buffer
  const dataInt16 = new Int16Array(
    bufferToDecode.buffer, 
    bufferToDecode.byteOffset, 
    bufferToDecode.byteLength / 2
  );

  const frameCount = dataInt16.length / numChannels;
  
  // Create a buffer with the source sample rate (24000Hz for Gemini TTS)
  // The AudioContext will automatically resample this to the hardware rate during playback.
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Normalize 16-bit signed integer (-32768 to 32767) to float (-1.0 to 1.0)
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Play Audio Buffer
function playBuffer(buffer: AudioBuffer, ctx: AudioContext) {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
}

/**
 * Fetches Pinyin audio from the server API and plays it.
 * Returns the duration of the audio in seconds.
 */
export const playPinyinAudio = async (pinyin: string): Promise<number> => {
  try {
    // 0. Fix for iOS Silent Switch:
    // Trigger the silent HTML5 audio "hack" to force the session to Playback mode.
    unlockIOSAudioSession();

    // 1. Get and Resume Audio Context (Must be triggered by user interaction flow)
    const ctx = await getAudioContext();
    
    let audioBuffer: AudioBuffer;

    // 2. Check Memory Cache
    if (audioCache.has(pinyin)) {
      audioBuffer = audioCache.get(pinyin)!;
    } 
    // 3. Check Pending Requests (Deduplication)
    else if (pendingRequests.has(pinyin)) {
      audioBuffer = await pendingRequests.get(pinyin)!;
    } 
    // 4. Fetch from Server API
    else {
      const fetchPromise = (async () => {
        console.log(`Fetching audio from server for: ${pinyin}`);
        
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

        const audioBytes = decode(data.audioData);
        
        // Gemini 2.5 Flash TTS uses 24kHz sample rate
        return await decodeAudioData(audioBytes, ctx, 24000, 1);
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
// Audio Context Management
let outputAudioContext: AudioContext | null = null;

// Client-side Memory Cache (avoids re-fetching within the same session)
const audioCache = new Map<string, AudioBuffer>();
const pendingRequests = new Map<string, Promise<AudioBuffer>>();

const getAudioContext = () => {
  if (!outputAudioContext) {
    outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 24000,
    });
  }
  if (outputAudioContext.state === 'suspended') {
    outputAudioContext.resume();
  }
  return outputAudioContext;
};

// Helper: Decode Base64 string to Uint8Array
function decode(base64: string) {
  const binaryString = atob(base64);
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
  // Need to copy buffer to prevent detachment issues
  const bufferCopy = data.slice(0);
  const dataInt16 = new Int16Array(bufferCopy.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
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
    const ctx = getAudioContext();
    let audioBuffer: AudioBuffer;

    // 1. Check Memory Cache
    if (audioCache.has(pinyin)) {
      audioBuffer = audioCache.get(pinyin)!;
    } 
    // 2. Check Pending Requests (Deduplication)
    else if (pendingRequests.has(pinyin)) {
      audioBuffer = await pendingRequests.get(pinyin)!;
    } 
    // 3. Fetch from Server API
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

    playBuffer(audioBuffer, ctx);
    return audioBuffer.duration;

  } catch (error) {
    console.error("Error playing Pinyin audio:", error);
    throw error;
  }
};
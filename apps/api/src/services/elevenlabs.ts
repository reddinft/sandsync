/**
 * ElevenLabs TTS Service
 *
 * Generates narration audio using ElevenLabs API.
 * Reference: ~/projects/sandmantales-hackathon/elevenlabs_api.py
 *
 * Voice IDs for SandSync:
 *   Anansi (storyteller):  SOYHLrjzK2X1ezoPC6cr (eleven_multilingual_v2)
 *   Papa Bois:             6HeS5o1MgiMBuqtUDJaA (eleven_turbo_v2_5)
 *   Devi (general):        N2lVS1w4EtoT3dr4eOWO (eleven_multilingual_v2)
 */

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";
const DEFAULT_VOICE_ID = "SOYHLrjzK2X1ezoPC6cr"; // Anansi — the storyteller narrates
const ELEVENLABS_TIMEOUT_MS = 60000; // 60 second timeout — full chapters can take 30-40s

export interface NarrationResult {
  audioBuffer: Buffer;
  durationSeconds: number;
  voiceId: string;
  modelId: string;
}

/**
 * Estimate audio duration from text length.
 * Average narration speed ~150 wpm; 5 chars ≈ 1 word.
 */
function estimateDuration(text: string): number {
  const words = text.split(/\s+/).length;
  const minutes = words / 150;
  return Math.round(minutes * 60);
}

/**
 * Generate narrated audio for a chapter using ElevenLabs TTS.
 * Returns the audio buffer and estimated duration.
 * Times out after 25 seconds to prevent hanging requests.
 */
export async function generateNarration(
  text: string,
  voiceId: string = DEFAULT_VOICE_ID,
  modelId: string = "eleven_multilingual_v2"
): Promise<NarrationResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY environment variable not set");
  }

  const url = `${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ELEVENLABS_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `ElevenLabs API error ${response.status}: ${errorText}`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    const durationSeconds = estimateDuration(text);

    return { audioBuffer, durationSeconds, voiceId, modelId };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Estimate cost in USD for ElevenLabs narration.
 * eleven_multilingual_v2 ≈ $0.30/1000 chars (Creator plan).
 * eleven_turbo_v2_5 ≈ $0.18/1000 chars.
 */
export function estimateCost(
  text: string,
  modelId: string = "eleven_multilingual_v2"
): number {
  const chars = text.length;
  const ratePerChar =
    modelId === "eleven_turbo_v2_5" ? 0.00018 : 0.0003;
  return parseFloat((chars * ratePerChar).toFixed(4));
}

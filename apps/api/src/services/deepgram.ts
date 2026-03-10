/**
 * Deepgram Voice Service
 *
 * Transcribes audio buffers using Deepgram's Nova-3 model.
 * Returns null on failure or missing key — never crashes.
 *
 * Used by POST /stories/voice endpoint.
 */

const DEEPGRAM_API_URL = "https://api.deepgram.com/v1/listen";
const DEEPGRAM_MODEL = "nova-3";
const DEEPGRAM_TIMEOUT_MS = 30_000;

export interface TranscriptResult {
  transcript: string;
  confidence: number;
  audio_duration_ms: number;
  request_id: string | null;
}

/**
 * Transcribe an audio buffer using Deepgram Nova-3.
 *
 * @param audioBuffer - Raw audio bytes (webm, wav, mp3, ogg all supported)
 * @param mimeType - MIME type of audio (default: audio/webm)
 * @returns TranscriptResult or null on failure / missing key
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType = "audio/webm"
): Promise<TranscriptResult | null> {
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    console.warn("[Deepgram] DEEPGRAM_API_KEY not set — skipping transcription");
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEEPGRAM_TIMEOUT_MS);

  try {
    console.log(`[Deepgram] 🎙 Transcribing ${audioBuffer.length} bytes of ${mimeType}...`);

    const url = new URL(DEEPGRAM_API_URL);
    url.searchParams.set("model", DEEPGRAM_MODEL);
    url.searchParams.set("smart_format", "true");
    url.searchParams.set("punctuate", "true");
    url.searchParams.set("language", "en");

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": mimeType,
      },
      body: audioBuffer as unknown as BodyInit,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[Deepgram] API error (${response.status}): ${errorText}`);
      return null;
    }

    const data = (await response.json()) as {
      metadata?: { request_id?: string; duration?: number };
      results?: {
        channels?: Array<{
          alternatives?: Array<{
            transcript?: string;
            confidence?: number;
            words?: Array<unknown>;
          }>;
        }>;
      };
    };

    const alternative = data.results?.channels?.[0]?.alternatives?.[0];
    if (!alternative || !alternative.transcript) {
      console.warn("[Deepgram] No transcript in response");
      return null;
    }

    const durationSeconds = data.metadata?.duration ?? 0;
    const result: TranscriptResult = {
      transcript: alternative.transcript,
      confidence: alternative.confidence ?? 0,
      audio_duration_ms: Math.round(durationSeconds * 1000),
      request_id: data.metadata?.request_id ?? null,
    };

    console.log(
      `[Deepgram] ✅ Transcribed: "${result.transcript.slice(0, 80)}..." (confidence: ${result.confidence.toFixed(2)})`
    );
    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    if ((err as Error).name === "AbortError") {
      console.warn(`[Deepgram] Timeout after ${DEEPGRAM_TIMEOUT_MS}ms`);
    } else {
      console.warn(`[Deepgram] Error: ${(err as Error).message}`);
    }
    return null;
  }
}

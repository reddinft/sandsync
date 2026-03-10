/**
 * Fallback Retry Worker
 *
 * Background job that runs every 5 minutes to upgrade fallback sources:
 *   - Kokoro audio → ElevenLabs TTS
 *   - Flux images → Gemini Imagen
 *
 * Uses Supabase pgmq for job queue management (optional — can be added later).
 * Currently uses simple time-based polling on story_chapters table.
 */

import { createClient } from "@supabase/supabase-js";
import { generateNarration, estimateCost } from "./elevenlabs";
import { generateImageFromPrompt, saveImageBase64 } from "./imagen";
import { generateFluxImage } from "./flux";

const supabase = createClient(
  process.env.SUPABASE_URL || "http://127.0.0.1:54321",
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Retry Kokoro audio → upgrade to ElevenLabs
 */
export async function retryAudioUpgrades() {
  const now = new Date().toISOString();

  // Find chapters with Kokoro audio that are ready for retry
  const { data: audioJobs, error: fetchError } = await supabase
    .from("story_chapters")
    .select("id, story_id, chapter_number, content")
    .eq("audio_source", "kokoro")
    .lt("audio_retry_after", now)
    .limit(3); // Process 3 at a time to avoid hammering ElevenLabs

  if (fetchError) {
    console.warn("[RetryWorker] Failed to fetch audio jobs:", fetchError.message);
    return;
  }

  if (!audioJobs || audioJobs.length === 0) {
    return; // No jobs to retry
  }

  console.log(`[RetryWorker] 📡 Found ${audioJobs.length} audio chapters to upgrade...`);

  for (const job of audioJobs) {
    try {
      console.log(
        `[RetryWorker] ⬆️  Upgrading audio for story ${job.story_id} ch${job.chapter_number}`
      );

      const voiceId = "SOYHLrjzK2X1ezoPC6cr"; // Anansi's voice
      const narration = await generateNarration(job.content, voiceId);
      const cost = estimateCost(job.content, narration.modelId);

      if (narration && narration.audioBuffer) {
        // Upload to Supabase Storage
        const audioDir = "/audio";
        const filePath = `${job.story_id}/chapter_${job.chapter_number}.mp3`;

        const res = await fetch(
          `${process.env.SUPABASE_URL}/storage/v1/object/story-audio/${filePath}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              "Content-Type": "audio/mpeg",
              "x-upsert": "true",
            },
            body: narration.audioBuffer as unknown as BodyInit,
          }
        );

        if (!res.ok) {
          throw new Error(`Upload failed: ${res.status}`);
        }

        const audioUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/story-audio/${filePath}`;

        // Update chapter: switch back to ElevenLabs
        await supabase
          .from("story_chapters")
          .update({
            audio_source: "elevenlabs",
            audio_retry_after: null,
          })
          .eq("id", job.id);

        console.log(
          `[RetryWorker] ✅ Audio upgraded for story ${job.story_id} ch${job.chapter_number} (cost: $${cost})`
        );
      }
    } catch (err: any) {
      // Still failing — push retry window forward (next retry in 1 hour)
      const nextRetry = new Date(Date.now() + 3_600_000).toISOString();
      await supabase
        .from("story_chapters")
        .update({ audio_retry_after: nextRetry })
        .eq("id", job.id);

      console.warn(
        `[RetryWorker] ⚠️  Audio upgrade failed: ${err.message} — next attempt: ${nextRetry}`
      );
    }
  }
}

/**
 * Retry Flux images → upgrade to Gemini Imagen
 */
export async function retryImageUpgrades() {
  const now = new Date().toISOString();

  // Find chapters with Flux images that are ready for retry
  const { data: imageJobs, error: fetchError } = await supabase
    .from("story_chapters")
    .select("id, story_id, chapter_number, content")
    .eq("image_source", "flux")
    .lt("image_retry_after", now)
    .limit(3); // Process 3 at a time

  if (fetchError) {
    console.warn("[RetryWorker] Failed to fetch image jobs:", fetchError.message);
    return;
  }

  if (!imageJobs || imageJobs.length === 0) {
    return; // No jobs to retry
  }

  console.log(`[RetryWorker] 📡 Found ${imageJobs.length} image chapters to upgrade...`);

  for (const job of imageJobs) {
    try {
      console.log(
        `[RetryWorker] ⬆️  Upgrading image for story ${job.story_id} ch${job.chapter_number}`
      );

      // Generate image using Gemini Imagen
      const base64Image = await generateImageFromPrompt(
        job.content.slice(0, 500) // Use chapter content as prompt fallback
      );

      if (base64Image) {
        const imageUrl = await saveImageBase64(
          base64Image,
          job.story_id,
          job.chapter_number
        );

        // Update chapter: switch back to Gemini
        await supabase
          .from("story_chapters")
          .update({
            image_source: "gemini",
            image_retry_after: null,
          })
          .eq("id", job.id);

        console.log(
          `[RetryWorker] ✅ Image upgraded for story ${job.story_id} ch${job.chapter_number}`
        );
      }
    } catch (err: any) {
      // Still failing — push retry window forward (next retry in 10 minutes)
      const nextRetry = new Date(Date.now() + 600_000).toISOString();
      await supabase
        .from("story_chapters")
        .update({ image_retry_after: nextRetry })
        .eq("id", job.id);

      console.warn(
        `[RetryWorker] ⚠️  Image upgrade failed: ${err.message} — next attempt: ${nextRetry}`
      );
    }
  }
}

/**
 * Main retry worker — run both audio and image upgrades
 */
export async function retryFallbackJobs() {
  console.log("[RetryWorker] 🔄 Running fallback upgrade checks...");
  await retryAudioUpgrades();
  await retryImageUpgrades();
}

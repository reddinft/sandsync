/**
 * Video Generation Service — fal.ai Wan 2.1
 *
 * Generates short animated video clips (5s) per story chapter.
 * Uses fal-ai/wan/v2.1/t2v-480p — cost-conscious (~$0.01/5s clip).
 *
 * Background, non-blocking step in story-pipeline.
 * Updates story_chapters.video_url + video_status when done.
 * Gracefully degrades: if FAL_KEY not set, marks video_status = "failed".
 */

import { fal } from "@fal-ai/client";
import { createClient } from "@supabase/supabase-js";

const FAL_VIDEO_MODEL = "fal-ai/wan/v2.1/t2v-480p";
const FAL_TIMEOUT_MS = 120_000; // Video gen takes longer than image

const SUPABASE_URL = process.env.SUPABASE_URL || "https://houtondlrbwaosdwqyiu.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export interface VideoGenResult {
  videoUrl: string | null;
  source: "fal" | "none";
  latency_ms: number;
  cost_usd: number;
  error?: string;
}

/**
 * Upload video bytes to Supabase Storage (story-videos bucket).
 * Returns public CDN URL or null.
 */
async function uploadVideoToSupabase(
  videoBytes: Uint8Array,
  storyId: string,
  chapterNumber: number
): Promise<string | null> {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("[VideoGen] SUPABASE_SERVICE_ROLE_KEY not set — cannot upload video");
    return null;
  }

  const filePath = `${storyId}/chapter_${chapterNumber}.mp4`;

  try {
    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/story-videos/${filePath}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "video/mp4",
          "x-upsert": "true",
        },
        body: videoBytes as unknown as BodyInit,
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.warn(`[VideoGen] Supabase upload failed (${res.status}): ${text}`);
      return null;
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/story-videos/${filePath}`;
    console.log(`[VideoGen] ✅ Video uploaded: ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    console.warn(`[VideoGen] Upload error: ${(err as Error).message}`);
    return null;
  }
}

/**
 * Generate a short video clip for a story chapter using fal.ai Wan 2.1.
 *
 * @param prompt - Text prompt describing the scene to animate
 * @param storyId - Story UUID (for storage path)
 * @param chapterNumber - Chapter number (for storage path)
 * @returns VideoGenResult with URL, source, timing, cost
 */
export async function generateChapterVideo(
  prompt: string,
  storyId: string,
  chapterNumber: number
): Promise<VideoGenResult> {
  const t0 = Date.now();

  if (!process.env.FAL_KEY) {
    console.warn("[VideoGen] FAL_KEY not set — skipping video generation");
    return {
      videoUrl: null,
      source: "none",
      latency_ms: Date.now() - t0,
      cost_usd: 0,
      error: "FAL_KEY not configured",
    };
  }

  fal.config({ credentials: process.env.FAL_KEY });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FAL_TIMEOUT_MS);

  try {
    console.log(`[VideoGen] 🎬 Generating video for chapter ${chapterNumber} (${FAL_VIDEO_MODEL})...`);

    // Enhance prompt for Caribbean folklore aesthetic
    const enhancedPrompt = `${prompt.slice(0, 400)}. Cinematic 5-second clip, Caribbean folklore aesthetic, warm tropical colors, mystical atmosphere.`;

    const result = await fal.subscribe(FAL_VIDEO_MODEL, {
      input: {
        prompt: enhancedPrompt,
        num_frames: 81,         // ~5s at ~16fps
        resolution: "480p",
        aspect_ratio: "16:9",
      },
    }) as { video?: { url?: string } };

    clearTimeout(timeoutId);

    const videoUrl = result?.video?.url;
    if (!videoUrl) {
      console.warn("[VideoGen] fal.ai returned no video URL");
      return {
        videoUrl: null,
        source: "none",
        latency_ms: Date.now() - t0,
        cost_usd: 0,
        error: "No video URL in fal.ai response",
      };
    }

    // Download from fal.ai CDN and re-upload to Supabase for persistence + offline
    const vidRes = await fetch(videoUrl);
    if (!vidRes.ok) {
      console.warn(`[VideoGen] fal.ai CDN fetch failed: ${vidRes.status}`);
      // Return the temporary fal.ai URL as fallback
      return {
        videoUrl,
        source: "fal",
        latency_ms: Date.now() - t0,
        cost_usd: 0.01,
      };
    }

    const vidBytes = new Uint8Array(await vidRes.arrayBuffer());
    const supabaseUrl = await uploadVideoToSupabase(vidBytes, storyId, chapterNumber);

    const cost = 0.01; // ~$0.01 for 5s Wan 2.1 clip
    console.log(`[VideoGen] ✅ Chapter ${chapterNumber} video ready (${Date.now() - t0}ms, ~$${cost})`);

    return {
      videoUrl: supabaseUrl || videoUrl,
      source: "fal",
      latency_ms: Date.now() - t0,
      cost_usd: cost,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const errMsg = (err as Error).name === "AbortError"
      ? `Timeout after ${FAL_TIMEOUT_MS}ms`
      : (err as Error).message;

    console.warn(`[VideoGen] ❌ Failed: ${errMsg}`);
    return {
      videoUrl: null,
      source: "none",
      latency_ms: Date.now() - t0,
      cost_usd: 0,
      error: errMsg,
    };
  }
}

/**
 * Background video generation — runs async after chapter is written to DB.
 * Updates story_chapters with video_url and video_status.
 * Never throws — safe to fire-and-forget.
 */
export async function generateChapterVideoBackground(
  prompt: string,
  storyId: string,
  chapterNumber: number
): Promise<void> {
  // Lazy init supabase client (avoids import-time env requirement)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY!);

  try {
    // Mark as generating
    await supabase
      .from("story_chapters")
      .update({ video_status: "generating" })
      .eq("story_id", storyId)
      .eq("chapter_number", chapterNumber);

    const result = await generateChapterVideo(prompt, storyId, chapterNumber);

    if (result.videoUrl) {
      await supabase
        .from("story_chapters")
        .update({
          video_url: result.videoUrl,
          video_source: result.source,
          video_status: "ready",
        })
        .eq("story_id", storyId)
        .eq("chapter_number", chapterNumber);
    } else {
      await supabase
        .from("story_chapters")
        .update({ video_status: "failed" })
        .eq("story_id", storyId)
        .eq("chapter_number", chapterNumber);
    }
  } catch (err) {
    console.warn(`[VideoGen] Background task failed: ${(err as Error).message}`);
    try {
      const supabaseInner = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY!);
      await supabaseInner
        .from("story_chapters")
        .update({ video_status: "failed" })
        .eq("story_id", storyId)
        .eq("chapter_number", chapterNumber);
    } catch {}
  }
}

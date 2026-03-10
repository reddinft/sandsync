/**
 * Image Generation Service — Multi-provider cascade
 *
 * Priority:
 *   1. fal.ai FLUX Turbo (cloud, fast, cheap — $0.008/MP)
 *   2. Gemini Imagen (existing primary → now secondary)
 *   3. Flux.1-schnell local (CPU fallback)
 *
 * Each provider degrades gracefully: if FAL_KEY not set → skip to Gemini.
 * If Gemini fails → fall to local Flux. Never crash.
 */

import { fal } from "@fal-ai/client";
import {
  generateIllustrationPrompt,
  generateImageFromPrompt as geminiGenerateImage,
  saveImageBase64 as geminiSaveImage,
  estimateImageCost as geminiEstimateCost,
} from "./imagen";
import { generateFluxImage, uploadFluxImage } from "./flux";

const FAL_MODEL = "fal-ai/flux/schnell";
const FAL_TIMEOUT_MS = 45_000;

const SUPABASE_URL = process.env.SUPABASE_URL || "https://houtondlrbwaosdwqyiu.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export type ImageSource = "fal" | "gemini" | "flux" | "none";

export interface ImageGenResult {
  imageUrl: string | null;
  source: ImageSource;
  latency_ms: number;
  cost_usd: number;
  error?: string;
}

// Re-export for callers who need the prompt generator
export { generateIllustrationPrompt };

/**
 * Upload raw image bytes to Supabase Storage.
 * Returns public CDN URL or null.
 */
async function uploadImageBytes(
  imageBytes: Uint8Array | Buffer,
  storyId: string,
  chapterNumber: number,
  suffix = ""
): Promise<string | null> {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("[ImageGen] SUPABASE_SERVICE_ROLE_KEY not set — cannot upload");
    return null;
  }

  const filePath = `${storyId}/chapter_${chapterNumber}${suffix}.png`;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/story-images/${filePath}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "image/png",
          "x-upsert": "true",
        },
        body: imageBytes as unknown as BodyInit,
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.warn(`[ImageGen] Supabase upload failed (${res.status}): ${text}`);
      return null;
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/story-images/${filePath}`;
    console.log(`[ImageGen] ✅ Uploaded: ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    console.warn(`[ImageGen] Upload error: ${(err as Error).message}`);
    return null;
  }
}

/**
 * Try fal.ai FLUX Schnell.
 * Returns image URL or null on failure / missing key.
 */
async function tryFalImage(
  prompt: string,
  storyId: string,
  chapterNumber: number
): Promise<{ url: string | null; cost_usd: number }> {
  if (!process.env.FAL_KEY) {
    console.log("[ImageGen] FAL_KEY not set — skipping fal.ai");
    return { url: null, cost_usd: 0 };
  }

  fal.config({ credentials: process.env.FAL_KEY });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FAL_TIMEOUT_MS);

  try {
    console.log(`[ImageGen] 🎨 Trying fal.ai (${FAL_MODEL})...`);

    const result = await fal.subscribe(FAL_MODEL, {
      input: {
        prompt,
        image_size: "landscape_4_3",
        num_inference_steps: 4,
        num_images: 1,
      },
    }) as { images?: Array<{ url?: string; content_type?: string }> };

    clearTimeout(timeoutId);

    const imageUrl = result?.images?.[0]?.url;
    if (!imageUrl) {
      console.warn("[ImageGen] fal.ai returned no image URL");
      return { url: null, cost_usd: 0 };
    }

    // Download from fal.ai CDN and re-upload to Supabase for persistence
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      console.warn(`[ImageGen] fal.ai CDN fetch failed: ${imgRes.status}`);
      return { url: null, cost_usd: 0 };
    }

    const imgBytes = new Uint8Array(await imgRes.arrayBuffer());
    const supabaseUrl = await uploadImageBytes(imgBytes, storyId, chapterNumber, "_fal");

    // Estimate cost: ~$0.008/MP at 768x512 ≈ 0.39MP → ~$0.003
    const estimatedCost = 0.003;
    console.log(`[ImageGen] ✅ fal.ai image ready (cost ~$${estimatedCost})`);
    return { url: supabaseUrl || imageUrl, cost_usd: estimatedCost };
  } catch (err) {
    clearTimeout(timeoutId);
    if ((err as Error).name === "AbortError") {
      console.warn(`[ImageGen] fal.ai timeout after ${FAL_TIMEOUT_MS}ms`);
    } else {
      console.warn(`[ImageGen] fal.ai error: ${(err as Error).message}`);
    }
    return { url: null, cost_usd: 0 };
  }
}

/**
 * Main entry point — generate an illustration with provider cascade.
 * Returns ImageGenResult with source, URL, cost.
 */
export async function generateChapterImage(
  chapterContent: string,
  chapterNumber: number,
  storyTitle: string,
  folkloreElements: string[],
  storyId: string
): Promise<ImageGenResult> {
  const t0 = Date.now();

  // Generate illustration prompt (shared across all providers)
  const prompt = await generateIllustrationPrompt(
    chapterContent,
    chapterNumber,
    storyTitle,
    folkloreElements
  );

  // ── Provider 1: fal.ai ────────────────────────────────────────────────────
  const falResult = await tryFalImage(prompt, storyId, chapterNumber);
  if (falResult.url) {
    return {
      imageUrl: falResult.url,
      source: "fal",
      latency_ms: Date.now() - t0,
      cost_usd: falResult.cost_usd,
    };
  }

  // ── Provider 2: Gemini Imagen ─────────────────────────────────────────────
  try {
    console.log("[ImageGen] Trying Gemini Imagen...");
    const base64Image = await geminiGenerateImage(prompt);
    if (base64Image) {
      const imageUrl = await geminiSaveImage(base64Image, storyId, chapterNumber);
      return {
        imageUrl,
        source: "gemini",
        latency_ms: Date.now() - t0,
        cost_usd: geminiEstimateCost(),
      };
    }
  } catch (err) {
    console.warn(`[ImageGen] Gemini failed: ${(err as Error).message}`);
  }

  // ── Provider 3: Local Flux.1-schnell ──────────────────────────────────────
  try {
    console.log("[ImageGen] Trying local Flux.1-schnell...");
    const fluxBuffer = await generateFluxImage(prompt);
    if (fluxBuffer) {
      const imageUrl = await uploadFluxImage(fluxBuffer, storyId, chapterNumber);
      return {
        imageUrl,
        source: "flux",
        latency_ms: Date.now() - t0,
        cost_usd: 0,
      };
    }
  } catch (err) {
    console.warn(`[ImageGen] Flux failed: ${(err as Error).message}`);
  }

  // All providers failed
  console.warn("[ImageGen] ❌ All image providers failed");
  return {
    imageUrl: null,
    source: "none",
    latency_ms: Date.now() - t0,
    cost_usd: 0,
    error: "All image providers failed",
  };
}

/**
 * Estimate image generation cost (safe upper bound across providers).
 */
export function estimateImageCost(): number {
  if (process.env.FAL_KEY) return 0.003; // fal.ai FLUX Schnell
  return 0.04; // Gemini Imagen
}

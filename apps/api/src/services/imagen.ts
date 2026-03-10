/**
 * Gemini Imagen Integration
 * Generates illustrated prompts for story chapters using Google's Imagen model
 */

import * as fs from "fs";
import * as path from "path";
import { writeFile, mkdir } from "fs/promises";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const IMAGEN_MODEL = "imagen-4.0-generate-002";
const IMAGEN_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGEN_MODEL}:predict`;
const SUPABASE_URL = process.env.SUPABASE_URL || "https://houtondlrbwaosdwqyiu.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const IMAGEN_TIMEOUT_MS = 30000; // 30 second timeout for Gemini image generation

// Simple illustration prompt — use a fixed template instead of LLM generation
// to keep image generation fast and deterministic
/**
 * Generate a detailed illustration prompt for a chapter
 * Creates Caribbean-flavored visual descriptions from chapter content
 */
export async function generateIllustrationPrompt(
  chapterContent: string,
  chapterNumber: number,
  storyTitle: string,
  folkloreElements: string[]
): Promise<string> {
  // Extract key visual moments from chapter content
  const paragraphs = chapterContent.split("\n").filter((p) => p.trim().length > 0);
  const midpoint = Math.floor(paragraphs.length / 2);
  const keyMoment =
    paragraphs[midpoint] || paragraphs[0] || chapterContent.slice(0, 200);

  const elements = folkloreElements.slice(0, 2).join(" and ");

  // Craft a detailed prompt based on content
  const prompt = `Lush Caribbean watercolor illustration of "${keyMoment.slice(0, 80).trim()}..." featuring ${elements || "folklore spirits"}. Studio Ghibli-inspired, warm golden dusk light, vibrant tropical colors, folklore magic. No text or words. Children's book style.`;

  return prompt;
}

/**
 * Generate an image using Gemini Imagen
 * Returns base64-encoded PNG or null if timeout
 */
export async function generateImageFromPrompt(
  prompt: string
): Promise<string | null> {
  if (!GEMINI_API_KEY) {
    console.warn("[Imagen] GEMINI_API_KEY not set — skipping image generation");
    return null;
  }

  console.log(`[Imagen] Generating image from prompt (${prompt.length} chars)...`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), IMAGEN_TIMEOUT_MS);

  try {
    const response = await fetch(IMAGEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GEMINI_API_KEY}`,
      },
      body: JSON.stringify({
        instances: [
          {
            prompt,
          },
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: "4:3",
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(
        `[Imagen] API error (${response.status}): ${response.statusText}`
      );
      return null;
    }

    const data = (await response.json()) as {
      predictions?: Array<{ bytesBase64Encoded?: string }>;
    };

    const base64Image = data.predictions?.[0]?.bytesBase64Encoded;
    if (!base64Image) {
      console.warn("[Imagen] No image data in response");
      return null;
    }

    console.log(`[Imagen] ✅ Image generated (${base64Image.length} bytes)`);
    return base64Image;
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      console.warn(
        `[Imagen] Timeout after ${IMAGEN_TIMEOUT_MS}ms — no image for this chapter`
      );
    } else {
      console.warn(
        `[Imagen] Error: ${(err as Error).message} — no image for this chapter`
      );
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Upload a base64 image to Supabase Storage
 * Returns public CDN URL or null if upload fails
 */
export async function saveImageBase64(
  base64Image: string,
  storyId: string,
  chapterNumber: number
): Promise<string | null> {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(
      "[Imagen] SUPABASE_SERVICE_ROLE_KEY not set — storing locally as fallback"
    );
    // Fallback: save locally if Supabase not configured
    try {
      const imageDir = path.resolve(
        process.env.IMAGE_DIR || path.join(process.cwd(), "images"),
        storyId
      );
      await mkdir(imageDir, { recursive: true });
      const imagePath = path.join(imageDir, `chapter_${chapterNumber}.png`);
      const imageBuffer = Buffer.from(base64Image, "base64");
      await writeFile(imagePath, imageBuffer);
      return `data:image/png;base64,${base64Image}`;
    } catch (err) {
      console.warn(`[Imagen] Local save failed: ${(err as Error).message}`);
      return null;
    }
  }

  const buffer = Buffer.from(base64Image, "base64");
  const filePath = `${storyId}/chapter_${chapterNumber}.png`;

  try {
    const response = await fetch(
      `${SUPABASE_URL}/storage/v1/object/story-images/${filePath}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "image/png",
          "x-upsert": "true",
        },
        body: buffer,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(
        `[Imagen] Supabase upload failed (${response.status}): ${errorText}`
      );
      return null;
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/story-images/${filePath}`;
    console.log(`[Imagen] ✅ Uploaded to Supabase: ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    console.warn(`[Imagen] Upload error: ${(err as Error).message}`);
    return null;
  }
}

/**
 * Estimate cost of image generation (rough: $0.04/image for Imagen)
 */
export function estimateImageCost(): number {
  return 0.04;
}

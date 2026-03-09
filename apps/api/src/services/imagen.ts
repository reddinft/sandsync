/**
 * Gemini Imagen Integration
 * Generates illustrated prompts for story chapters using Google's Imagen model
 */

import * as fs from "fs";
import { writeFile } from "fs/promises";
import * as path from "path";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const IMAGEN_MODEL = "imagen-4.0-generate-002";
const IMAGEN_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGEN_MODEL}:predict`;

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
 * Returns base64-encoded PNG
 */
export async function generateImageFromPrompt(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not set");
  }

  console.log(`[Imagen] Generating image from prompt (${prompt.length} chars)...`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  let response: Response;
  try {
    response = await fetch(IMAGEN_ENDPOINT, {
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
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      throw new Error("Image generation timed out");
    }
    throw err;
  }
  clearTimeout(timeout);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Imagen] API error: ${response.statusText}`, errorText);
    throw new Error(
      `Gemini Imagen API failed (${response.status}): ${response.statusText}`
    );
  }

  const data = (await response.json()) as {
    predictions?: Array<{ bytesBase64Encoded?: string }>;
  };

  const base64Image = data.predictions?.[0]?.bytesBase64Encoded;
  if (!base64Image) {
    throw new Error("No image data in Imagen response");
  }

  console.log(`[Imagen] ✅ Image generated (${base64Image.length} bytes)`);
  return base64Image;
}

/**
 * Save a base64 image to Supabase Storage or local disk
 * For hackathon, we'll save locally and return a data: URL
 */
export async function saveImageBase64(
  base64Image: string,
  storyId: string,
  chapterNumber: number
): Promise<string> {
  // For offline-first, save locally and return data URL
  const imageDir = path.resolve(
    process.env.IMAGE_DIR || path.join(process.cwd(), "images"),
    storyId
  );
  fs.mkdirSync(imageDir, { recursive: true });

  const imagePath = path.join(imageDir, `chapter_${chapterNumber}.png`);
  const imageBuffer = Buffer.from(base64Image, "base64");
  await writeFile(imagePath, imageBuffer);

  // Return relative URL served by the static /images/* handler
  const relativeUrl = `/images/${storyId}/chapter_${chapterNumber}.png`;
  console.log(`[Imagen] Saved: ${imagePath}`);

  return relativeUrl;
}

/**
 * Estimate cost of image generation (rough: $0.04/image for Imagen)
 */
export function estimateImageCost(): number {
  return 0.04;
}

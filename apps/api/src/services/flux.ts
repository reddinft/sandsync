/**
 * Flux Local Image Generation Fallback
 *
 * Generates images using Flux.1-schnell locally when Gemini Imagen fails or quota is exceeded.
 * Model: FLUX.1-schnell (4-step optimized for speed)
 * Style: Caribbean watercolor illustration, folklore storybook art
 */

import { execFile } from "child_process";
import { promisify } from "util";
import { readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";

const execFileAsync = promisify(execFile);

const PYTHON = process.env.PYTHON || "/Users/loki/.pyenv/versions/3.14.3/bin/python3";

export async function generateFluxImage(prompt: string): Promise<Buffer | null> {
  const outPath = join(tmpdir(), `flux_${randomUUID()}.png`);

  const script = `
import sys
from diffusers import FluxPipeline
import torch

try:
    pipe = FluxPipeline.from_pretrained(
        "black-forest-labs/FLUX.1-schnell",
        torch_dtype=torch.bfloat16
    )
    pipe.enable_model_cpu_offload()
    
    # Append Caribbean watercolor style to prompt
    full_prompt = """${prompt.replace(/`/g, '`')}
    
Style: Caribbean watercolor illustration, warm tropical colours, folklore storybook art, 
soft brushwork, vibrant but dreamy, reminiscent of Caribbean folk art and oral tradition."""
    
    image = pipe(
        full_prompt,
        guidance_scale=0.0,
        num_inference_steps=4,
        max_sequence_length=256,
    ).images[0]
    
    image.save("${outPath}")
    print("done")
except Exception as e:
    print(f"error: {e}", file=sys.stderr)
    sys.exit(1)
`;

  try {
    await execFileAsync(PYTHON, ["-c", script], {
      timeout: 120_000, // Flux on CPU takes 30-90s
      env: {
        ...process.env,
        HF_TOKEN: process.env.HF_TOKEN || "",
        TRANSFORMERS_CACHE: "/Users/loki/.cache/huggingface/hub",
      },
    });

    const buffer = await readFile(outPath);
    return buffer;
  } catch (err) {
    console.warn("[Flux] Local image generation failed:", err);
    return null;
  } finally {
    await unlink(outPath).catch(() => {});
  }
}

/**
 * Upload Flux image to Supabase Storage (PNG)
 * Path: ${storyId}/chapter_${chapterIndex}_flux.png
 */
export async function uploadFluxImage(
  imageBuffer: Buffer,
  storyId: string,
  chapterIndex: number
): Promise<string> {
  const filePath = `${storyId}/chapter_${chapterIndex}_flux.png`;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set");
  }

  const res = await fetch(
    `${supabaseUrl}/storage/v1/object/story-images/${filePath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "image/png",
        "x-upsert": "true",
      },
      body: imageBuffer as unknown as BodyInit,
    }
  );

  if (!res.ok) {
    throw new Error(`Image upload failed: ${res.status} ${res.statusText}`);
  }

  return `${supabaseUrl}/storage/v1/object/public/story-images/${filePath}`;
}

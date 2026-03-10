/**
 * Kokoro TTS Fallback Service
 *
 * Generates audio using Kokoro (local) when ElevenLabs quota is exceeded or times out.
 * Voice: am_echo (warm, clear storytelling voice)
 * Speed: 1.1x (energetic storytelling pace)
 */

import { execFile } from "child_process";
import { promisify } from "util";
import { readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";

const execFileAsync = promisify(execFile);

const KOKORO_PYTHON = process.env.KOKORO_PYTHON || "/Users/loki/.kokoro-venv/bin/python3";
const KOKORO_SCRIPT = process.env.KOKORO_SCRIPT || "/Users/loki/.openclaw/workspace/scripts/speak.py";
const STORY_VOICE = "am_echo"; // warm, clear storytelling voice
const STORY_SPEED = 1.1; // energetic pace

export async function generateKokoroAudio(text: string): Promise<Buffer | null> {
  const outPath = join(tmpdir(), `kokoro_${randomUUID()}.wav`);

  try {
    // Kokoro has token limits; truncate to ~2000 chars
    const truncatedText = text.slice(0, 2000);

    await execFileAsync(KOKORO_PYTHON, [
      KOKORO_SCRIPT,
      "--voice",
      STORY_VOICE,
      "--speed",
      String(STORY_SPEED),
      "--output",
      outPath,
      truncatedText,
    ]);

    const buffer = await readFile(outPath);
    return buffer;
  } catch (err) {
    console.warn("[Kokoro] TTS generation failed:", err);
    return null;
  } finally {
    await unlink(outPath).catch(() => {});
  }
}

/**
 * Upload Kokoro audio to Supabase Storage
 * Path: ${storyId}/chapter_${chapterIndex}_kokoro.wav
 */
export async function uploadKokoroAudio(
  audioBuffer: Buffer,
  storyId: string,
  chapterIndex: number
): Promise<string> {
  const filePath = `${storyId}/chapter_${chapterIndex}_kokoro.wav`;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set");
  }

  const res = await fetch(
    `${supabaseUrl}/storage/v1/object/story-audio/${filePath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "audio/wav",
        "x-upsert": "true",
      },
      body: audioBuffer as unknown as BodyInit,
    }
  );

  if (!res.ok) {
    throw new Error(`Audio upload failed: ${res.status} ${res.statusText}`);
  }

  return `${supabaseUrl}/storage/v1/object/public/story-audio/${filePath}`;
}

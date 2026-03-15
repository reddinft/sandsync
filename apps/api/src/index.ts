/**
 * SandSync API Server
 *
 * Bun HTTP server exposing the story generation pipeline.
 * Stories are created async — client gets storyId immediately,
 * then PowerSync handles real-time sync of chapters as agents complete them.
 *
 * Endpoints:
 *   POST /stories                          — create story, kick off pipeline async
 *   POST /stories/voice                    — create story from audio (Deepgram STT)
 *   GET  /stories/:id/status               — poll story status
 *   GET  /stories/:id/chapters/:n/audio    — serve chapter audio file (CORS enabled)
 *   GET  /health                           — health check (Mastra, Supabase, Ollama)
 */

import { createClient } from "@supabase/supabase-js";
import { storyPipeline } from "./mastra/workflows/story-pipeline";
import { retryFallbackJobs } from "./services/retry-worker";
import { transcribeAudio } from "./services/deepgram";

// ── Config ─────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || "3001");
const SUPABASE_URL =
  process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const OLLAMA_URL =
  process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Response helpers ───────────────────────────────────────────────────────────

function json(data: unknown, status = 200, corsHeaders?: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 
      "Content-Type": "application/json",
      ...(corsHeaders || {}),
    },
  });
}

function notFound(corsHeaders?: Record<string, string>) {
  return json({ error: "Not found" }, 404, corsHeaders);
}

function badRequest(msg: string, corsHeaders?: Record<string, string>) {
  return json({ error: msg }, 400, corsHeaders);
}

// ── Handlers ───────────────────────────────────────────────────────────────────

async function handlePostStory(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
  const { userId, request: userRequest } = body;
  if (!userId) return badRequest("userId is required", corsHeaders);
  if (!userRequest) return badRequest("request is required", corsHeaders);

  if (error || !story) {
    console.error("[POST /stories] DB error:", error?.message);
    return json({ error: "Failed to create story" }, 500, corsHeaders);
  }

  const storyId = story.id;

  // Kick off pipeline async — do NOT await
  (async () => {
    try {
      const run = await storyPipeline.createRun();
      await run.start({
        inputData: {
          storyId,
          userRequest,
          dryRun: false,
        },
      });
    } catch (err: any) {
      console.error(`[Pipeline] ❌ Story ${storyId} failed:`, err.message);
      await supabase
        .from("stories")
        .update({ status: "failed" })
        .eq("id", storyId);
    }
  })();

  return json({ storyId }, 201, corsHeaders);
}

async function handleGetStoryStatus(storyId: string, corsHeaders: Record<string, string>): Promise<Response> {
  const { data: story, error } = await supabase
    .from("stories")
    .select("id, status, title")
    .eq("id", storyId)
    .single();

  if (error || !story) return notFound(corsHeaders);

  // Count completed chapters
  const { count } = await supabase
    .from("story_chapters")
    .select("id", { count: "exact", head: true })
    .eq("story_id", storyId);

  // Fetch the brief from agent_events to know total_chapters
  const { data: events } = await supabase
    .from("agent_events")
    .select("payload")
    .eq("story_id", storyId)
    .eq("agent", "papa_bois")
    .eq("event_type", "completed")
    .limit(1);

  const brief = events?.[0]?.payload?.brief as any;
  const totalChapters = brief?.chapter_count ?? null;

  return json({
    status: story.status,
    title: story.title,
    chapters_complete: count ?? 0,
    total_chapters: totalChapters,
  }, 200, corsHeaders);
}

async function handleHealth(corsHeaders: Record<string, string>): Promise<Response> {
  // Check Supabase
  let supabaseOk = false;
  try {
    const { error } = await supabase.from("stories").select("id").limit(1);
    supabaseOk = !error;
  } catch {}

  // Check Ollama
  let ollamaOk = false;
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(2000) });
    ollamaOk = r.ok;
  } catch {}

  return json({
    ok: true,
    mastra: true,
    supabase: supabaseOk,
    ollama: ollamaOk,
    timestamp: new Date().toISOString(),
  }, 200, corsHeaders);
}

async function handleGetAudio(storyId: string, chapterNum: number, corsHeaders: Record<string, string>): Promise<Response> {
  const audioDir = process.env.AUDIO_DIR ||
    require("path").join(process.cwd(), "audio");
  const audioPath = require("path").join(audioDir, storyId, `chapter_${chapterNum}.mp3`);

  try {
    const file = await Bun.file(audioPath).arrayBuffer();
    return new Response(file, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
        ...corsHeaders,
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "Audio not found" }),
      {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
}

async function handlePostStoryTranscribe(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
  if (!process.env.DEEPGRAM_API_KEY) {
    return json({ error: "voice_unavailable" }, 503, corsHeaders);
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return badRequest("Expected multipart/form-data", corsHeaders);
  }

  const audioFile = formData.get("audio");
  if (!audioFile || !(audioFile instanceof Blob)) {
    return badRequest("audio field (audio blob) is required", corsHeaders);
  }

  const mimeType = audioFile.type || "audio/webm";
  const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

  const transcriptResult = await transcribeAudio(audioBuffer, mimeType);
  if (!transcriptResult) {
    return json({ error: "transcription_failed" }, 502, corsHeaders);
  }

  return json({
    transcript: transcriptResult.transcript,
    confidence: transcriptResult.confidence,
    duration_ms: transcriptResult.audio_duration_ms,
  }, 200, corsHeaders);
}

async function handleGetStoryPreview(storyId: string, corsHeaders: Record<string, string>): Promise<Response> {
  const { data: story, error } = await supabase
    .from("stories")
    .select("id, title, genre, status")
    .eq("id", storyId)
    .single();

  if (error || !story) return notFound(corsHeaders);

  const { data: chapter } = await supabase
    .from("story_chapters")
    .select("content, image_url, audio_url")
    .eq("story_id", storyId)
    .order("chapter_number", { ascending: true })
    .limit(1)
    .single();

  return json({
    id: story.id,
    title: story.title ?? "Untitled Story",
    genre: story.genre ?? "folklore",
    first_chapter: chapter
      ? {
          content: (chapter.content ?? "").slice(0, 300),
          image_url: chapter.image_url ?? null,
          audio_url: chapter.audio_url ?? null,
        }
      : null,
  }, 200, corsHeaders);
}

async function handlePostStoryVoice(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
  // Check Deepgram is configured before parsing body
  if (!process.env.DEEPGRAM_API_KEY) {
    return json({ error: "voice_unavailable" }, 503, corsHeaders);
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return badRequest("Expected multipart/form-data", corsHeaders);
  }

  const userId = formData.get("userId")?.toString();
  if (!userId) return badRequest("userId is required", corsHeaders);

  const audioFile = formData.get("audio");
  if (!audioFile || !(audioFile instanceof Blob)) {
    return badRequest("audio field (audio blob) is required", corsHeaders);
  }

  const mimeType = audioFile.type || "audio/webm";
  const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

  // Transcribe audio
  const transcriptResult = await transcribeAudio(audioBuffer, mimeType);
  if (!transcriptResult) {
    return json({ error: "transcription_failed" }, 502, corsHeaders);
  }

  // Create story row
  const { data: story, error } = await supabase
    .from("stories")
    .insert({ user_id: userId, status: "queued" })
    .select()
    .single();

  if (error || !story) {
    console.error("[POST /stories/voice] DB error:", error?.message);
    return json({ error: "Failed to create story" }, 500, corsHeaders);
  }

  const storyId = story.id;

  // Record the voice request in voice_requests table
  await supabase.from("voice_requests").insert({
    story_id: storyId,
    transcript: transcriptResult.transcript,
    audio_duration_ms: transcriptResult.audio_duration_ms,
    deepgram_request_id: transcriptResult.request_id,
    confidence: transcriptResult.confidence,
  });

  // Kick off pipeline using transcript as the user request
  (async () => {
    try {
      const run = await storyPipeline.createRun();
      await run.start({
        inputData: {
          storyId,
          userRequest: transcriptResult.transcript,
          dryRun: false,
        },
      });
    } catch (err: any) {
      console.error(`[Pipeline/Voice] ❌ Story ${storyId} failed:`, err.message);
      await supabase
        .from("stories")
        .update({ status: "failed" })
        .eq("id", storyId);
    }
  })();

  return json({ storyId, transcript: transcriptResult.transcript }, 201, corsHeaders);
}

// ── Router ─────────────────────────────────────────────────────────────────────

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const { pathname, method } = Object.assign(url, { method: req.method });

    // CORS headers for all responses
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Range",
    };

    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    try {
      if (pathname === "/health" && method === "GET") {
        return await handleHealth(corsHeaders);
      }

      if (pathname === "/stories/voice" && method === "POST") {
        return await handlePostStoryVoice(req, corsHeaders);
      }

      if (pathname === "/stories/transcribe" && method === "POST") {
        return await handlePostStoryTranscribe(req, corsHeaders);
      }

      if (pathname === "/stories" && method === "POST") {
        return await handlePostStory(req, corsHeaders);
      }

      const statusMatch = pathname.match(/^\/stories\/([^/]+)\/status$/);
      if (statusMatch && method === "GET") {
        return await handleGetStoryStatus(statusMatch[1], corsHeaders);
      }

      const previewMatch = pathname.match(/^\/stories\/([^/]+)\/preview$/);
      if (previewMatch && method === "GET") {
        return await handleGetStoryPreview(previewMatch[1], corsHeaders);
      }

      // GET /stories/:id/chapters/:n/audio
      const audioMatch = pathname.match(/^\/stories\/([^/]+)\/chapters\/(\d+)\/audio$/);
      if (audioMatch && method === "GET") {
        return await handleGetAudio(audioMatch[1], parseInt(audioMatch[2]), corsHeaders);
      }

      // GET /images/* — serve generated chapter illustrations from disk
      const imagesMatch = pathname.match(/^\/images\/(.+\.png)$/);
      if (imagesMatch && method === "GET") {
        const imageDir = process.env.IMAGE_DIR || require("path").join(process.cwd(), "images");
        const imagePath = require("path").join(imageDir, imagesMatch[1]);
        try {
          const file = await Bun.file(imagePath).arrayBuffer();
          return new Response(file, {
            status: 200,
            headers: {
              "Content-Type": "image/png",
              "Cache-Control": "public, max-age=3600",
              ...corsHeaders,
            },
          });
        } catch {
          return notFound(corsHeaders);
        }
      }

      return notFound(corsHeaders);
    } catch (err: any) {
      console.error("[Server] Unhandled error:", err.message);
      return json({ error: "Internal server error" }, 500, corsHeaders);
    }
  },
});

console.log(`\n[SandSync API] 🚀 Server running on http://localhost:${PORT}`);
console.log(`[SandSync API] 📡 Supabase: ${SUPABASE_URL}`);
console.log(`[SandSync API] 🤖 Ollama: ${OLLAMA_URL}\n`);

// ── Start background retry worker ────────────────────────────────────────────

// Run once on startup
retryFallbackJobs().catch(err => {
  console.warn("[RetryWorker] Initial run failed:", err.message);
});

// Then run every 5 minutes (300,000ms)
setInterval(retryFallbackJobs, 5 * 60 * 1000);



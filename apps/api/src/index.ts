/**
 * SandSync API Server
 *
 * Bun HTTP server exposing the story generation pipeline.
 * Stories are created async — client gets storyId immediately,
 * then PowerSync handles real-time sync of chapters as agents complete them.
 *
 * Endpoints:
 *   POST /stories                          — create story, kick off pipeline async
 *   GET  /stories/:id/status               — poll story status
 *   GET  /stories/:id/chapters/:n/audio    — serve chapter audio file (CORS enabled)
 *   GET  /health                           — health check (Mastra, Supabase, Ollama)
 */

import { createClient } from "@supabase/supabase-js";
import { storyPipeline } from "./mastra/workflows/story-pipeline";

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
  let body: { userId?: string; request?: string };
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body", corsHeaders);
  }

  const { userId, request: userRequest } = body;
  if (!userId) return badRequest("userId is required", corsHeaders);
  if (!userRequest) return badRequest("request is required", corsHeaders);

  // Create story row (status: queued)
  const { data: story, error } = await supabase
    .from("stories")
    .insert({ user_id: userId, status: "queued" })
    .select()
    .single();

  if (error || !story) {
    console.error("[POST /stories] DB error:", error?.message);
    return json({ error: "Failed to create story" }, 500, corsHeaders);
  }

  const storyId = story.id;
  console.log(`[POST /stories] Created story ${storyId} for user ${userId}`);

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
    console.warn(`[Audio] Not found: ${audioPath}`);
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

      if (pathname === "/stories" && method === "POST") {
        return await handlePostStory(req, corsHeaders);
      }

      const statusMatch = pathname.match(/^\/stories\/([^/]+)\/status$/);
      if (statusMatch && method === "GET") {
        return await handleGetStoryStatus(statusMatch[1], corsHeaders);
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

console.log(`\n🌴 SandSync API running on http://localhost:${PORT}`);
console.log(`   POST /stories                        — create a story`);
console.log(`   GET  /stories/:id/status            — check status`);
console.log(`   GET  /stories/:id/chapters/:n/audio — serve chapter audio`);
console.log(`   GET  /health                        — health check\n`);

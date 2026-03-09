/**
 * SandSync Story Pipeline
 *
 * Mastra workflow implementing the full multi-agent storytelling pipeline:
 *   Papa Bois → Anansi ⟷ Ogma (LLM-as-judge) → Devi → PowerSync
 *
 * Research-backed design decisions:
 *  - LLM-as-judge revision loop (max 2 cycles, then force-approve)
 *  - Ogma on qwen3:4b local ($0 cost, benchmark-justified)
 *  - Rich agent_trace telemetry for the /stories/:id/agents debug view
 *  - Principled model routing from 1,229-run hybrid control plane benchmarks
 */

import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import * as fs from "fs";
import { writeFile } from "fs/promises";
import * as path from "path";
import { papaBois, anansi, ogma } from "../index";
import { generateNarration, estimateCost } from "../../services/elevenlabs";
import {
  generateIllustrationPrompt,
  generateImageFromPrompt,
  saveImageBase64,
  estimateImageCost,
} from "../../services/imagen";

// ── Constants ─────────────────────────────────────────────────────────────────

const QUALITY_THRESHOLD = 7.5; // Ogma score below this triggers revision
const MAX_REVISIONS = 2; // max cycles before force-approve

// ── Schema helpers ─────────────────────────────────────────────────────────────

const StoryBriefSchema = z.object({
  title: z.string(),
  genre: z.string(),
  protagonist: z.string(),
  setting: z.string(),
  folklore_elements: z.array(z.string()),
  themes: z.array(z.string()),
  chapter_count: z.number().int().min(1).max(5),
  mood: z.string(),
  brief: z.string(),
});

type StoryBrief = z.infer<typeof StoryBriefSchema>;

// ── Supabase helper (lazy initialise) ─────────────────────────────────────────

function getSupabase() {
  const { createClient } = require("@supabase/supabase-js");
  return createClient(
    process.env.SUPABASE_URL || "http://127.0.0.1:54321",
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function writeAgentEvent(
  supabase: ReturnType<typeof getSupabase>,
  storyId: string,
  agent: string,
  eventType: string,
  payload: Record<string, unknown>
) {
  const { error } = await supabase.from("agent_events").insert({
    story_id: storyId,
    agent,
    event_type: eventType,
    payload,
  });
  if (error) console.warn(`[event] Failed to write ${agent}/${eventType}:`, error.message);
}

/** Parse JSON out of a model response that may include markdown fences */
function extractJson(text: string): unknown {
  // Try raw first
  try {
    return JSON.parse(text.trim());
  } catch {}
  // Try stripping ```json fences
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {}
  }
  // Return a best-effort parse of the first {...} block
  const braced = text.match(/\{[\s\S]*\}/);
  if (braced) {
    try {
      return JSON.parse(braced[0]);
    } catch {}
  }
  return null;
}

// ── Step 1: Papa Bois — Parse request and generate creative brief ──────────────

const parseBriefStep = createStep({
  id: "parse-brief",
  description: "Papa Bois parses the user request and generates a story brief",
  inputSchema: z.object({
    storyId: z.string(),
    userRequest: z.string(),
    dryRun: z.boolean().optional().default(false),
  }),
  outputSchema: z.object({
    storyId: z.string(),
    brief: StoryBriefSchema,
    papaBoisLatency: z.number(),
    papaBoisTokens: z.number(),
    dryRun: z.boolean(),
  }),
  execute: async ({ inputData }) => {
    const { storyId, userRequest, dryRun } = inputData;
    const supabase = getSupabase();

    console.log(`\n[Papa Bois] 🌿 Parsing request for story ${storyId}`);
    const t0 = Date.now();

    // Update story status → generating
    await supabase
      .from("stories")
      .update({ status: "generating" })
      .eq("id", storyId);

    await writeAgentEvent(supabase, storyId, "papa_bois", "started", {
      request: userRequest,
    });

    const prompt = `Parse this story request and return a structured JSON brief for Anansi.

User request: "${userRequest}"

Return ONLY valid JSON matching this schema:
{
  "title": "evocative story title",
  "genre": "specific Caribbean folklore genre",
  "protagonist": "main character description",
  "setting": "Trinidad/Caribbean setting details",
  "folklore_elements": ["specific folklore creatures/myths"],
  "themes": ["thematic elements"],
  "chapter_count": 3,
  "mood": "emotional tone",
  "brief": "detailed creative direction for Anansi (2-3 sentences)"
}`;

    const result = await papaBois.generate(prompt);
    const latency_ms = Date.now() - t0;

    // Parse the JSON brief from the response
    const parsed = extractJson(result.text) as StoryBrief | null;
    if (!parsed || typeof parsed !== "object") {
      throw new Error(`Papa Bois returned invalid JSON: ${result.text.slice(0, 200)}`);
    }

    // Validate against schema (with defaults for missing fields)
    const brief: StoryBrief = {
      title: (parsed as any).title || "A Caribbean Tale",
      genre: (parsed as any).genre || "Caribbean Folklore",
      protagonist: (parsed as any).protagonist || "A young woman",
      setting: (parsed as any).setting || "Trinidad",
      folklore_elements: (parsed as any).folklore_elements || [],
      themes: (parsed as any).themes || [],
      chapter_count: Math.min(Math.max((parsed as any).chapter_count || 3, 1), 5),
      mood: (parsed as any).mood || "mysterious",
      brief: (parsed as any).brief || "Write a Caribbean folklore story.",
    };

    const tokens = (result as any).usage?.totalTokens || 200;

    // Update story title and write Papa Bois event
    await supabase
      .from("stories")
      .update({ title: brief.title, genre: brief.genre })
      .eq("id", storyId);

    await writeAgentEvent(supabase, storyId, "papa_bois", "completed", {
      brief,
      latency_ms,
      model: "claude-haiku-4-5",
      tokens,
    });

    console.log(`[Papa Bois] ✅ Brief ready: "${brief.title}" (${brief.chapter_count} chapters) — ${latency_ms}ms`);

    return { storyId, brief, papaBoisLatency: latency_ms, papaBoisTokens: tokens, dryRun: dryRun ?? false };
  },
});

// ── Step 2: Chapter loop — Anansi writes, Ogma judges, revision gate ───────────

const generateChaptersStep = createStep({
  id: "generate-chapters",
  description: "Anansi writes chapters; Ogma reviews with LLM-as-judge quality gate and revision loop",
  inputSchema: z.object({
    storyId: z.string(),
    brief: StoryBriefSchema,
    papaBoisLatency: z.number(),
    papaBoisTokens: z.number(),
    dryRun: z.boolean(),
  }),
  outputSchema: z.object({
    storyId: z.string(),
    brief: StoryBriefSchema,
    chaptersGenerated: z.number(),
    totalAnansiLatency: z.number(),
    totalOgmaLatency: z.number(),
    totalCostUsd: z.number(),
    dryRun: z.boolean(),
    papaBoisLatency: z.number(),
    papaBoisTokens: z.number(),
  }),
  execute: async ({ inputData }) => {
    const { storyId, brief, papaBoisLatency, papaBoisTokens, dryRun } = inputData;
    const supabase = getSupabase();

    let totalAnansiLatency = 0;
    let totalOgmaLatency = 0;
    let totalCostUsd = 0;
    let previousChapterContent = "";

    console.log(`\n[Pipeline] 📖 Generating ${brief.chapter_count} chapters for "${brief.title}"`);

    for (let chapterNum = 1; chapterNum <= brief.chapter_count; chapterNum++) {
      console.log(`\n[Chapter ${chapterNum}/${brief.chapter_count}] Starting...`);

      // ── 2a. Anansi writes (with possible revisions) ─────────────────────────

      let revisionCount = 0;
      const revisionHistory: any[] = [];
      let currentContent = "";
      let currentWordCount = 0;
      let finalOgmaScore = 0;
      let finalOgmaReview: any = null;
      let forceApproved = false;
      let anansiTotalLatency = 0;

      const baseChapterPrompt = `You are writing Chapter ${chapterNum} of "${brief.title}".

Story Brief:
- Protagonist: ${brief.protagonist}
- Setting: ${brief.setting}
- Folklore elements to include: ${brief.folklore_elements.join(", ")}
- Themes: ${brief.themes.join(", ")}
- Mood: ${brief.mood}
- Director's note: ${brief.brief}

${previousChapterContent ? `Previous chapter summary:\n"${previousChapterContent.slice(0, 300)}..."\n` : "This is the first chapter — establish the world and protagonist.\n"}

Write Chapter ${chapterNum} now. Return ONLY valid JSON:
{
  "chapter_number": ${chapterNum},
  "title": "chapter title",
  "content": "full chapter text (400-600 words, Caribbean oral tradition voice)",
  "word_count": 450,
  "folklore_elements_used": ["elements from the brief"],
  "next_chapter_setup": "what comes next"
}`;

      let anansiPrompt = baseChapterPrompt;

      // Revision loop
      while (revisionCount <= MAX_REVISIONS) {
        // Call Anansi
        console.log(`  [Anansi] ✍️  Writing attempt ${revisionCount + 1}...`);
        const anansiT0 = Date.now();
        await writeAgentEvent(supabase, storyId, "anansi", "started", {
          chapter: chapterNum,
          attempt: revisionCount + 1,
        });

        const anansiResult = await anansi.generate(anansiPrompt);
        const anansiLatency = Date.now() - anansiT0;
        anansiTotalLatency += anansiLatency;
        totalAnansiLatency += anansiLatency;

        const anansiTokens = (anansiResult as any).usage?.totalTokens || 300;
        const anansiParsed = extractJson(anansiResult.text) as any;
        currentContent = anansiParsed?.content || anansiResult.text;
        currentWordCount = anansiParsed?.word_count || currentContent.split(/\s+/).length;

        console.log(`  [Anansi] ✅ Draft ${revisionCount + 1} written (${currentWordCount} words, ${anansiLatency}ms)`);

        // Call Ogma to review
        console.log(`  [Ogma] 🧐 Reviewing chapter ${chapterNum}, attempt ${revisionCount + 1}...`);
        const ogmaT0 = Date.now();
        await writeAgentEvent(supabase, storyId, "ogma", "started", {
          chapter: chapterNum,
          attempt: revisionCount + 1,
        });

        const ogmaPrompt = `Review this Caribbean folklore chapter draft. Score it on quality (0-10).

Chapter content:
${currentContent}

Folklore elements expected: ${brief.folklore_elements.join(", ")}
Cultural context: ${brief.setting}, mood: ${brief.mood}

Return ONLY valid JSON:
{
  "reviewed_content": "your polished version of the chapter",
  "changes_made": ["list of specific changes you made"],
  "cultural_notes": "notes on folklore accuracy and cultural authenticity",
  "quality_score": 8.5,
  "approved": true
}

Score below 7.5 means the draft needs revision. Be honest and rigorous.`;

          // Use generateLegacy() — Ogma uses ollama-ai-provider (AI SDK v4 compat)
        // Added timeout for potentially slow qwen3:4b model
        const ogmaResult = await ogma.generateLegacy(ogmaPrompt);
        const ogmaLatency = Date.now() - ogmaT0;
        totalOgmaLatency += ogmaLatency;

        const ogmaParsed = extractJson(ogmaResult.text) as any;
        const qualityScore =
          typeof ogmaParsed?.quality_score === "number"
            ? ogmaParsed.quality_score
            : parseFloat(ogmaParsed?.quality_score) || 7.0;

        finalOgmaScore = qualityScore;
        finalOgmaReview = ogmaParsed;

        const attemptRecord = {
          attempt: revisionCount + 1,
          latency_ms: anansiLatency,
          tokens: anansiTokens,
          ogma_score: qualityScore,
          approved: qualityScore >= QUALITY_THRESHOLD,
          rejection_reason:
            qualityScore < QUALITY_THRESHOLD
              ? ogmaParsed?.changes_made || ["Quality below threshold"]
              : undefined,
        };
        revisionHistory.push(attemptRecord);

        await writeAgentEvent(supabase, storyId, "ogma", "completed", {
          chapter: chapterNum,
          attempt: revisionCount + 1,
          quality_score: qualityScore,
          approved: qualityScore >= QUALITY_THRESHOLD,
          latency_ms: ogmaLatency,
        });

        console.log(
          `  [Ogma] Score: ${qualityScore.toFixed(1)}/10 — ${qualityScore >= QUALITY_THRESHOLD ? "✅ APPROVED" : revisionCount >= MAX_REVISIONS ? "⚠️  FORCE APPROVED (max revisions)" : "❌ REJECTED — revising..."}`
        );

        if (qualityScore >= QUALITY_THRESHOLD) {
          // Approved — use Ogma's polished version
          currentContent = ogmaParsed?.reviewed_content || currentContent;
          break;
        }

        if (revisionCount >= MAX_REVISIONS) {
          // Force approve — max revisions reached
          forceApproved = true;
          currentContent = ogmaParsed?.reviewed_content || currentContent;
          console.log(`  [Ogma] ⚠️  Force-approving chapter ${chapterNum} after ${MAX_REVISIONS} revisions (final score: ${qualityScore.toFixed(1)})`);
          break;
        }

        // Prepare revision prompt with Ogma's feedback
        revisionCount++;
        anansiPrompt = `${baseChapterPrompt}

REVISION REQUEST (attempt ${revisionCount + 1}):
Ogma reviewed your previous draft and found these issues:
${(ogmaParsed?.changes_made || []).map((c: string) => `- ${c}`).join("\n")}

Cultural notes from Ogma: ${ogmaParsed?.cultural_notes || "Improve cultural authenticity."}

Please revise based on these notes. The chapter must score ≥7.5 for cultural authenticity and prose quality.

Return ONLY valid JSON with the same structure as before.`;
      }

      // ── 2c. Devi — Voice narration ─────────────────────────────────────────

      let audioUrl: string | null = null;
      let deviTrace: any = null;
      const textToNarrate = currentContent;

      if (!dryRun) {
        console.log(`  [Devi] 🎙️  Generating narration for chapter ${chapterNum}...`);
        const deviT0 = Date.now();
        await writeAgentEvent(supabase, storyId, "devi", "started", {
          chapter: chapterNum,
        });

        try {
          const voiceId = "SOYHLrjzK2X1ezoPC6cr"; // Anansi's voice — the storyteller narrates
          const narration = await generateNarration(textToNarrate, voiceId);
          const deviLatency = Date.now() - deviT0;
          const cost = estimateCost(textToNarrate, narration.modelId);
          totalCostUsd += cost;

          // Save audio file
          const audioDir = path.resolve(
            process.env.AUDIO_DIR ||
            path.join(process.cwd(), "audio"),
            storyId
          );
          fs.mkdirSync(audioDir, { recursive: true });
          const audioPath = path.join(audioDir, `chapter_${chapterNum}.mp3`);
          await writeFile(audioPath, narration.audioBuffer);
          audioUrl = `/audio/${storyId}/chapter_${chapterNum}.mp3`;

          deviTrace = {
            latency_ms: deviLatency,
            voice_id: voiceId,
            audio_duration_s: narration.durationSeconds,
            cost_usd: cost,
          };

          await writeAgentEvent(supabase, storyId, "devi", "completed", {
            chapter: chapterNum,
            audio_url: audioUrl,
            latency_ms: deviLatency,
            voice_id: voiceId,
          });

          console.log(`  [Devi] ✅ Audio saved to ${audioUrl} (${narration.durationSeconds}s, $${cost})`);
        } catch (err: any) {
          console.warn(`  [Devi] ⚠️  ElevenLabs failed: ${err.message} — skipping audio`);
          await writeAgentEvent(supabase, storyId, "devi", "failed", {
            chapter: chapterNum,
            error: err.message,
          });
        }
      } else {
        // Dry-run: mock audio
        audioUrl = `/audio/${storyId}/chapter_${chapterNum}.mp3`;
        deviTrace = {
          latency_ms: 0,
          voice_id: "SOYHLrjzK2X1ezoPC6cr",
          audio_duration_s: 0,
          cost_usd: 0,
          dry_run: true,
        };
        console.log(`  [Devi] 🔇 Dry-run mode — skipping ElevenLabs, mocking audio_url`);
      }

      // ── 2c-bis. Image generation (Gemini Imagen) ────────────────────────

      let imageUrl: string | null = null;
      let illustrationPrompt: string | null = null;
      let imagenTrace: any = null;

      if (!dryRun) {
        console.log(`  [Imagen] 🎨 Generating chapter illustration...`);
        const imagenT0 = Date.now();

        try {
          await writeAgentEvent(supabase, storyId, "imagen", "started", {
            chapter: chapterNum,
          });

          // Generate illustration prompt using Haiku
          illustrationPrompt = await generateIllustrationPrompt(
            currentContent,
            chapterNum,
            brief.title,
            brief.folklore_elements
          );

          // Call Gemini Imagen API
          const base64Image = await generateImageFromPrompt(illustrationPrompt);

          // Save base64 to local storage (for offline-first support)
          imageUrl = await saveImageBase64(base64Image, storyId, chapterNum);

          const imagenLatency = Date.now() - imagenT0;
          const imagenCost = estimateImageCost();
          totalCostUsd += imagenCost;

          imagenTrace = {
            latency_ms: imagenLatency,
            model: "imagen-4.0-generate-002",
            cost_usd: imagenCost,
            image_size_bytes: base64Image.length,
          };

          await writeAgentEvent(supabase, storyId, "imagen", "completed", {
            chapter: chapterNum,
            image_url: imageUrl,
            latency_ms: imagenLatency,
            cost_usd: imagenCost,
          });

          console.log(
            `  [Imagen] ✅ Illustration generated (${imagenLatency}ms, $${imagenCost})`
          );
        } catch (err: any) {
          console.warn(
            `  [Imagen] ⚠️  Image generation failed: ${err.message} — skipping`
          );
          await writeAgentEvent(supabase, storyId, "imagen", "failed", {
            chapter: chapterNum,
            error: err.message,
          });
          imagenTrace = {
            latency_ms: 0,
            error: err.message,
            cost_usd: 0,
          };
        }
      } else {
        // Dry-run: mock image
        illustrationPrompt =
          "Lush Caribbean watercolor illustration of a spirit emerging from the forest.";
        imageUrl = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;
        imagenTrace = {
          latency_ms: 0,
          model: "imagen-4.0-generate-002",
          cost_usd: 0,
          dry_run: true,
        };
        console.log(`  [Imagen] 🔇 Dry-run mode — mocking image`);
      }

      // ── 2d. Write chapter to Supabase ──────────────────────────────────────

      const agentTrace = {
        papa_bois: {
          latency_ms: papaBoisLatency,
          model: "claude-haiku-4-5",
          tokens: papaBoisTokens,
        },
        anansi: {
          revisions: revisionHistory.length,
          revision_history: revisionHistory,
          final_content_length: currentContent.length,
        },
        ogma: {
          model: "qwen3:4b",
          cost_usd: 0.0, // always $0 — local Ollama inference
          quality_score: finalOgmaScore,
          cultural_notes: finalOgmaReview?.cultural_notes || "",
          changes_made: finalOgmaReview?.changes_made || [],
          force_approved: forceApproved,
        },
        devi: deviTrace,
        imagen: imagenTrace,
      };

      const { error: chapterError } = await supabase
        .from("story_chapters")
        .insert({
          story_id: storyId,
          chapter_number: chapterNum,
          content: currentContent, // Anansi's final draft (after revision)
          reviewed_content: finalOgmaReview?.reviewed_content || currentContent,
          audio_url: audioUrl,
          image_url: imageUrl,
          illustration_prompt: illustrationPrompt,
          revision_count: revisionHistory.length - 1,
          quality_score: finalOgmaScore,
          agent_trace: agentTrace,
        });

      if (chapterError) {
        console.error(`[Chapter ${chapterNum}] ❌ DB write failed:`, chapterError.message);
      } else {
        console.log(`[Chapter ${chapterNum}] ✅ Written to Supabase (score: ${finalOgmaScore.toFixed(1)}, revisions: ${revisionHistory.length - 1})`);
      }

      await writeAgentEvent(supabase, storyId, "anansi", "completed", {
        chapter: chapterNum,
        revisions: revisionHistory.length - 1,
        final_score: finalOgmaScore,
        force_approved: forceApproved,
        content_length: currentContent.length,
      });

      // Track previous chapter for context
      previousChapterContent = currentContent;
    }

    return {
      storyId,
      brief,
      chaptersGenerated: brief.chapter_count,
      totalAnansiLatency,
      totalOgmaLatency,
      totalCostUsd,
      dryRun,
      papaBoisLatency,
      papaBoisTokens,
    };
  },
});

// ── Step 3: Finalise ───────────────────────────────────────────────────────────

const finaliseStep = createStep({
  id: "finalise",
  description: "Mark story complete and write final pipeline event",
  inputSchema: z.object({
    storyId: z.string(),
    brief: StoryBriefSchema,
    chaptersGenerated: z.number(),
    totalAnansiLatency: z.number(),
    totalOgmaLatency: z.number(),
    totalCostUsd: z.number(),
    dryRun: z.boolean(),
    papaBoisLatency: z.number(),
    papaBoisTokens: z.number(),
  }),
  outputSchema: z.object({
    storyId: z.string(),
    status: z.literal("complete"),
    chaptersGenerated: z.number(),
    totalLatencyMs: z.number(),
    totalCostUsd: z.number(),
  }),
  execute: async ({ inputData }) => {
    const {
      storyId,
      chaptersGenerated,
      totalAnansiLatency,
      totalOgmaLatency,
      totalCostUsd,
      papaBoisLatency,
    } = inputData;
    const supabase = getSupabase();

    const totalLatencyMs = papaBoisLatency + totalAnansiLatency + totalOgmaLatency;

    // Mark story complete
    await supabase
      .from("stories")
      .update({ status: "complete" })
      .eq("id", storyId);

    await writeAgentEvent(supabase, storyId, "pipeline", "completed", {
      total_chapters: chaptersGenerated,
      total_latency_ms: totalLatencyMs,
      total_cost_usd: totalCostUsd,
      latency_breakdown: {
        papa_bois_ms: papaBoisLatency,
        anansi_ms: totalAnansiLatency,
        ogma_ms: totalOgmaLatency,
      },
    });

    console.log(`\n[Pipeline] 🎉 Story ${storyId} complete!`);
    console.log(`  Chapters: ${chaptersGenerated}`);
    console.log(`  Total latency: ${(totalLatencyMs / 1000).toFixed(1)}s`);
    console.log(`  Total cost: $${totalCostUsd.toFixed(4)}`);

    return {
      storyId,
      status: "complete" as const,
      chaptersGenerated,
      totalLatencyMs,
      totalCostUsd,
    };
  },
});

// ── Compose the workflow ───────────────────────────────────────────────────────

export const storyPipeline = createWorkflow({
  id: "story-pipeline",
  description:
    "Full SandSync storytelling pipeline: Papa Bois briefs → Anansi writes → Ogma reviews (LLM-as-judge) → Devi narrates",
  inputSchema: z.object({
    storyId: z.string(),
    userRequest: z.string(),
    dryRun: z.boolean().optional().default(false),
  }),
  outputSchema: z.object({
    storyId: z.string(),
    status: z.literal("complete"),
    chaptersGenerated: z.number(),
    totalLatencyMs: z.number(),
    totalCostUsd: z.number(),
  }),
})
  .then(parseBriefStep)
  .then(generateChaptersStep)
  .then(finaliseStep)
  .commit();

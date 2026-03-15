/**
 * SandSync — Architecture Demo Page
 *
 * Two-column layout showing the live pipeline visualization alongside the story form.
 * Ported from Sandman Tales Mistral hackathon component pattern.
 *
 * Left  (2/5): Story form — genre + theme, submit button
 * Right (3/5): Pipeline flow — idle → active (amber/pulse) → complete (green)
 *
 * Data flow:
 *   User submits → POST /stories → storyId received → agent_events stream via PowerSync
 *   Each agent_event updates the corresponding pipeline node state in real-time.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useQuery, usePowerSyncStatus } from "@powersync/react";

export const Route = createFileRoute("/demo")({
  component: DemoPage,
});

// ── Types ──────────────────────────────────────────────────────────────────────

type StepState = "idle" | "active" | "complete" | "skipped";

type Steps = {
  user_input: StepState;
  powersync_local: StepState;
  papa_bois: StepState;
  anansi_ogma: StepState;
  fal_images: StepState;
  deepgram_voice: StepState;
  supabase_sync: StepState;
  powersync_broadcast: StepState;
  published: StepState;
};

const INITIAL_STEPS: Steps = {
  user_input: "active",
  powersync_local: "idle",
  papa_bois: "idle",
  anansi_ogma: "idle",
  fal_images: "idle",
  deepgram_voice: "idle",
  supabase_sync: "idle",
  powersync_broadcast: "idle",
  published: "idle",
};

const GENRES = [
  { label: "Anansi trickster tale", emoji: "🕷️", value: "anansi" },
  { label: "Papa Bois forest spirit", emoji: "🌳", value: "papa-bois" },
  { label: "Soucouyant mystery", emoji: "🔥", value: "soucouyant" },
  { label: "La Diablesse encounter", emoji: "👠", value: "la-diablesse" },
  { label: "Lagahoo shapeshifter", emoji: "🐺", value: "lagahoo" },
  { label: "Mama Dlo river spirit", emoji: "🐍", value: "mama-dlo" },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function Node({
  state,
  icon,
  label,
  sub,
  detail,
}: {
  state: StepState;
  icon: string;
  label: string;
  sub: string;
  detail?: string;
}) {
  const bg =
    state === "active"
      ? "bg-amber-500/30 border-amber-400 shadow-amber-400/30 shadow-lg scale-105"
      : state === "complete"
      ? "bg-green-500/20 border-green-400/60"
      : state === "skipped"
      ? "bg-slate-700/30 border-slate-600/30 opacity-40"
      : "bg-slate-700/30 border-slate-600/30";

  const dot =
    state === "active"
      ? "bg-amber-400 animate-pulse"
      : state === "complete"
      ? "bg-green-400"
      : "bg-slate-500";

  return (
    <div
      className={`relative rounded-xl border p-3 transition-all duration-500 ${bg}`}
    >
      <div className="flex items-center gap-2">
        <div
          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot} transition-colors duration-300`}
        />
        <span className="text-sm">{icon}</span>
        <span className="text-amber-100 text-xs font-semibold">{label}</span>
        {state === "complete" && (
          <span className="ml-auto text-green-400 text-xs font-mono">✓</span>
        )}
      </div>
      <p className="text-amber-200/40 text-[10px] mt-1 ml-5">{sub}</p>
      {detail && state !== "idle" && (
        <p
          className={`text-[10px] mt-1 ml-5 font-mono transition-colors duration-300 ${
            state === "active" ? "text-amber-300/70" : "text-green-400/60"
          }`}
        >
          {detail}
        </p>
      )}
    </div>
  );
}

function Arrow({ fromState }: { fromState: StepState }) {
  const isLit = fromState === "complete";
  return (
    <div className="flex items-center justify-center py-0.5">
      <div
        className={`w-0.5 h-4 rounded transition-colors duration-500 ${
          isLit ? "bg-amber-400" : "bg-slate-600/50"
        }`}
      />
    </div>
  );
}

function ParallelArrows({ fromState }: { fromState: StepState }) {
  const isLit = fromState === "complete";
  return (
    <div className="flex items-center justify-center py-0.5 gap-[60px]">
      <div className="flex flex-col items-center gap-0.5">
        <div
          className={`w-0.5 h-3 rounded transition-colors duration-500 ${
            isLit ? "bg-amber-400" : "bg-slate-600/50"
          }`}
        />
        <div
          className={`w-[70px] h-0.5 rounded transition-colors duration-500 ${
            isLit ? "bg-amber-400" : "bg-slate-600/50"
          }`}
        />
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

function DemoPage() {
  const [steps, setSteps] = useState<Steps>(INITIAL_STEPS);
  const [storyId, setStoryId] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState(GENRES[0].value);
  const [theme, setTheme] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [storyTitle, setStoryTitle] = useState<string | null>(null);
  const [progressText, setProgressText] = useState("Choose a genre and summon a story");
  const [ogmaScore, setOgmaScore] = useState<number | null>(null);
  const [revisionCount, setRevisionCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const syncStatus = usePowerSyncStatus();

  // Watch agent_events via PowerSync — the core demo of offline-first sync
  const { data: agentEvents } = useQuery<{
    id: string;
    agent: string;
    event_type: string;
    payload: string;
    created_at: string;
  }>(
    storyId
      ? "SELECT * FROM agent_events WHERE story_id = ? ORDER BY created_at ASC"
      : "SELECT * FROM agent_events WHERE 1=0",
    storyId ? [storyId] : []
  );

  // Watch story_chapters count via PowerSync
  const { data: chapters } = useQuery<{ count: number }>(
    storyId
      ? "SELECT COUNT(*) as count FROM story_chapters WHERE story_id = ?"
      : "SELECT 0 as count",
    storyId ? [storyId] : []
  );

  const chapterCount = chapters?.[0]?.count ?? 0;

  // ── Drive pipeline state from agent_events ───────────────────────────────────
  useEffect(() => {
    if (!agentEvents || agentEvents.length === 0) return;

    const parse = (e: { payload: string | object }) => {
      if (typeof e.payload === "string") {
        try { return JSON.parse(e.payload); } catch { return {}; }
      }
      return e.payload ?? {};
    };

    let newSteps = { ...steps };
    let newProgressText = progressText;
    let newScore = ogmaScore;
    let newRevisions = revisionCount;

    for (const event of agentEvents) {
      const payload = parse(event);

      if (event.agent === "papa_bois") {
        if (event.event_type === "started") {
          newSteps.papa_bois = "active";
          newProgressText = "Papa Bois 🌳 parsing your request...";
        } else if (event.event_type === "completed") {
          newSteps.papa_bois = "complete";
          newSteps.anansi_ogma = "active";
          if (payload.brief?.title) setStoryTitle(payload.brief.title);
          newProgressText = "Anansi 🕷️ weaving the tale...";
        }
      }

      if (event.agent === "anansi") {
        if (event.event_type === "started") {
          newSteps.anansi_ogma = "active";
          const attempt = payload.attempt ?? 1;
          if (attempt > 1) newProgressText = `Anansi 🕷️ revising (attempt ${attempt})...`;
        }
        if (event.event_type === "completed") {
          newRevisions = Math.max(newRevisions, (payload.revisions ?? 0));
        }
      }

      if (event.agent === "ogma") {
        if (event.event_type === "completed") {
          const score = payload.quality_score ?? null;
          if (score !== null) newScore = score;
          if (payload.approved === false) {
            newProgressText = `Ogma 📜 rejected (score ${score?.toFixed(1)}) — revising...`;
          } else if (payload.approved === true) {
            newProgressText = `Ogma 📜 approved (score ${score?.toFixed(1)}) ✓`;
          }
        }
      }

      if (event.agent === "imagen") {
        if (event.event_type === "started") {
          newSteps.fal_images = "active";
          newProgressText = "Generating illustrations via fal.ai FLUX...";
        } else if (event.event_type === "completed") {
          newSteps.fal_images = "complete";
        } else if (event.event_type === "failed") {
          newSteps.fal_images = "skipped";
        }
      }

      if (event.agent === "devi") {
        if (event.event_type === "started") {
          newSteps.deepgram_voice = "active";
        } else if (event.event_type === "completed" || event.event_type === "fallback") {
          newSteps.deepgram_voice = "complete";
        } else if (event.event_type === "failed") {
          newSteps.deepgram_voice = "skipped";
        }
      }

      if (event.agent === "anansi" && event.event_type === "completed" && (payload.final_score ?? 0) > 0) {
        // Anansi completed a chapter — Ogma approved, both are done for this chapter
        newSteps.anansi_ogma = "active"; // keep active until pipeline finalises
      }

      if (event.agent === "pipeline" && event.event_type === "completed") {
        newSteps.anansi_ogma = "complete";
        newSteps.supabase_sync = "complete";
        newSteps.powersync_broadcast = "active";
        newProgressText = "Syncing to all devices via PowerSync...";
      }
    }

    setSteps(newSteps);
    setProgressText(newProgressText);
    setOgmaScore(newScore);
    setRevisionCount(newRevisions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentEvents]);

  // ── When chapters appear in PowerSync → supabase_sync active ────────────────
  useEffect(() => {
    if (!storyId || chapterCount === 0) return;
    setSteps((s) => ({
      ...s,
      supabase_sync: s.supabase_sync === "idle" ? "active" : s.supabase_sync,
    }));
    if (chapterCount > 0) {
      setProgressText(`Chapter ${chapterCount} synced via PowerSync ↔ Supabase`);
    }
  }, [chapterCount, storyId]);

  // ── Poll /stories/:id/status for overall completion ──────────────────────────
  useEffect(() => {
    if (!storyId) return;

    const apiUrl = (import.meta.env as any).VITE_API_URL || "http://localhost:3002";

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${apiUrl}/stories/${storyId}/status`);
        if (!res.ok) return;
        const data = await res.json() as {
          status: string;
          title?: string;
          chapters_complete?: number;
          total_chapters?: number;
        };

        if (data.title && !storyTitle) setStoryTitle(data.title);

        if (data.status === "complete") {
          clearInterval(pollRef.current!);
          setSteps((s) => ({
            ...s,
            anansi_ogma: "complete",
            supabase_sync: "complete",
            powersync_broadcast: "complete",
            published: "complete",
          }));
          setProgressText("Story published ✅ All agents complete. PowerSync synced.");
        } else if (data.status === "failed") {
          clearInterval(pollRef.current!);
          setProgressText("Pipeline encountered an error — check agent logs");
        }
      } catch {
        // ignore
      }
    }, 2500);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [storyId, storyTitle]);

  // ── Form submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    setStoryId(null);
    setStoryTitle(null);
    setOgmaScore(null);
    setRevisionCount(0);

    // Step 1: user_input → complete, powersync_local → active
    setSteps({
      ...INITIAL_STEPS,
      user_input: "complete",
      powersync_local: "active",
    });
    setProgressText("Writing to PowerSync local cache...");

    try {
      const apiUrl = (import.meta.env as any).VITE_API_URL || "http://localhost:3002";
      const res = await fetch(`${apiUrl}/stories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genre: selectedGenre, theme: theme || undefined }),
      });

      if (!res.ok) throw new Error(`API error: ${res.statusText}`);
      const data = (await res.json()) as { id?: string; storyId?: string };
      const id = data.id ?? data.storyId;
      if (!id) throw new Error("No storyId returned");

      setStoryId(id);

      // Step 2: powersync_local → complete, mastra chain starts
      setSteps((s) => ({
        ...s,
        powersync_local: "complete",
        papa_bois: "active",
      }));
      setProgressText("Story queued — Mastra pipeline starting...");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Summoning failed");
      setSteps(INITIAL_STEPS);
      setProgressText("Failed to summon. Try again.");
      setSubmitting(false);
    }
  };

  const isRunning = submitting && steps.published !== "complete";
  const isDone = steps.published === "complete";

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page title */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-amber-100">
            🏗️ Architecture Demo
          </h1>
          <p className="text-amber-200/50 text-sm mt-1">
            Live pipeline visualization — watch data flow through PowerSync → Mastra → Supabase
          </p>
        </div>
        <Link
          to="/"
          className="text-xs text-amber-200/50 hover:text-amber-200/80 transition-colors px-3 py-1.5 rounded-lg hover:bg-amber-500/10"
        >
          ← Back to app
        </Link>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-6 items-start">
        {/* ── LEFT: Story form (2/5) ──────────────────────────────────────── */}
        <div className="w-2/5 space-y-4">
          <div className="border border-amber-200/20 rounded-2xl bg-slate-800/50 backdrop-blur-lg p-6 space-y-5">
            <div className="flex items-center gap-2">
              <span className="text-lg">🌴</span>
              <h2 className="text-base font-semibold text-amber-100">Summon a Story</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-rose-500/10 border border-rose-400/40 rounded-lg px-3 py-2 text-xs text-rose-200">
                  {error}
                </div>
              )}

              {/* Genre pills */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-amber-200/70 uppercase tracking-wider">
                  Folklore Genre
                </label>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      disabled={isRunning}
                      onClick={() => setSelectedGenre(g.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all disabled:opacity-40 ${
                        selectedGenre === g.value
                          ? "bg-amber-100 text-indigo-950"
                          : "bg-indigo-900/40 text-amber-100 border border-indigo-700/50 hover:border-amber-200/50"
                      }`}
                    >
                      {g.emoji} {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-amber-200/70 uppercase tracking-wider">
                  Theme / Prompt
                </label>
                <textarea
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  disabled={isRunning}
                  placeholder="A young woman who discovers she can speak to spirits..."
                  rows={3}
                  className="w-full bg-indigo-900/30 border border-indigo-700/50 text-amber-100 placeholder-amber-200/25 rounded-lg px-3 py-2 text-sm resize-none focus:border-amber-200/50 focus:ring-1 focus:ring-amber-400/30 transition-all disabled:opacity-40"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isRunning || !selectedGenre}
                className="w-full bg-amber-100 text-indigo-950 hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold rounded-lg px-4 py-3 text-sm transition-all"
              >
                {isRunning ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block animate-spin">⌛</span>
                    Pipeline running...
                  </span>
                ) : (
                  "Summon Story →"
                )}
              </button>
            </form>
          </div>

          {/* PowerSync status badge */}
          <div className="border border-amber-200/10 rounded-xl bg-slate-800/30 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                  !syncStatus.connected
                    ? "bg-red-400"
                    : syncStatus.hasSynced
                    ? "bg-green-400"
                    : "bg-amber-400 animate-pulse"
                }`}
              />
              <span className="text-xs text-amber-200/60 font-mono">PowerSync</span>
            </div>
            <span
              className={`text-xs font-mono ${
                !syncStatus.connected
                  ? "text-red-400"
                  : syncStatus.hasSynced
                  ? "text-green-400"
                  : "text-amber-400"
              }`}
            >
              {!syncStatus.connected
                ? "⚠ Offline — reading from local cache"
                : syncStatus.hasSynced
                ? "● Synced"
                : "◌ Syncing..."}
            </span>
          </div>

          {/* Story result when done */}
          {isDone && storyId && (
            <div className="border border-green-400/40 rounded-xl bg-green-500/10 px-4 py-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-green-400">✅</span>
                <span className="text-sm font-semibold text-green-300">Story Published</span>
              </div>
              {storyTitle && (
                <p className="text-xs text-amber-200/70 italic">"{storyTitle}"</p>
              )}
              {ogmaScore && (
                <p className="text-xs text-amber-200/50 font-mono">
                  Ogma quality score: {ogmaScore.toFixed(1)}/10
                  {revisionCount > 0 && ` · ${revisionCount} revision${revisionCount > 1 ? "s" : ""}`}
                </p>
              )}
              <Link
                to="/stories/$id"
                params={{ id: storyId }}
                className="inline-flex items-center gap-1 text-xs text-green-300 hover:text-green-200 font-medium transition-colors"
              >
                Read the story →
              </Link>
            </div>
          )}
        </div>

        {/* ── RIGHT: Pipeline visualization (3/5) ────────────────────────── */}
        <div className="w-3/5 space-y-1">
          <div className="border border-amber-200/20 rounded-2xl bg-slate-800/50 backdrop-blur-lg p-5 space-y-0">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-amber-200/50 uppercase tracking-widest">
                Live Pipeline
              </span>
              {storyId && (
                <span className="text-[10px] font-mono text-amber-200/30 truncate max-w-[160px]">
                  {storyId}
                </span>
              )}
            </div>

            {/* ── Node 1: User Input ─────────────────────────────────────── */}
            <Node
              state={steps.user_input}
              icon="🧑‍💻"
              label="User Input"
              sub="Story request via React form"
            />

            <Arrow fromState={steps.user_input} />

            {/* ── Node 2: PowerSync Local Write ─────────────────────────── */}
            <Node
              state={steps.powersync_local}
              icon="⚡"
              label="PowerSync — Local Write"
              sub="SQLite WASM in-browser cache"
              detail="Optimistic write → available offline instantly"
            />

            <Arrow fromState={steps.powersync_local} />

            {/* ── Node 3: Mastra Orchestrator ───────────────────────────── */}
            <Node
              state={steps.papa_bois === "idle" ? "idle" : steps.anansi_ogma === "complete" ? "complete" : "active"}
              icon="🤖"
              label="Mastra Agent Orchestrator"
              sub="Bun API → storyPipeline workflow"
            />

            <Arrow
              fromState={
                steps.papa_bois === "idle" ? "idle" : steps.anansi_ogma === "complete" ? "complete" : "active"
              }
            />

            {/* ── Nodes 4a + 4b: Papa Bois + Anansi/Ogma (stacked) ─────── */}
            <div className="space-y-1 pl-4 border-l-2 border-amber-400/20 ml-3">
              <Node
                state={steps.papa_bois}
                icon="🌳"
                label="Papa Bois — Brief"
                sub="Claude Haiku · story brief + structure"
              />
              <div className="flex items-center justify-center py-0.5 ml-3">
                <div
                  className={`w-0.5 h-3 rounded transition-colors duration-500 ${
                    steps.papa_bois === "complete" ? "bg-amber-400" : "bg-slate-600/50"
                  }`}
                />
              </div>
              <Node
                state={steps.anansi_ogma}
                icon="🕷️📜"
                label="Anansi + Ogma — Write & Judge"
                sub="Claude Haiku writes · qwen2.5 reviews"
                detail={
                  ogmaScore
                    ? `Quality score: ${ogmaScore.toFixed(1)}/10${revisionCount > 0 ? ` · ${revisionCount} revision${revisionCount > 1 ? "s" : ""}` : ""}`
                    : undefined
                }
              />
            </div>

            <Arrow fromState={steps.anansi_ogma} />

            {/* ── Nodes 5a + 5b: fal.ai + Deepgram (parallel) ──────────── */}
            <div className="grid grid-cols-2 gap-2">
              <Node
                state={steps.fal_images}
                icon="🎨"
                label="fal.ai FLUX"
                sub="Chapter illustrations"
                detail="FLUX.1-schnell · ~$0.003/img"
              />
              <Node
                state={steps.deepgram_voice}
                icon="🎙️"
                label="Deepgram / ElevenLabs"
                sub="Voice narration (Devi)"
                detail="Aura TTS · fallback chain"
              />
            </div>

            {/* Merge arrows back together */}
            <div className="flex justify-around py-0.5 px-6">
              {[steps.fal_images, steps.deepgram_voice].map((s, i) => (
                <div
                  key={i}
                  className={`w-0.5 h-4 rounded transition-colors duration-500 ${
                    s === "complete" ? "bg-amber-400" : "bg-slate-600/50"
                  }`}
                />
              ))}
            </div>

            {/* ── Node 6: Supabase ──────────────────────────────────────── */}
            <Node
              state={steps.supabase_sync}
              icon="🐘"
              label="Supabase — Persist & Broadcast"
              sub="PostgreSQL + Realtime subscriptions"
              detail={chapterCount > 0 ? `${chapterCount} chapter${chapterCount > 1 ? "s" : ""} written` : undefined}
            />

            <Arrow fromState={steps.supabase_sync} />

            {/* ── Node 7: PowerSync Broadcast ───────────────────────────── */}
            <Node
              state={steps.powersync_broadcast}
              icon="📡"
              label="PowerSync — Sync All Clients"
              sub="Streams changes → all connected devices"
              detail={
                syncStatus.connected
                  ? "WebSocket active — syncing now"
                  : "Offline — queued for reconnect"
              }
            />

            <Arrow fromState={steps.powersync_broadcast} />

            {/* ── Node 8: Published ─────────────────────────────────────── */}
            <Node
              state={steps.published}
              icon="✅"
              label="Story Published"
              sub="Available offline on all devices"
              detail={storyTitle ? `"${storyTitle}"` : undefined}
            />

            {/* ── Progress bar ──────────────────────────────────────────── */}
            <div className="mt-4 pt-4 border-t border-amber-200/10 space-y-2">
              <div className="flex items-center gap-2">
                {isRunning && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                )}
                <p className="text-[11px] text-amber-200/60 font-mono">{progressText}</p>
              </div>

              {/* Step progress dots */}
              {storyId && (
                <div className="flex items-center gap-1.5">
                  {(Object.keys(steps) as (keyof Steps)[]).map((key) => (
                    <div
                      key={key}
                      className={`h-1 rounded-full flex-1 transition-all duration-500 ${
                        steps[key] === "complete"
                          ? "bg-green-400"
                          : steps[key] === "active"
                          ? "bg-amber-400 animate-pulse"
                          : "bg-slate-600/40"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Agent debug view link */}
          {storyId && (
            <div className="text-right pt-1">
              <Link
                to="/stories/$id/agents"
                params={{ id: storyId }}
                className="text-[11px] text-amber-200/40 hover:text-amber-200/70 transition-colors font-mono"
              >
                View full agent trace →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

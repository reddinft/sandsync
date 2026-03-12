/**
 * SandSync Pipeline Demo — /pipeline-demo
 *
 * Split-screen view: Left = story form, Right = live pipeline visualisation.
 * Nodes light amber when active (pulse + glow) and green when complete.
 * Arrows light up as upstream steps complete.
 *
 * Wired to real API at localhost:3002 — polls /stories/:id/status for updates.
 * Falls back to realistic timing simulation if the story is still generating.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";

export const Route = createFileRoute("/pipeline-demo")({
  component: PipelineDemoPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type StepId =
  | "user_input"
  | "powersync_write"
  | "mastra"
  | "story_gen"
  | "ogma_review"
  | "fal_images"
  | "deepgram_tts"
  | "supabase"
  | "powersync_sync"
  | "published";

type StepState = "idle" | "active" | "complete" | "skipped";
type PipelineSteps = Record<StepId, StepState>;

const INITIAL_STEPS: PipelineSteps = {
  user_input: "idle",
  powersync_write: "idle",
  mastra: "idle",
  story_gen: "idle",
  ogma_review: "idle",
  fal_images: "idle",
  deepgram_tts: "idle",
  supabase: "idle",
  powersync_sync: "idle",
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

// ── Sub-components ────────────────────────────────────────────────────────────

function PipelineNode({
  id,
  icon,
  label,
  sub,
  steps,
}: {
  id: StepId;
  icon: string;
  label: string;
  sub: string;
  steps: PipelineSteps;
}) {
  const s = steps[id];
  const bg =
    s === "active"
      ? "bg-amber-500/30 border-amber-400 shadow-amber-400/40 shadow-lg scale-[1.03]"
      : s === "complete"
      ? "bg-green-500/20 border-green-400/60"
      : "bg-slate-700/30 border-slate-600/30";
  const dot =
    s === "active"
      ? "bg-amber-400 animate-pulse"
      : s === "complete"
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
        <span className="text-amber-100 text-xs font-medium">{label}</span>
        {s === "complete" && (
          <span className="ml-auto text-green-400 text-xs">✓</span>
        )}
      </div>
      <p className="text-amber-200/40 text-[10px] mt-1 ml-5">{sub}</p>
    </div>
  );
}

function PipelineArrow({
  from,
  to,
  steps,
}: {
  from: StepId;
  to: StepId;
  steps: PipelineSteps;
}) {
  const isActive =
    steps[from] === "complete" &&
    (steps[to] === "active" || steps[to] === "complete");
  return (
    <div className="flex items-center justify-center py-0.5">
      <div
        className={`w-0.5 h-4 rounded transition-colors duration-500 ${
          isActive ? "bg-amber-400" : "bg-slate-600/40"
        }`}
      />
    </div>
  );
}

// Horizontal arrow for 3-column layout
function HorizontalArrow({
  from,
  to,
  steps,
}: {
  from: StepId;
  to: StepId;
  steps: PipelineSteps;
}) {
  const isActive =
    steps[from] === "complete" &&
    (steps[to] === "active" || steps[to] === "complete");
  return (
    <div className="flex items-center justify-center px-1">
      <div
        className={`h-0.5 w-4 rounded transition-colors duration-500 ${
          isActive ? "bg-amber-400" : "bg-slate-600/40"
        }`}
      />
    </div>
  );
}

// ── Progress Label ─────────────────────────────────────────────────────────────

function progressLabel(steps: PipelineSteps, currentStepMsg: string): string {
  if (steps.published === "complete") return "✅ Story published — syncing to all clients";
  if (steps.powersync_sync === "active") return "⚡ PowerSync broadcasting to all devices...";
  if (steps.supabase === "active") return "💾 Persisting to Supabase + broadcasting real-time...";
  if (steps.supabase === "complete") return "📡 Handing off to PowerSync sync layer...";
  if (steps.fal_images === "active" || steps.deepgram_tts === "active" || steps.story_gen === "active")
    return "🎨 Parallel agents running — generating story, images, and voice...";
  if (steps.ogma_review === "active") return "📜 Ogma reviewing cultural authenticity...";
  if (steps.mastra === "active") return "🤖 Mastra orchestrating the agent pipeline...";
  if (steps.powersync_write === "active") return "⚡ PowerSync capturing local write (offline-first)...";
  if (steps.powersync_write === "complete") return "✅ Local write committed — starting cloud pipeline...";
  if (currentStepMsg) return currentStepMsg;
  return "Enter a story prompt to see the pipeline run live →";
}

// ── Simulation helpers ─────────────────────────────────────────────────────────

/**
 * Simulates pipeline transitions with realistic timing.
 * Uses real API polling if a storyId is provided.
 */
function usePipelineSimulation(
  storyId: string | null,
  onStepsChange: (updater: (prev: PipelineSteps) => PipelineSteps) => void
) {
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const clearAll = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    simRef.current.forEach(clearTimeout);
    simRef.current = [];
  }, []);

  const set = useCallback(
    (id: StepId, state: StepState) => {
      if (!mountedRef.current) return;
      onStepsChange((prev) => ({ ...prev, [id]: state }));
    },
    [onStepsChange]
  );

  const delay = useCallback(
    (ms: number, fn: () => void) => {
      const t = setTimeout(() => {
        if (mountedRef.current) fn();
      }, ms);
      simRef.current.push(t);
    },
    []
  );

  // Start simulation when a storyId is available
  useEffect(() => {
    if (!storyId) return;
    clearAll();

    const apiUrl =
      (import.meta.env as any).VITE_API_URL || "http://localhost:3002";

    // Step 1: powersync_write active immediately
    set("powersync_write", "active");

    // Step 2: powersync_write complete → mastra active (800ms)
    delay(800, () => {
      set("powersync_write", "complete");
      set("mastra", "active");
    });

    // Step 3: mastra complete → parallel agents active (3.5s)
    delay(3500, () => {
      set("mastra", "complete");
      set("story_gen", "active");
      set("fal_images", "active");
      set("deepgram_tts", "active");
    });

    // Step 4: ogma_review kicks in during story_gen (5s)
    delay(5000, () => {
      set("ogma_review", "active");
    });

    // Now poll the real API for status
    let lastStatus = "";
    let agentsComplete = false;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${apiUrl}/stories/${storyId}/status`);
        if (!res.ok) return;
        const data = await res.json() as {
          status: string;
          chapters_complete: number;
          total_chapters: number | null;
        };

        if (!mountedRef.current) return;

        if (data.status === "complete" && !agentsComplete) {
          agentsComplete = true;

          // Complete all agents
          set("story_gen", "complete");
          set("ogma_review", "complete");
          set("fal_images", "complete");
          set("deepgram_tts", "complete");

          // Step 5: supabase active (after 200ms)
          setTimeout(() => {
            if (!mountedRef.current) return;
            set("supabase", "active");

            // Step 6: supabase complete → powersync_sync (600ms later)
            setTimeout(() => {
              if (!mountedRef.current) return;
              set("supabase", "complete");
              set("powersync_sync", "active");

              // Step 7: powersync_sync complete → published (500ms)
              setTimeout(() => {
                if (!mountedRef.current) return;
                set("powersync_sync", "complete");
                set("published", "active");
                setTimeout(() => {
                  if (!mountedRef.current) return;
                  set("published", "complete");
                  clearInterval(pollRef.current!);
                }, 400);
              }, 500);
            }, 600);
          }, 200);
        } else if (data.status === "failed") {
          clearInterval(pollRef.current!);
        } else if (data.status === "generating" && data.chapters_complete > 0 && !agentsComplete) {
          // At least one chapter done — agents partially complete
          // fal_images and deepgram_tts complete first (they're per-chapter)
          set("fal_images", "complete");
          set("deepgram_tts", "complete");
        }

        lastStatus = data.status;
      } catch {
        // Ignore fetch errors — keep polling
      }
    }, 2000);

    // Fallback: if API never returns complete after 45s, simulate completion
    delay(45000, () => {
      if (!agentsComplete) {
        agentsComplete = true;
        clearAll();
        set("story_gen", "complete");
        set("ogma_review", "complete");
        set("fal_images", "complete");
        set("deepgram_tts", "complete");
        setTimeout(() => {
          if (!mountedRef.current) return;
          set("supabase", "active");
          setTimeout(() => {
            if (!mountedRef.current) return;
            set("supabase", "complete");
            set("powersync_sync", "active");
            setTimeout(() => {
              if (!mountedRef.current) return;
              set("powersync_sync", "complete");
              set("published", "complete");
            }, 500);
          }, 700);
        }, 200);
      }
    });

    return clearAll;
  }, [storyId]);
}

// ── Standalone simulation (no API required) ────────────────────────────────────

/**
 * Runs the full pipeline animation purely on timers — no API needed.
 * Used in ?demo=1 mode for reliable screencasting.
 */
function useStandaloneSimulation(
  active: boolean,
  onStepsChange: (updater: (prev: PipelineSteps) => PipelineSteps) => void,
  onComplete: (fakeId: string) => void
) {
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    if (!active) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    const set = (id: StepId, state: StepState) => {
      if (mountedRef.current) onStepsChange((prev) => ({ ...prev, [id]: state }));
    };
    const after = (ms: number, fn: () => void) => {
      const t = setTimeout(() => { if (mountedRef.current) fn(); }, ms);
      timers.push(t);
    };

    set("powersync_write", "active");
    after(800,  () => { set("powersync_write", "complete"); set("mastra", "active"); });
    after(3500, () => { set("mastra", "complete"); set("story_gen", "active"); set("fal_images", "active"); set("deepgram_tts", "active"); });
    after(5000, () => { set("ogma_review", "active"); });
    after(12000, () => { set("fal_images", "complete"); set("deepgram_tts", "complete"); });
    after(17000, () => { set("story_gen", "complete"); set("ogma_review", "complete"); });
    after(17300, () => { set("supabase", "active"); });
    after(17900, () => { set("supabase", "complete"); set("powersync_sync", "active"); });
    after(18400, () => { set("powersync_sync", "complete"); set("published", "active"); });
    after(18800, () => { set("published", "complete"); onComplete("demo-sim-" + Date.now()); });

    return () => timers.forEach(clearTimeout);
  }, [active]);
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function PipelineDemoPage() {
  const [steps, setSteps] = useState<PipelineSteps>(INITIAL_STEPS);
  const [selectedGenre, setSelectedGenre] = useState(GENRES[0].value);
  const [theme, setTheme] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [storyId, setStoryId] = useState<string | null>(null);
  const [storyTitle, setStoryTitle] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState("");

  // Demo mode: ?demo=1 bypasses API, runs visual simulation only
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const demoMode = searchParams?.get("demo") === "1";

  // Simulation state for ?demo=1
  const [demoSimActive, setDemoSimActive] = useState(false);
  const [demoSimComplete, setDemoSimComplete] = useState(false);

  usePipelineSimulation(demoMode ? null : storyId, setSteps);

  useStandaloneSimulation(
    demoSimActive,
    setSteps,
    (fakeId) => {
      setStoryId(fakeId);
      setDemoSimComplete(true);
      setSubmitting(false);
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setStoryId(null);
    setStoryTitle(null);
    setSteps({ ...INITIAL_STEPS, user_input: "active" });

    // Demo mode: skip API, run visual simulation
    if (demoMode) {
      await new Promise((r) => setTimeout(r, 400));
      setSteps((prev) => ({ ...prev, user_input: "complete" }));
      setDemoSimActive(true);
      setStatusMsg("Story submitted — watching pipeline...");
      return;
    }

    try {
      const apiUrl =
        (import.meta.env as any).VITE_API_URL || "http://localhost:3002";

      // Briefly show user_input as active
      await new Promise((r) => setTimeout(r, 400));
      setSteps((prev) => ({ ...prev, user_input: "complete" }));

      // Build a natural language request from genre + theme
      const genreLabel = GENRES.find((g) => g.value === selectedGenre)?.label ?? selectedGenre;
      const userRequest = theme
        ? `Write a ${genreLabel} story about: ${theme}`
        : `Write a ${genreLabel} Caribbean folklore story`;

      const response = await fetch(`${apiUrl}/stories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "demo-user",
          request: userRequest,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API ${response.status}: ${errText.slice(0, 100)}`);
      }

      const data = (await response.json()) as { id?: string; storyId?: string };
      const id = data.id || data.storyId;
      if (!id) throw new Error("No story ID returned from API");

      setStoryId(id);
      setStatusMsg("Story submitted — watching pipeline...");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit story"
      );
      setSteps(INITIAL_STEPS);
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSteps(INITIAL_STEPS);
    setStoryId(null);
    setStoryTitle(null);
    setSubmitting(false);
    setError("");
    setStatusMsg("");
    setDemoSimActive(false);
    setDemoSimComplete(false);
  };

  const isRunning = (storyId !== null || demoSimActive) && steps.published !== "complete";
  const isComplete = steps.published === "complete";

  const currentProgress = progressLabel(steps, statusMsg);

  return (
    <div className="min-h-[calc(100vh-80px)]">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-amber-100">
          🔗 SandSync Pipeline
        </h1>
        <p className="text-sm text-amber-200/50 mt-1">
          Watch how PowerSync, Mastra, fal.ai, Deepgram, and Supabase all
          connect — live.
        </p>
      </div>

      {/* 2-column split */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── LEFT: Story Form (2/5) ─────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700/50 p-5">
            <h2 className="text-base font-semibold text-amber-100 mb-4">
              Submit a Story
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-rose-500/10 border border-rose-400/40 rounded-lg px-3 py-2 text-xs text-rose-200">
                  {error}
                </div>
              )}

              {/* Genre pills */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-amber-200/70">
                  Folklore type
                </label>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      disabled={submitting}
                      onClick={() => setSelectedGenre(g.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        selectedGenre === g.value
                          ? "bg-amber-100 text-indigo-950 shadow-md shadow-amber-400/20"
                          : "bg-slate-700/50 text-amber-100/70 border border-slate-600/40 hover:border-amber-400/40"
                      }`}
                    >
                      {g.emoji} {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-amber-200/70">
                  Story theme
                  <span className="text-amber-200/30 font-normal ml-1">
                    (optional)
                  </span>
                </label>
                <textarea
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  disabled={submitting}
                  placeholder="A young hunter who discovers the forest spirit's secret..."
                  className="w-full bg-slate-700/40 border border-slate-600/40 text-amber-100 placeholder-amber-200/25 rounded-lg px-3 py-2 text-xs resize-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/30 transition-all min-h-[80px]"
                  maxLength={200}
                />
              </div>

              {/* Submit / Reset */}
              {!isComplete && !isRunning ? (
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-amber-100 text-indigo-950 hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold rounded-lg px-4 py-3 text-sm transition-all"
                >
                  {submitting && !storyId ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin">⌛</span> Submitting...
                    </span>
                  ) : (
                    "▶ Run Pipeline"
                  )}
                </button>
              ) : (
                <div className="space-y-2">
                  {isComplete && storyId && (
                    <a
                      href={`/stories/${storyId}`}
                      className="block w-full text-center bg-green-500/20 border border-green-400/50 text-green-100 hover:bg-green-500/30 font-semibold rounded-lg px-4 py-3 text-sm transition-all"
                    >
                      📖 View Story →
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full bg-slate-700/50 border border-slate-600/40 text-amber-200/70 hover:border-amber-400/40 font-medium rounded-lg px-4 py-2.5 text-sm transition-all"
                  >
                    ↺ Run Again
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Tech stack legend */}
          <div className="bg-slate-800/30 rounded-xl border border-slate-700/30 p-4 space-y-2">
            <h3 className="text-xs font-semibold text-amber-200/50 uppercase tracking-wider">
              Stack
            </h3>
            {[
              { icon: "⚡", name: "PowerSync", desc: "Offline-first sync layer" },
              { icon: "🤖", name: "Mastra", desc: "AI agent orchestration" },
              { icon: "🕷️", name: "Claude Haiku", desc: "Story + review agents" },
              { icon: "🎨", name: "fal.ai FLUX", desc: "Chapter illustrations" },
              { icon: "🎤", name: "Deepgram", desc: "Voice narration (TTS)" },
              { icon: "🗄️", name: "Supabase", desc: "Postgres + real-time" },
            ].map((t) => (
              <div key={t.name} className="flex items-center gap-2.5">
                <span className="text-sm">{t.icon}</span>
                <div>
                  <span className="text-xs font-medium text-amber-100/80">
                    {t.name}
                  </span>
                  <span className="text-amber-200/35 text-[10px] ml-1.5">
                    {t.desc}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Pipeline Visualisation (3/5) ──────────────────────── */}
        <div className="lg:col-span-3">
          <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700/50 p-5 space-y-1">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-amber-100">
                Live Pipeline
              </h2>
              {isRunning && (
                <span className="text-xs text-amber-400 animate-pulse flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                  Running
                </span>
              )}
              {isComplete && (
                <span className="text-xs text-green-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  Complete
                </span>
              )}
            </div>

            {/* Node: User Input */}
            <PipelineNode
              id="user_input"
              icon="✍️"
              label="User Story Input"
              sub="Caribbean folklore prompt — genre + theme"
              steps={steps}
            />

            <PipelineArrow from="user_input" to="powersync_write" steps={steps} />

            {/* Node: PowerSync Write */}
            <PipelineNode
              id="powersync_write"
              icon="⚡"
              label="PowerSync Client Write"
              sub="Local SQLite write — offline-first, zero-latency"
              steps={steps}
            />

            <PipelineArrow from="powersync_write" to="mastra" steps={steps} />

            {/* Node: Mastra Orchestrator */}
            <PipelineNode
              id="mastra"
              icon="🤖"
              label="Mastra Orchestrator"
              sub="Papa Bois agent parses request → story brief"
              steps={steps}
            />

            <PipelineArrow from="mastra" to="story_gen" steps={steps} />

            {/* ── Parallel agents row ─────────────────────────────── */}
            <div className="rounded-xl border border-slate-600/30 bg-slate-900/30 p-2.5 space-y-2">
              <p className="text-[9px] text-amber-200/30 uppercase tracking-widest font-semibold ml-1">
                Parallel Agents
              </p>

              {/* Row 1: Story Gen + fal.ai + Deepgram */}
              <div className="grid grid-cols-3 gap-2">
                <PipelineNode
                  id="story_gen"
                  icon="🕷️"
                  label="Story Generator"
                  sub="Anansi (Claude Haiku)"
                  steps={steps}
                />
                <PipelineNode
                  id="fal_images"
                  icon="🎨"
                  label="fal.ai Images"
                  sub="FLUX illustrations"
                  steps={steps}
                />
                <PipelineNode
                  id="deepgram_tts"
                  icon="🎤"
                  label="Deepgram TTS"
                  sub="Voice narration"
                  steps={steps}
                />
              </div>

              {/* Row 2: Ogma Review (under Story Gen) */}
              <div className="grid grid-cols-3 gap-2">
                <PipelineNode
                  id="ogma_review"
                  icon="📜"
                  label="Ogma Review"
                  sub="LLM-as-judge quality gate"
                  steps={steps}
                />
                <div className="col-span-2" /> {/* spacer */}
              </div>
            </div>

            {/* Arrow from parallel block to supabase */}
            <div className="flex items-center justify-center py-0.5">
              <div
                className={`w-0.5 h-4 rounded transition-colors duration-500 ${
                  (steps.story_gen === "complete" || steps.ogma_review === "complete") &&
                  (steps.supabase === "active" || steps.supabase === "complete")
                    ? "bg-amber-400"
                    : "bg-slate-600/40"
                }`}
              />
            </div>

            {/* Node: Supabase */}
            <PipelineNode
              id="supabase"
              icon="🗄️"
              label="Supabase"
              sub="Persist chapters + broadcast real-time events"
              steps={steps}
            />

            <PipelineArrow from="supabase" to="powersync_sync" steps={steps} />

            {/* Node: PowerSync Sync */}
            <PipelineNode
              id="powersync_sync"
              icon="🔄"
              label="PowerSync Sync"
              sub="Push delta to all connected clients"
              steps={steps}
            />

            <PipelineArrow from="powersync_sync" to="published" steps={steps} />

            {/* Node: Published */}
            <PipelineNode
              id="published"
              icon="✅"
              label="Story Published"
              sub="Synced to every device — offline readers included"
              steps={steps}
            />

            {/* Progress footer */}
            <div className="pt-3 mt-2 border-t border-slate-700/40">
              <p
                className={`text-xs transition-colors duration-500 ${
                  isComplete ? "text-green-300" : isRunning ? "text-amber-300" : "text-amber-200/40"
                }`}
              >
                {currentProgress}
              </p>
              {storyId && (
                <p className="text-[10px] text-amber-200/20 mt-0.5 font-mono">
                  story:{storyId.slice(0, 8)}…
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

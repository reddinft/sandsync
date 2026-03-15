/**
 * SandSync Pipeline Demo — /pipeline-demo
 *
 * Split-screen view: Left = story form (type or speak), Right = live pipeline visualisation.
 * Nodes light amber when active (pulse + glow) and green when complete.
 * Arrows light up as upstream steps complete.
 *
 * Wired to real API — polls /stories/:id/status for updates.
 * Falls back to realistic timing simulation if the story is still generating.
 *
 * Voice mode: MediaRecorder → POST /stories/transcribe (Deepgram STT) → approval → POST /stories/voice
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";

export const Route = createFileRoute("/pipeline-demo")({
  component: PipelineDemoPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type StepId =
  | "user_input"
  | "deepgram_stt"      // STT phase (voice mode only, shown as pre-step)
  | "powersync_write"
  | "mastra"
  | "papa_bois"         // brief generation
  | "story_gen"         // anansi
  | "ogma_review"
  | "elevenlabs"        // ElevenLabs TTS narration (primary), Deepgram TTS fallback
  | "fal_images"
  | "supabase"
  | "powersync_sync"
  | "published";

type StepState = "idle" | "active" | "complete" | "skipped";
type PipelineSteps = Record<StepId, StepState>;

const INITIAL_STEPS: PipelineSteps = {
  user_input: "idle",
  deepgram_stt: "idle",
  powersync_write: "idle",
  mastra: "idle",
  papa_bois: "idle",
  story_gen: "idle",
  ogma_review: "idle",
  elevenlabs: "idle",
  fal_images: "idle",
  supabase: "idle",
  powersync_sync: "idle",
  published: "idle",
};

type InputMode = "type" | "speak";
type VoiceState = "idle" | "recording" | "transcribing" | "review" | "confirmed";

interface TranscriptReview {
  transcript: string;
  confidence: number;
  duration_ms: number;
  audioBlob: Blob;
}

interface StoryPreview {
  id: string;
  title: string;
  genre: string;
  first_chapter: {
    content: string;
    image_url: string | null;
    audio_url: string | null;
  } | null;
}

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

// ── Progress Label ─────────────────────────────────────────────────────────────

function progressLabel(steps: PipelineSteps, currentStepMsg: string): string {
  if (steps.published === "complete") return "✅ Story published — syncing to all clients";
  if (steps.powersync_sync === "active") return "⚡ PowerSync broadcasting to all devices...";
  if (steps.supabase === "active") return "💾 Persisting to Supabase + broadcasting real-time...";
  if (steps.supabase === "complete") return "📡 Handing off to PowerSync sync layer...";
  if (steps.elevenlabs === "active" || steps.fal_images === "active")
    return "🎨 Parallel: ElevenLabs narrating + fal.ai generating images...";
  if (steps.ogma_review === "active") return "📜 Ogma reviewing cultural authenticity...";
  if (steps.story_gen === "active") return "🕷️ Anansi writing the story...";
  if (steps.papa_bois === "active") return "🌳 Papa Bois crafting the story brief...";
  if (steps.mastra === "active") return "🤖 Mastra orchestrating the agent pipeline...";
  if (steps.powersync_write === "active") return "⚡ PowerSync capturing local write (offline-first)...";
  if (steps.powersync_write === "complete") return "✅ Local write committed — starting cloud pipeline...";
  if (currentStepMsg) return currentStepMsg;
  return "Enter a story prompt to see the pipeline run live →";
}

// ── Simulation helpers ─────────────────────────────────────────────────────────

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

  useEffect(() => {
    if (!storyId) return;
    clearAll();

    const apiUrl =
      (import.meta.env as any).VITE_API_URL || "http://localhost:3002";

    // powersync_write active immediately (0ms)
    set("powersync_write", "active");

    // powersync_write complete → mastra active (800ms)
    delay(800, () => {
      set("powersync_write", "complete");
      set("mastra", "active");
    });

    // mastra complete → papa_bois active (2s)
    delay(2000, () => {
      set("mastra", "complete");
      set("papa_bois", "active");
    });

    // papa_bois complete → story_gen active (5s)
    delay(5000, () => {
      set("papa_bois", "complete");
      set("story_gen", "active");
    });

    // ogma_review kicks in during story_gen (7s)
    delay(7000, () => {
      set("ogma_review", "active");
    });

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

          set("story_gen", "complete");
          set("ogma_review", "complete");

          // After Ogma approves: parallel elevenlabs + fal_images (15-19s range)
          setTimeout(() => {
            if (!mountedRef.current) return;
            set("elevenlabs", "active");
            set("fal_images", "active");

            setTimeout(() => {
              if (!mountedRef.current) return;
              set("elevenlabs", "complete");
              set("fal_images", "complete");

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
                    set("published", "active");
                    setTimeout(() => {
                      if (!mountedRef.current) return;
                      set("published", "complete");
                      clearInterval(pollRef.current!);
                    }, 400);
                  }, 500);
                }, 600);
              }, 200);
            }, 3000);
          }, 200);
        } else if (data.status === "failed") {
          clearInterval(pollRef.current!);
        } else if (data.status === "generating" && data.chapters_complete > 0 && !agentsComplete) {
          set("fal_images", "complete");
        }
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
        set("elevenlabs", "active");
        set("fal_images", "active");
        setTimeout(() => {
          if (!mountedRef.current) return;
          set("elevenlabs", "complete");
          set("fal_images", "complete");
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
          }, 3000);
        }, 200);
      }
    });

    return clearAll;
  }, [storyId]);
}

// ── Standalone simulation (no API required) ────────────────────────────────────

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
    after(800,   () => { set("powersync_write", "complete"); set("mastra", "active"); });
    after(2000,  () => { set("mastra", "complete"); set("papa_bois", "active"); });
    after(5000,  () => { set("papa_bois", "complete"); set("story_gen", "active"); });
    after(7000,  () => { set("ogma_review", "active"); });
    after(15000, () => { set("story_gen", "complete"); set("ogma_review", "complete"); set("elevenlabs", "active"); set("fal_images", "active"); });
    after(19000, () => { set("elevenlabs", "complete"); set("fal_images", "complete"); });
    after(19300, () => { set("supabase", "active"); });
    after(20000, () => { set("supabase", "complete"); set("powersync_sync", "active"); });
    after(21000, () => { set("powersync_sync", "complete"); set("published", "active"); });
    after(21500, () => { set("published", "complete"); onComplete("demo-sim-" + Date.now()); });

    return () => timers.forEach(clearTimeout);
  }, [active]);
}

// ── Voice Recording Hook ───────────────────────────────────────────────────────

function useVoiceRecorder() {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcriptReview, setTranscriptReview] = useState<TranscriptReview | null>(null);
  const [voiceError, setVoiceError] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRecording = async (apiUrl: string) => {
    setVoiceError("");
    setTranscriptReview(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        stopTimer();
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setVoiceState("transcribing");
        try {
          const fd = new FormData();
          fd.append("audio", blob, "recording.webm");
          const res = await fetch(`${apiUrl}/stories/transcribe`, { method: "POST", body: fd });
          if (!res.ok) throw new Error(`Transcription failed (${res.status})`);
          const data = await res.json() as { transcript: string; confidence: number; duration_ms: number };
          setTranscriptReview({ ...data, audioBlob: blob });
          setVoiceState("review");
        } catch (err) {
          setVoiceError(err instanceof Error ? err.message : "Transcription failed");
          setVoiceState("idle");
        }
      };
      mediaRecorderRef.current = mr;
      mr.start();
      startTimeRef.current = Date.now();
      setRecordingSeconds(0);
      setVoiceState("recording");
      timerRef.current = setInterval(() => {
        setRecordingSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Mic permission denied";
      setVoiceError(msg.includes("Permission") || msg.includes("denied") ? "Microphone permission denied. Please allow mic access and try again." : msg);
      setVoiceState("idle");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    stopTimer();
  };

  const reset = () => {
    stopRecording();
    setVoiceState("idle");
    setRecordingSeconds(0);
    setTranscriptReview(null);
    setVoiceError("");
  };

  return { voiceState, recordingSeconds, transcriptReview, voiceError, startRecording, stopRecording, reset, setTranscriptReview };
}

// ── Story Preview Component ────────────────────────────────────────────────────

function StoryPreviewPanel({ storyId }: { storyId: string }) {
  const [preview, setPreview] = useState<StoryPreview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiUrl = (import.meta.env as any).VITE_API_URL || "http://localhost:3002";
    fetch(`${apiUrl}/stories/${storyId}/preview`)
      .then((r) => r.json())
      .then((d) => setPreview(d as StoryPreview))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [storyId]);

  if (loading) {
    return (
      <div className="mt-6 bg-slate-800/40 rounded-2xl border border-slate-700/40 p-5 animate-pulse">
        <div className="h-4 bg-slate-700/50 rounded w-1/3 mb-3" />
        <div className="h-3 bg-slate-700/50 rounded w-2/3 mb-2" />
        <div className="h-3 bg-slate-700/50 rounded w-1/2" />
      </div>
    );
  }

  if (!preview) return null;

  return (
    <div className="mt-6 bg-slate-800/40 backdrop-blur-lg rounded-2xl border border-green-500/30 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-amber-100">{preview.title}</h3>
          <p className="text-xs text-amber-200/50 mt-0.5 capitalize">{preview.genre}</p>
        </div>
        <a
          href={`/stories/${preview.id}`}
          className="flex-shrink-0 bg-amber-100 text-indigo-950 hover:bg-amber-200 font-semibold rounded-lg px-3 py-1.5 text-xs transition-all"
        >
          📖 Read Full Story →
        </a>
      </div>
      {preview.first_chapter?.image_url && (
        <img
          src={preview.first_chapter.image_url}
          alt="Chapter illustration"
          className="w-full rounded-xl object-cover max-h-48"
        />
      )}
      {preview.first_chapter?.content && (
        <p className="text-sm text-amber-100/70 leading-relaxed line-clamp-4">
          {preview.first_chapter.content}
          {preview.first_chapter.content.length >= 300 && "…"}
        </p>
      )}
      {preview.first_chapter?.audio_url && (
        <audio controls src={preview.first_chapter.audio_url} className="w-full h-8" />
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function PipelineDemoPage() {
  const [steps, setSteps] = useState<PipelineSteps>(INITIAL_STEPS);
  const [selectedGenre, setSelectedGenre] = useState(GENRES[0].value);
  const [theme, setTheme] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [storyId, setStoryId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("type");

  // Demo mode: ?demo=1 bypasses API, runs visual simulation only
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const demoMode = searchParams?.get("demo") === "1";

  // Simulation state for ?demo=1
  const [demoSimActive, setDemoSimActive] = useState(false);
  const [demoSimComplete, setDemoSimComplete] = useState(false);

  const voice = useVoiceRecorder();

  const apiUrl = (import.meta.env as any).VITE_API_URL || "http://localhost:3002";

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

  const startPipeline = async (request: string) => {
    setSubmitting(true);
    setError("");
    setStoryId(null);
    setSteps({ ...INITIAL_STEPS, user_input: "active" });

    if (demoMode) {
      await new Promise((r) => setTimeout(r, 400));
      setSteps((prev) => ({ ...prev, user_input: "complete" }));
      setDemoSimActive(true);
      setStatusMsg("Story submitted — watching pipeline...");
      return;
    }

    try {
      await new Promise((r) => setTimeout(r, 400));
      setSteps((prev) => ({ ...prev, user_input: "complete" }));

      const response = await fetch(`${apiUrl}/stories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "demo-user", request }),
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
      setError(err instanceof Error ? err.message : "Failed to submit story");
      setSteps(INITIAL_STEPS);
      setSubmitting(false);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const genreLabel = GENRES.find((g) => g.value === selectedGenre)?.label ?? selectedGenre;
    const userRequest = theme
      ? `Write a ${genreLabel} story about: ${theme}`
      : `Write a ${genreLabel} Caribbean folklore story`;
    await startPipeline(userRequest);
  };

  const handleVoiceConfirm = async () => {
    if (!voice.transcriptReview) return;

    setSubmitting(true);
    setError("");
    setStoryId(null);
    setSteps({ ...INITIAL_STEPS, user_input: "active", deepgram_stt: "complete" });

    if (demoMode) {
      await new Promise((r) => setTimeout(r, 400));
      setSteps((prev) => ({ ...prev, user_input: "complete" }));
      setDemoSimActive(true);
      setStatusMsg("Voice story submitted — watching pipeline...");
      return;
    }

    try {
      await new Promise((r) => setTimeout(r, 400));
      setSteps((prev) => ({ ...prev, user_input: "complete" }));

      const fd = new FormData();
      fd.append("userId", "demo-user");
      fd.append("audio", voice.transcriptReview.audioBlob, "recording.webm");

      const response = await fetch(`${apiUrl}/stories/voice`, { method: "POST", body: fd });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API ${response.status}: ${errText.slice(0, 100)}`);
      }

      const data = (await response.json()) as { storyId?: string };
      if (!data.storyId) throw new Error("No story ID returned from API");

      setStoryId(data.storyId);
      setStatusMsg("Story submitted — watching pipeline...");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit voice story");
      setSteps(INITIAL_STEPS);
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSteps(INITIAL_STEPS);
    setStoryId(null);
    setSubmitting(false);
    setError("");
    setStatusMsg("");
    setDemoSimActive(false);
    setDemoSimComplete(false);
    voice.reset();
  };

  const isRunning = (storyId !== null || demoSimActive) && steps.published !== "complete";
  const isComplete = steps.published === "complete";
  const voiceUsed = steps.deepgram_stt !== "idle";

  const currentProgress = progressLabel(steps, statusMsg);

  return (
    <div className="min-h-[calc(100vh-80px)]">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-amber-100">
          🔗 SandSync Pipeline
        </h1>
        <p className="text-sm text-amber-200/50 mt-1">
          Watch how PowerSync, Mastra, fal.ai, ElevenLabs, Deepgram, and Supabase all
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

            {/* Mode toggle */}
            {!isRunning && !isComplete && (
              <div className="flex gap-1 mb-4 bg-slate-700/40 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => { setInputMode("type"); voice.reset(); }}
                  className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
                    inputMode === "type"
                      ? "bg-amber-100 text-indigo-950"
                      : "text-amber-200/60 hover:text-amber-100"
                  }`}
                >
                  ✍️ Type
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("speak")}
                  className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
                    inputMode === "speak"
                      ? "bg-amber-100 text-indigo-950"
                      : "text-amber-200/60 hover:text-amber-100"
                  }`}
                >
                  🎤 Speak
                </button>
              </div>
            )}

            {error && (
              <div className="bg-rose-500/10 border border-rose-400/40 rounded-lg px-3 py-2 text-xs text-rose-200 mb-4">
                {error}
              </div>
            )}

            {/* ── TYPE MODE ── */}
            {(inputMode === "type" || isRunning || isComplete) && inputMode !== "speak" && (
              <form onSubmit={handleTextSubmit} className="space-y-4">
                {/* Genre pills */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-amber-200/70">Folklore type</label>
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
                    <span className="text-amber-200/30 font-normal ml-1">(optional)</span>
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
                    {isComplete && storyId && !storyId.startsWith("demo-") && (
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
            )}

            {/* ── SPEAK MODE ── */}
            {inputMode === "speak" && !isRunning && !isComplete && (
              <div className="space-y-4">
                {/* Genre pills */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-amber-200/70">Folklore type</label>
                  <div className="flex flex-wrap gap-2">
                    {GENRES.map((g) => (
                      <button
                        key={g.value}
                        type="button"
                        disabled={voice.voiceState !== "idle"}
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

                {voice.voiceError && (
                  <div className="bg-rose-500/10 border border-rose-400/40 rounded-lg px-3 py-2 text-xs text-rose-200">
                    {voice.voiceError}
                  </div>
                )}

                {/* Idle or Recording state */}
                {(voice.voiceState === "idle" || voice.voiceState === "recording") && (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <button
                      type="button"
                      onClick={() =>
                        voice.voiceState === "idle"
                          ? voice.startRecording(apiUrl)
                          : voice.stopRecording()
                      }
                      className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all font-medium shadow-lg ${
                        voice.voiceState === "recording"
                          ? "bg-rose-500 hover:bg-rose-400 shadow-rose-500/40 animate-pulse scale-110"
                          : "bg-amber-100 hover:bg-amber-200 text-indigo-950 shadow-amber-400/20"
                      }`}
                    >
                      {voice.voiceState === "recording" ? "⏹" : "🎤"}
                    </button>
                    {voice.voiceState === "recording" ? (
                      <p className="text-xs text-rose-300 font-medium">
                        Recording... {Math.floor(voice.recordingSeconds / 60)}:{String(voice.recordingSeconds % 60).padStart(2, "0")}
                      </p>
                    ) : (
                      <p className="text-xs text-amber-200/50">Click to start recording</p>
                    )}
                  </div>
                )}

                {/* Transcribing state */}
                {voice.voiceState === "transcribing" && (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center text-2xl animate-spin">
                      ⌛
                    </div>
                    <p className="text-xs text-amber-300">Deepgram transcribing your audio...</p>
                  </div>
                )}

                {/* Review state */}
                {voice.voiceState === "review" && voice.transcriptReview && (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-amber-200/70">📝 Deepgram heard:</label>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          voice.transcriptReview.confidence > 0.85
                            ? "bg-green-500/20 text-green-300"
                            : voice.transcriptReview.confidence > 0.6
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-rose-500/20 text-rose-300"
                        }`}>
                          {Math.round(voice.transcriptReview.confidence * 100)}% confidence
                        </span>
                      </div>
                      <textarea
                        value={voice.transcriptReview.transcript}
                        onChange={(e) =>
                          voice.setTranscriptReview({ ...voice.transcriptReview!, transcript: e.target.value })
                        }
                        className="w-full bg-slate-700/40 border border-amber-400/30 text-amber-100 rounded-lg px-3 py-2 text-xs resize-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/30 transition-all min-h-[70px]"
                      />
                      <p className="text-[10px] text-amber-200/30 mt-1">
                        {voice.transcriptReview.duration_ms > 0
                          ? `${(voice.transcriptReview.duration_ms / 1000).toFixed(1)}s audio`
                          : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleVoiceConfirm}
                        disabled={submitting}
                        className="flex-1 bg-green-500/20 border border-green-400/50 text-green-100 hover:bg-green-500/30 font-medium rounded-lg px-3 py-2 text-xs transition-all disabled:opacity-50"
                      >
                        ✅ Use this
                      </button>
                      <button
                        type="button"
                        onClick={() => voice.reset()}
                        className="flex-1 bg-slate-700/50 border border-slate-600/40 text-amber-200/70 hover:border-amber-400/40 font-medium rounded-lg px-3 py-2 text-xs transition-all"
                      >
                        🔄 Re-record
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
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
              { icon: "🎤", name: "Deepgram", desc: "Speech-to-text (STT input)" },
              { icon: "🔊", name: "ElevenLabs", desc: "Voice narration (TTS output)" },
              { icon: "🗄️", name: "Supabase", desc: "Postgres + real-time" },
            ].map((t) => (
              <div key={t.name} className="flex items-center gap-2.5">
                <span className="text-sm">{t.icon}</span>
                <div>
                  <span className="text-xs font-medium text-amber-100/80">{t.name}</span>
                  <span className="text-amber-200/35 text-[10px] ml-1.5">{t.desc}</span>
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

            {/* Pre-step: Deepgram STT (voice mode only) */}
            {voiceUsed && (
              <>
                <PipelineNode
                  id="deepgram_stt"
                  icon="🎤"
                  label="Deepgram STT"
                  sub="Transcribes spoken request → text (voice mode)"
                  steps={steps}
                />
                <PipelineArrow from="deepgram_stt" to="user_input" steps={steps} />
              </>
            )}

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
              sub="Kicks off multi-agent story pipeline"
              steps={steps}
            />

            <PipelineArrow from="mastra" to="papa_bois" steps={steps} />

            {/* Node: Papa Bois */}
            <PipelineNode
              id="papa_bois"
              icon="🌳"
              label="Papa Bois"
              sub="Brief generation — chapter plan + folklore context"
              steps={steps}
            />

            <PipelineArrow from="papa_bois" to="story_gen" steps={steps} />

            {/* ── Per-chapter loop ─────────────────────────────── */}
            <div className="rounded-xl border border-slate-600/30 bg-slate-900/30 p-2.5 space-y-2">
              <p className="text-[9px] text-amber-200/30 uppercase tracking-widest font-semibold ml-1">
                Per Chapter Loop
              </p>

              {/* Story Gen ⟷ Ogma review cycle */}
              <div className="grid grid-cols-2 gap-2">
                <PipelineNode
                  id="story_gen"
                  icon="🕷️"
                  label="Anansi"
                  sub="Story writer (Claude Haiku)"
                  steps={steps}
                />
                <PipelineNode
                  id="ogma_review"
                  icon="📜"
                  label="Ogma"
                  sub="LLM-as-judge · up to 3 revisions"
                  steps={steps}
                />
              </div>

              {/* Arrow down from Ogma approval to parallel block */}
              <div className="flex items-center justify-center py-0.5">
                <div className={`w-0.5 h-4 rounded transition-colors duration-500 ${
                  steps.ogma_review === "complete" && (steps.elevenlabs === "active" || steps.elevenlabs === "complete")
                    ? "bg-amber-400" : "bg-slate-600/40"
                }`} />
              </div>

              {/* Parallel: ElevenLabs + fal.ai (after Ogma approves) */}
              <div className="rounded-lg border border-slate-600/20 bg-slate-800/20 p-2 space-y-1.5">
                <p className="text-[9px] text-amber-200/20 uppercase tracking-widest font-semibold ml-1">
                  Parallel (post-approval)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <PipelineNode
                    id="elevenlabs"
                    icon="🔊"
                    label="ElevenLabs"
                    sub="Voice narration TTS (Devi agent)"
                    steps={steps}
                  />
                  <PipelineNode
                    id="fal_images"
                    icon="🎨"
                    label="fal.ai FLUX"
                    sub="Chapter illustrations"
                    steps={steps}
                  />
                </div>
              </div>
            </div>

            {/* Arrow from parallel block to supabase */}
            <div className="flex items-center justify-center py-0.5">
              <div
                className={`w-0.5 h-4 rounded transition-colors duration-500 ${
                  (steps.elevenlabs === "complete" || steps.fal_images === "complete") &&
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

          {/* Story Preview Panel (after completion) */}
          {isComplete && storyId && !storyId.startsWith("demo-") && (
            <StoryPreviewPanel storyId={storyId} />
          )}
        </div>
      </div>
    </div>
  );
}

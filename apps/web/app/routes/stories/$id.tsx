import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, usePowerSyncStatus } from "@powersync/react";
import { Story, StoryChapter } from "../../lib/powersync";
import { AudioPlayer } from "../../components/AudioPlayer";

export const Route = createFileRoute("/stories/$id")({
  component: StoryReaderPage,
});

const AGENT_COLORS: Record<string, string> = {
  papa_bois: "bg-slate-800/50",
  anansi: "bg-slate-800/50",
  ogma: "bg-slate-800/50",
  devi: "bg-slate-800/50",
  imagen: "bg-slate-800/50",
};

const AGENT_ICONS: Record<string, string> = {
  papa_bois: "🌳",
  anansi: "🕷️",
  ogma: "📜",
  devi: "🎵",
  imagen: "🎨",
};

const AGENT_LABELS: Record<string, string> = {
  papa_bois: "Papa Bois",
  anansi: "Anansi",
  ogma: "Ogma",
  devi: "Devi",
  imagen: "Imagen",
};

function StoryReaderPage() {
  const { id } = Route.useParams();
  const syncStatus = usePowerSyncStatus();
  const { data: storyArray } = useQuery<Story>("SELECT * FROM stories WHERE id = ?", [id]);
  const { data: chapters } = useQuery<StoryChapter>("SELECT * FROM story_chapters WHERE story_id = ? ORDER BY chapter_number", [id]);
  const { data: agentEvents } = useQuery<any>("SELECT * FROM agent_events WHERE story_id = ? ORDER BY created_at DESC", [id]);

  // Helper to convert relative audio URLs to absolute API URLs
  const getAudioUrl = (audioUrl: string | null) => {
    if (!audioUrl) return null;
    if (audioUrl.startsWith("http")) return audioUrl;
    const apiUrl = (import.meta.env as any).VITE_API_URL || "http://localhost:3002";
    return `${apiUrl}${audioUrl}`;
  };

  const story = storyArray && storyArray.length > 0 ? storyArray[0] : null;
  const [agentStatuses, setAgentStatuses] = useState<
    Record<string, { completed: boolean; latency?: number }>
  >({
    papa_bois: { completed: false },
    anansi: { completed: false },
    ogma: { completed: false },
    devi: { completed: false },
    imagen: { completed: false },
  });
  const [pollStatus, setPollStatus] = useState<{
    status?: string;
    chapters_complete?: number;
    total_chapters?: number;
  } | null>(null);

  // Poll /stories/:id/status every 2s when PowerSync is offline
  useEffect(() => {
    if (syncStatus.connected) return;
    const apiUrl = (import.meta.env as any).VITE_API_URL || "http://localhost:3002";
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`${apiUrl}/stories/${id}/status`);
        if (res.ok) {
          const data = await res.json();
          setPollStatus(data);
        }
      } catch {
        // ignore fetch errors while offline
      }
    }, 2000);
    return () => clearInterval(poll);
  }, [syncStatus.connected, id]);

  // Update agent statuses when events change
  useEffect(() => {
    if (agentEvents && agentEvents.length > 0) {
      const statuses = { ...agentStatuses };
      const processedAgents = new Set<string>();

      for (const event of agentEvents) {
        if (!processedAgents.has(event.agent)) {
          processedAgents.add(event.agent);
          const isCompleted = event.event_type === "completed";
          const payload = typeof event.payload === "string" ? (() => { try { return JSON.parse(event.payload); } catch { return {}; } })() : (event.payload ?? {});
          statuses[event.agent] = {
            completed: isCompleted,
            latency: payload?.latency_ms || payload?.duration_ms,
          };
        }
      }

      setAgentStatuses(statuses);
    }
  }, [agentEvents]);

  if (!story) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-5xl mb-4">📖</div>
        <p className="text-amber-400/60 text-lg font-medium mb-6">Story not found</p>
        <Link
          to="/"
          className="text-sm text-amber-500/70 hover:text-amber-400 transition-colors px-4 py-2 rounded-lg hover:bg-amber-900/20"
        >
          ← Back to stories
        </Link>
      </div>
    );
  }

  const isGenerating = (pollStatus?.status ?? story.status) !== "complete";
  const completedAgents = !syncStatus.connected && pollStatus
    ? (pollStatus.chapters_complete ?? 0)
    : Object.values(agentStatuses).filter(s => s.completed).length;
  const totalAgents = !syncStatus.connected && pollStatus
    ? (pollStatus.total_chapters ?? Object.keys(agentStatuses).length)
    : Object.keys(agentStatuses).length;

  return (
    <div className="max-w-4xl mx-auto space-y-8 md:space-y-12">
      {/* Story header section */}
      <header className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 gap-2">
            <h1 className="text-4xl md:text-5xl font-bold text-amber-100 leading-tight">
              {story.title}
            </h1>
            {isGenerating && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-amber-900/50 text-amber-400 px-3 py-1 rounded-full animate-pulse whitespace-nowrap">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                Generating
              </span>
            )}
          </div>
          <div className="text-amber-500/70 text-lg font-medium">{story.genre}</div>
        </div>

        {/* Sync status indicator */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/30 w-fit">
          <span
            className={`w-2 h-2 rounded-full transition-colors ${
              syncStatus.connected ? "bg-green-400" : "bg-yellow-400/60"
            }`}
          ></span>
          <span className="text-xs font-medium" style={{ color: syncStatus.connected ? "#a3e635" : "#facc15" }}>
            {syncStatus.connected
              ? "Synced • Online"
              : "Offline • Local cache"}
          </span>
        </div>
      </header>

      {/* Agent pipeline status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.entries(agentStatuses).map(([agent, status]) => (
          <div
            key={agent}
            className={`border rounded-lg px-4 py-3 backdrop-blur transition-all duration-300 ${
              status.completed
                ? "bg-green-500/20 border-green-400/60 shadow-green-400/30 shadow-lg"
                : "bg-amber-500/30 border-amber-400 shadow-amber-400/30 shadow-lg scale-105"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{AGENT_ICONS[agent]}</span>
                <span className="font-semibold text-amber-100 text-sm">
                  {AGENT_LABELS[agent]}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {status.completed ? (
                  <span className="text-xs font-medium text-green-400 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400"></span>
                    Done
                  </span>
                ) : (
                  <span className="text-xs font-medium text-amber-400 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                    Working
                  </span>
                )}
              </div>
            </div>
            {status.latency && (
              <div className="text-xs text-amber-200/60 mt-2">
                {(status.latency / 1000).toFixed(1)}s
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {isGenerating && (
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs text-amber-200/70">
            <span>Pipeline progress</span>
            <span>{completedAgents}/{totalAgents} agents completed</span>
          </div>
          <div className="w-full h-1.5 bg-slate-700/30 rounded-full overflow-hidden border border-amber-200/20">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500 ease-out"
              style={{ width: `${(completedAgents / totalAgents) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Chapters section */}
      {!chapters || chapters.length === 0 ? (
        <div className="bg-slate-800/50 backdrop-blur-lg rounded-xl px-6 py-12 text-center border border-amber-200/20">
          <div className="text-4xl mb-3">✍️</div>
          <p className="text-amber-100 font-medium">
            {isGenerating
              ? "Chapters are being written by Anansi..."
              : "No chapters yet"}
          </p>
          <p className="text-amber-200/60 text-sm mt-2">
            {isGenerating
              ? `${completedAgents} of ${totalAgents} agents have completed their work`
              : "Try requesting a new story"}
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {chapters.map((chapter, idx) => (
            <article key={chapter.id} className="scroll-mt-8" id={`chapter-${chapter.chapter_number}`}>
              {/* Chapter header */}
              <div className="mb-6 pb-4 border-b border-amber-200/20">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-400/60 mb-3">
                  <span className="text-xs font-semibold text-amber-100 uppercase tracking-widest">
                    Chapter {chapter.chapter_number}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-amber-100 leading-snug">
                  {chapter.title}
                </h2>
              </div>

              {/* Chapter illustration */}
              {chapter.image_url ? (
                <figure className="mb-8 rounded-xl overflow-hidden border border-amber-200/20 shadow-lg shadow-amber-900/30 bg-slate-800/50">
                  <img
                    src={chapter.image_url}
                    alt={`Illustration for ${chapter.title}`}
                    className="w-full h-auto object-cover"
                  />
                  {chapter.illustration_prompt && (
                    <figcaption className="px-4 py-2 text-xs text-amber-200/60 bg-slate-900/50 italic">
                      {chapter.illustration_prompt}
                    </figcaption>
                  )}
                </figure>
              ) : isGenerating ? (
                <div className="mb-8 rounded-xl overflow-hidden border border-amber-200/20 bg-slate-800/50 h-64">
                  {/* Loading skeleton */}
                  <div className="w-full h-full bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-[size:200%_100%] animate-[shimmer_2s_infinite]"></div>
                </div>
              ) : null}

              {/* Chapter content */}
              <div className="prose prose-amber prose-invert max-w-none">
                {chapter.content.split("\n\n").map((paragraph: string, i: number) => (
                  <p
                    key={i}
                    className="text-amber-100/85 leading-relaxed text-base md:text-lg mb-5 first:text-lg first:font-semibold first:text-amber-200"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Audio narration */}
              <div className="mt-8 pt-6 border-t border-amber-200/20">
                {chapter.audio_url ? (
                  <AudioPlayer src={getAudioUrl(chapter.audio_url)!} chapterTitle={chapter.title} />
                ) : (
                  <div className="bg-slate-800/60 backdrop-blur rounded-xl border border-amber-200/20 px-5 py-4 text-sm text-amber-200/70 flex items-center gap-3">
                    <span className="text-lg animate-pulse">🎵</span>
                    <span className="font-medium">Narration by Devi — processing audio...</span>
                  </div>
                )}
              </div>

              {/* Chapter divider */}
              {idx < chapters.length - 1 && (
                <div className="mt-10 flex justify-center">
                  <div className="text-amber-800/40 text-xl">❖</div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Footer with debug link */}
      <footer className="border-t border-amber-200/20 pt-8 mt-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <Link
            to="/"
            className="text-sm text-amber-200/70 hover:text-amber-100 transition-colors px-3 py-2 rounded-lg hover:bg-amber-500/10 w-fit"
          >
            ← Back to stories
          </Link>
          <Link
            to="/stories/$id/agents"
            params={{ id }}
            className="text-sm font-medium text-amber-200/70 hover:text-amber-100 transition-colors px-3 py-2 rounded-lg hover:bg-amber-500/10 flex items-center gap-2 w-fit"
          >
            <span>🔍</span>
            <span>View agent trace</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}

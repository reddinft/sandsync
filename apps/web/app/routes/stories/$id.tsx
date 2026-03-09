import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, usePowerSyncStatus } from "@powersync/react";
import { Story, StoryChapter } from "../../lib/powersync";

export const Route = createFileRoute("/stories/$id")({
  component: StoryReaderPage,
});

function StoryReaderPage() {
  const { id } = Route.useParams();
  const syncStatus = usePowerSyncStatus();
  const { data: storyArray } = useQuery<Story>("SELECT * FROM stories WHERE id = ?", [id]);
  const { data: chapters } = useQuery<StoryChapter>("SELECT * FROM story_chapters WHERE story_id = ? ORDER BY chapter_number", [id]);
  const { data: agentEvents } = useQuery<any>("SELECT * FROM agent_events WHERE story_id = ? ORDER BY created_at DESC", [id]);

  const story = storyArray && storyArray.length > 0 ? storyArray[0] : null;
  const [agentStatuses, setAgentStatuses] = useState<
    Record<string, { completed: boolean; latency?: number }>
  >({
    papa_bois: { completed: false },
    anansi: { completed: false },
    ogma: { completed: false },
    devi: { completed: false },
  });

  // Update agent statuses when events change
  useEffect(() => {
    if (agentEvents && agentEvents.length > 0) {
      const statuses = { ...agentStatuses };
      const processedAgents = new Set<string>();

      for (const event of agentEvents) {
        if (!processedAgents.has(event.agent)) {
          processedAgents.add(event.agent);
          const isCompleted = event.event_type === "completed";
          const payload = typeof event.payload === "string" ? JSON.parse(event.payload) : event.payload;
          statuses[event.agent] = {
            completed: isCompleted,
            latency: payload?.duration_ms,
          };
        }
      }

      setAgentStatuses(statuses);
    }
  }, [agentEvents]);

  if (!story) {
    return (
      <div className="text-center py-12">
        <p className="text-amber-400/60">Story not found</p>
        <Link
          to="/"
          className="text-sm text-amber-500/70 hover:text-amber-400 transition-colors mt-4"
        >
          ← Back to stories
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Story header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-amber-100">{story.title}</h1>
          {story.status !== "complete" && (
            <span className="text-xs bg-amber-900/50 text-amber-400 px-2 py-1 rounded-full animate-pulse">
              ⟳ Generating
            </span>
          )}
        </div>
        <div className="text-amber-400/60 text-sm">{story.genre}</div>

        {/* Offline indicator */}
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              syncStatus.connected
                ? "bg-green-400"
                : "bg-yellow-400/50"
            }`}
          ></span>
          <span
            className={
              syncStatus.connected
                ? "text-green-400/70"
                : "text-yellow-400/70"
            }
          >
            {syncStatus.connected
              ? "Syncing"
              : "🔌 Available offline — reading from local cache"}
          </span>
        </div>
      </div>

      {/* Agent status bar */}
      <div className="bg-amber-950/30 border border-amber-800/20 rounded-xl px-5 py-3">
        <div className="text-xs text-amber-400/60 mb-2">Agent Pipeline</div>
        <div className="flex items-center gap-4 text-sm">
          {Object.entries(agentStatuses).map(([agent, status]) => (
            <span
              key={agent}
              className={
                status.completed ? "text-green-400/80" : "text-amber-400/60"
              }
            >
              {agent === "papa_bois" && "🌳 Papa Bois"}
              {agent === "anansi" && "🕷️ Anansi"}
              {agent === "ogma" && "📜 Ogma"}
              {agent === "devi" && "🎵 Devi"}
              {status.completed ? " ✓" : " ⟳"}
            </span>
          ))}
        </div>
      </div>

      {/* Chapters */}
      {!chapters || chapters.length === 0 ? (
        <div className="bg-amber-950/30 border border-amber-800/20 rounded-xl px-5 py-4 text-center">
          <p className="text-amber-400/60 text-sm">
            Waiting for chapters to be generated...
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {chapters.map((chapter) => (
            <article key={chapter.id} className="space-y-4">
              <div className="border-l-2 border-amber-700/50 pl-4">
                <div className="text-xs text-amber-500/60 uppercase tracking-wider mb-1">
                  Chapter {chapter.chapter_number}
                </div>
                <h2 className="text-xl font-semibold text-amber-200">
                  {chapter.title}
                </h2>
              </div>

              <div className="prose prose-amber prose-invert max-w-none">
                {chapter.content.split("\n\n").map((paragraph: string, i: number) => (
                  <p key={i} className="text-amber-100/85 leading-relaxed mb-4">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Audio player */}
              {chapter.audio_url ? (
                <div className="bg-amber-950/50 rounded-lg px-4 py-3">
                  <audio controls className="w-full" src={chapter.audio_url}>
                    <track kind="captions" />
                  </audio>
                </div>
              ) : (
                <div className="bg-amber-950/30 border border-amber-800/20 rounded-lg px-4 py-3 text-sm text-amber-500/50 flex items-center gap-2">
                  <span>🎵</span>
                  <span>Audio narration — Devi is processing</span>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Debug link */}
      <div className="border-t border-amber-800/20 pt-4">
        <Link
          to="/stories/$id/agents"
          params={{ id }}
          className="text-sm text-amber-500/50 hover:text-amber-400 transition-colors"
        >
          🔍 View agent debug trace →
        </Link>
      </div>
    </div>
  );
}

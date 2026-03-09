"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { usePowerSync, usePowerSyncStatus } from "@powersync/react";
import { Story, StoryChapter } from "../lib/powersync";

export const Route = createFileRoute("/stories/$id")({
  component: StoryReaderPage,
});

function StoryReaderPage() {
  const { id } = Route.useParams();
  const db = usePowerSync();
  const syncStatus = usePowerSyncStatus();
  const [story, setStory] = useState<Story | null>(null);
  const [chapters, setChapters] = useState<StoryChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentStatuses, setAgentStatuses] = useState<
    Record<string, { completed: boolean; latency?: number }>
  >({
    papa_bois: { completed: false },
    anansi: { completed: false },
    ogma: { completed: false },
    devi: { completed: false },
  });

  // Load story metadata
  useEffect(() => {
    const loadStory = async () => {
      try {
        const result = await db.getOptional(
          "SELECT * FROM stories WHERE id = ?",
          [id]
        );
        setStory(result as Story | null);
      } catch (err) {
        console.error("Failed to load story:", err);
      }
    };

    loadStory();
  }, [db, id]);

  // Load and watch chapters
  useEffect(() => {
    const loadChapters = async () => {
      try {
        const results = await db.getAll(
          "SELECT * FROM story_chapters WHERE story_id = ? ORDER BY chapter_number",
          [id]
        );
        setChapters(results as StoryChapter[]);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load chapters:", err);
        setLoading(false);
      }
    };

    loadChapters();

    // Watch for changes in chapters
    const unsubscribe = db.watch(
      "SELECT * FROM story_chapters WHERE story_id = ? ORDER BY chapter_number",
      [id],
      (updated) => {
        setChapters(updated as StoryChapter[]);
      }
    );

    return () => unsubscribe();
  }, [db, id]);

  // Load and watch agent events to update status
  useEffect(() => {
    const loadAgentEvents = async () => {
      try {
        const results = await db.getAll(
          "SELECT * FROM agent_events WHERE story_id = ? ORDER BY created_at DESC",
          [id]
        );

        // Build status map from latest event per agent
        const statuses = { ...agentStatuses };
        const processedAgents = new Set<string>();

        for (const event of results as any[]) {
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
      } catch (err) {
        console.error("Failed to load agent events:", err);
      }
    };

    loadAgentEvents();

    // Watch for changes in agent events
    const unsubscribe = db.watch(
      "SELECT * FROM agent_events WHERE story_id = ? ORDER BY created_at DESC",
      [id],
      () => {
        loadAgentEvents();
      }
    );

    return () => unsubscribe();
  }, [db, id]);

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
              syncStatus.isConnected
                ? "bg-green-400"
                : "bg-yellow-400/50"
            }`}
          ></span>
          <span
            className={
              syncStatus.isConnected
                ? "text-green-400/70"
                : "text-yellow-400/70"
            }
          >
            {syncStatus.isConnected
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
      {loading ? (
        <div className="text-center py-12">
          <p className="text-amber-400/60">Loading chapters...</p>
        </div>
      ) : chapters.length === 0 ? (
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
                {chapter.content.split("\n\n").map((paragraph, i) => (
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

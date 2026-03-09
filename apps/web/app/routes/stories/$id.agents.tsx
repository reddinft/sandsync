import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@powersync/react";
import { AgentEvent } from "../../lib/powersync";

export const Route = createFileRoute("/stories/$id/agents")({
  component: AgentDebugPage,
});

const AGENT_STYLES: Record<string, { color: string; icon: string; label: string }> = {
  papa_bois: {
    color: "text-green-400 bg-green-900/20 border-green-800/30",
    icon: "🌳",
    label: "Papa Bois",
  },
  anansi: {
    color: "text-amber-400 bg-amber-900/20 border-amber-800/30",
    icon: "🕷️",
    label: "Anansi",
  },
  ogma: {
    color: "text-blue-400 bg-blue-900/20 border-blue-800/30",
    icon: "📜",
    label: "Ogma",
  },
  devi: {
    color: "text-purple-400 bg-purple-900/20 border-purple-800/30",
    icon: "🎵",
    label: "Devi",
  },
};

function AgentDebugPage() {
  const { id } = Route.useParams();
  const { data: rawEvents } = useQuery<any>("SELECT * FROM agent_events WHERE story_id = ? ORDER BY created_at ASC", [id]);

  // Parse payloads
  const events = (rawEvents || []).map((e: any) => ({
    ...e,
    payload: typeof e.payload === "string" ? JSON.parse(e.payload) : e.payload,
  })) as AgentEvent[];

  // Build summary stats
  const agentStats = Object.keys(AGENT_STYLES).map((agent) => {
    const agentEvents = events.filter((e) => e.agent === agent);
    const completed = agentEvents.find((e) => e.event_type === "completed");
    const totalMs = (completed?.payload?.duration_ms as number) || undefined;
    return { agent, count: agentEvents.length, totalMs };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-amber-100">
            Agent Debug Trace
          </h1>
          <p className="text-amber-400/60 text-sm mt-1">Story ID: {id}</p>
        </div>
        <Link
          to="/stories/$id"
          params={{ id }}
          className="text-sm text-amber-500/70 hover:text-amber-400 transition-colors"
        >
          ← Back to story
        </Link>
      </div>

      {/* Agent summary cards */}
      <div className="grid grid-cols-2 gap-3">
        {agentStats.map(({ agent, count, totalMs }) => {
          const style = AGENT_STYLES[agent];
          return (
            <div
              key={agent}
              className={`border rounded-xl px-4 py-3 ${style.color}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span>{style.icon}</span>
                <span className="font-medium">{style.label}</span>
              </div>
              <div className="text-xs opacity-70">
                {count} events ·{" "}
                {totalMs ? `${(totalMs / 1000).toFixed(1)}s` : "—"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Event timeline */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-amber-400/80 uppercase tracking-wider">
          Event Timeline
        </h2>
        {events.length === 0 ? (
          <div className="bg-amber-950/30 border border-amber-800/20 rounded-xl px-5 py-4 text-sm text-amber-400/60">
            No agent events yet.
          </div>
        ) : (
          <div className="space-y-1.5">
            {events.map((event) => {
              const style = AGENT_STYLES[event.agent] || { color: "text-gray-400", icon: "?", label: event.agent };
              return (
                <div
                  key={event.id}
                  className={`border rounded-lg px-4 py-3 ${style.color}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span>{style.icon}</span>
                      <span className="font-medium text-sm">{style.label}</span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full ${
                          event.event_type === "completed"
                            ? "bg-green-900/50 text-green-400"
                            : event.event_type === "failed"
                            ? "bg-red-900/50 text-red-400"
                            : "bg-amber-900/50 text-amber-400"
                        }`}
                      >
                        {event.event_type}
                      </span>
                    </div>
                    <span className="text-xs opacity-50">
                      {new Date(event.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="mt-2 text-xs font-mono opacity-70 bg-black/20 rounded px-2 py-1.5">
                    {JSON.stringify(event.payload, null, 2)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

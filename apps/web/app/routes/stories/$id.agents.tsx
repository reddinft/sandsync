import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@powersync/react";
import { AgentEvent } from "../../lib/powersync";

export const Route = createFileRoute("/stories/$id/agents")({
  component: AgentDebugPage,
});

const AGENT_STYLES: Record<string, { color: string; bgGradient: string; icon: string; label: string }> = {
  papa_bois: {
    color: "text-green-400",
    bgGradient: "from-green-900/20 to-emerald-900/10",
    icon: "🌳",
    label: "Papa Bois",
  },
  anansi: {
    color: "text-amber-400",
    bgGradient: "from-amber-900/20 to-yellow-900/10",
    icon: "🕷️",
    label: "Anansi",
  },
  ogma: {
    color: "text-blue-400",
    bgGradient: "from-blue-900/20 to-cyan-900/10",
    icon: "📜",
    label: "Ogma",
  },
  devi: {
    color: "text-purple-400",
    bgGradient: "from-purple-900/20 to-indigo-900/10",
    icon: "🎵",
    label: "Devi",
  },
};

interface ParsedEvent extends AgentEvent {
  payload: Record<string, any>;
  model?: string;
  tokens?: number;
  latency_ms?: number;
  decision_reason?: string;
  quality_score?: number;
  langfuse_trace_id?: string;
}

function AgentDebugPage() {
  const { id } = Route.useParams();
  const { data: rawEvents } = useQuery<any>("SELECT * FROM agent_events WHERE story_id = ? ORDER BY created_at ASC", [id]);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  // Parse and enrich events
  const events = (rawEvents || []).map((e: any) => {
    const payload = typeof e.payload === "string" ? JSON.parse(e.payload) : e.payload;
    return {
      ...e,
      payload,
      model: payload.model,
      tokens: payload.tokens,
      latency_ms: payload.latency_ms,
      decision_reason: payload.changes_made || payload.cultural_notes,
      quality_score: payload.quality_score,
      langfuse_trace_id: payload.langfuse_trace_id || payload.trace_id,
    } as ParsedEvent;
  });

  // Build summary stats
  const agentStats = Object.keys(AGENT_STYLES).map((agent) => {
    const agentEvents = events.filter((e) => e.agent === agent);
    const started = agentEvents.filter((e) => e.event_type === "started").length;
    const completed = agentEvents.filter((e) => e.event_type === "completed");
    const failed = agentEvents.filter((e) => e.event_type === "failed").length;
    const totalLatency = completed.reduce((sum, e) => sum + (e.latency_ms || 0), 0);
    const totalTokens = completed.reduce((sum, e) => sum + (e.tokens || 0), 0);

    return {
      agent,
      started,
      completed: completed.length,
      failed,
      totalLatency,
      totalTokens,
      avgScore:
        completed.length > 0
          ? (
              completed.reduce((sum, e) => sum + (e.quality_score || 0), 0) /
              completed.length
            ).toFixed(1)
          : "—",
    };
  });

  const toggleExpanded = (eventId: string) => {
    const newSet = new Set(expandedEvents);
    if (newSet.has(eventId)) {
      newSet.delete(eventId);
    } else {
      newSet.add(eventId);
    }
    setExpandedEvents(newSet);
  };

  const totalTime = events.length > 0 
    ? (new Date(events[events.length - 1].created_at).getTime() - new Date(events[0].created_at).getTime()) / 1000
    : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-bold text-amber-100">
            Agent Trace Debug View
          </h1>
          <p className="text-amber-400/60 text-sm font-mono">story_id: {id}</p>
        </div>
        <Link
          to="/stories/$id"
          params={{ id }}
          className="text-sm font-medium text-amber-500/70 hover:text-amber-300 transition-colors px-4 py-2 rounded-lg hover:bg-amber-900/20 w-fit"
        >
          ← Back to story
        </Link>
      </header>

      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {agentStats.map(({ agent, started, completed, failed, totalLatency, totalTokens, avgScore }) => {
          const style = AGENT_STYLES[agent];
          const isActive = started > 0;

          return (
            <div
              key={agent}
              className={`border border-amber-800/30 rounded-xl p-4 bg-gradient-to-br ${style.bgGradient} transition-all ${
                isActive ? "" : "opacity-50"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{style.icon}</span>
                  <div>
                    <div className="font-semibold text-amber-100">{style.label}</div>
                    <div className="text-xs text-amber-400/60">
                      {isActive ? (
                        completed > 0 ? (
                          <span className="text-green-400">✓ Complete</span>
                        ) : (
                          <span className="text-amber-400">⟳ Running</span>
                        )
                      ) : (
                        "Not started"
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Metrics grid */}
              {isActive && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-amber-400/50">Started</div>
                    <div className="font-semibold text-amber-100">{started}</div>
                  </div>
                  <div>
                    <div className="text-green-400/50">Completed</div>
                    <div className="font-semibold text-green-400">{completed}</div>
                  </div>
                  {totalLatency > 0 && (
                    <div>
                      <div className="text-amber-400/50">Time</div>
                      <div className="font-semibold text-amber-100">
                        {(totalLatency / 1000).toFixed(1)}s
                      </div>
                    </div>
                  )}
                  {totalTokens > 0 && (
                    <div>
                      <div className="text-amber-400/50">Tokens</div>
                      <div className="font-semibold text-amber-100">{totalTokens.toLocaleString()}</div>
                    </div>
                  )}
                  {avgScore !== "—" && (
                    <div className="col-span-2">
                      <div className="text-amber-400/50">Avg Quality</div>
                      <div className="font-semibold text-amber-100">{avgScore} / 10</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Total execution time */}
      {totalTime > 0 && (
        <div className="border border-amber-800/20 rounded-lg px-4 py-3 bg-amber-950/20">
          <div className="text-xs text-amber-400/60 mb-1">Total execution time</div>
          <div className="text-xl font-bold text-amber-100">{totalTime.toFixed(1)}s</div>
        </div>
      )}

      {/* Event timeline */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-amber-400/80 uppercase tracking-widest">
          Event Timeline ({events.length} events)
        </h2>

        {events.length === 0 ? (
          <div className="border border-amber-800/20 rounded-xl px-5 py-8 text-center bg-amber-950/20">
            <div className="text-3xl mb-2">📭</div>
            <p className="text-amber-400/60 text-sm font-medium">No events recorded yet</p>
            <p className="text-amber-500/40 text-xs mt-1">Events will appear here as agents process the story</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event, idx) => {
              const style = AGENT_STYLES[event.agent] || {
                color: "text-gray-400",
                bgGradient: "from-gray-900/20 to-gray-900/10",
                icon: "?",
                label: event.agent,
              };
              const isExpanded = expandedEvents.has(event.id);
              const timestamp = new Date(event.created_at);
              const timeStr = timestamp.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                fractionalSecondDigits: 3,
              });

              return (
                <div
                  key={event.id}
                  className={`border rounded-lg overflow-hidden transition-all bg-gradient-to-r ${style.bgGradient} border-amber-800/30`}
                >
                  {/* Event header - always visible */}
                  <button
                    onClick={() => toggleExpanded(event.id)}
                    className="w-full text-left px-5 py-4 hover:bg-black/10 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-xl flex-shrink-0">{style.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-amber-100 text-sm">
                          {style.label}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              event.event_type === "completed"
                                ? "bg-green-900/50 text-green-400"
                                : event.event_type === "failed"
                                ? "bg-red-900/50 text-red-400"
                                : "bg-amber-900/50 text-amber-400"
                            }`}
                          >
                            {event.event_type}
                          </span>
                          <span className="text-xs text-amber-400/60">{timeStr}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick metrics inline */}
                    <div className="flex items-center gap-4 flex-shrink-0 text-xs">
                      {event.latency_ms && (
                        <div className="text-amber-400/70">
                          <span className="font-mono">{(event.latency_ms / 1000).toFixed(2)}s</span>
                        </div>
                      )}
                      {event.quality_score && (
                        <div className="text-amber-400/70">
                          <span className="font-mono">Score: {event.quality_score.toFixed(1)}</span>
                        </div>
                      )}
                      <span className={`text-xs text-amber-400/40 ${isExpanded ? "rotate-180" : ""} transition-transform`}>
                        ▼
                      </span>
                    </div>
                  </button>

                  {/* Expandable details */}
                  {isExpanded && (
                    <div className="border-t border-amber-800/20 px-5 py-4 bg-black/20 space-y-4">
                      {/* Key details grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        {event.model && (
                          <div>
                            <div className="text-amber-400/60 text-xs uppercase tracking-wider font-semibold mb-1">
                              Model
                            </div>
                            <div className="font-mono text-amber-100">{event.model}</div>
                          </div>
                        )}
                        {event.tokens && (
                          <div>
                            <div className="text-amber-400/60 text-xs uppercase tracking-wider font-semibold mb-1">
                              Tokens Used
                            </div>
                            <div className="font-mono text-amber-100">{event.tokens.toLocaleString()}</div>
                          </div>
                        )}
                        {event.latency_ms && (
                          <div>
                            <div className="text-amber-400/60 text-xs uppercase tracking-wider font-semibold mb-1">
                              Latency
                            </div>
                            <div className="font-mono text-amber-100">
                              {(event.latency_ms / 1000).toFixed(3)}s
                            </div>
                          </div>
                        )}
                        {event.quality_score !== undefined && (
                          <div>
                            <div className="text-amber-400/60 text-xs uppercase tracking-wider font-semibold mb-1">
                              Quality Score
                            </div>
                            <div
                              className={`font-mono font-semibold ${
                                event.quality_score >= 7.5
                                  ? "text-green-400"
                                  : event.quality_score >= 5
                                  ? "text-amber-400"
                                  : "text-red-400"
                              }`}
                            >
                              {event.quality_score.toFixed(1)} / 10
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Decision/reasoning */}
                      {event.decision_reason && (
                        <div>
                          <div className="text-amber-400/60 text-xs uppercase tracking-wider font-semibold mb-2">
                            Decision Points
                          </div>
                          <div className="bg-black/30 border border-amber-800/20 rounded-lg px-3 py-2 text-xs text-amber-100/80 max-h-40 overflow-y-auto">
                            {typeof event.decision_reason === "string" ? (
                              <p>{event.decision_reason}</p>
                            ) : Array.isArray(event.decision_reason) ? (
                              <ul className="space-y-1">
                                {event.decision_reason.map((item, i) => (
                                  <li key={i} className="flex gap-2">
                                    <span className="text-amber-600/70">•</span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        </div>
                      )}

                      {/* Langfuse trace link */}
                      {event.langfuse_trace_id && (
                        <div>
                          <a
                            href={`https://cloud.langfuse.com/trace/${event.langfuse_trace_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-900/20 border border-purple-800/40 text-xs font-medium text-purple-400 hover:bg-purple-900/40 hover:border-purple-700/60 transition-colors"
                          >
                            <span>🔗</span>
                            <span>View full trace in Langfuse</span>
                            <span>↗</span>
                          </a>
                        </div>
                      )}

                      {/* Raw JSON for advanced debugging */}
                      <details className="group">
                        <summary className="cursor-pointer text-xs font-mono text-amber-400/50 hover:text-amber-400/70 py-2 select-none">
                          Raw payload (JSON)
                        </summary>
                        <div className="bg-black/40 border border-amber-800/20 rounded-lg px-3 py-2 mt-2 text-xs font-mono text-amber-100/70 overflow-x-auto max-h-80 overflow-y-auto">
                          <pre className="whitespace-pre-wrap break-words">
                            {JSON.stringify(event.payload, null, 2)}
                          </pre>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-amber-800/20 pt-6 text-xs text-amber-400/50 text-center">
        <p>
          Last event:{" "}
          {events.length > 0
            ? new Date(events[events.length - 1].created_at).toLocaleString()
            : "—"}
        </p>
      </footer>
    </div>
  );
}

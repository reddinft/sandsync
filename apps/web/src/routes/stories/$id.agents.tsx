import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/stories/$id/agents")({
  component: AgentDebugPage,
});

// Mock agent events — will be read from PowerSync local SQLite
const MOCK_EVENTS = [
  {
    id: "e1",
    agent: "papa_bois",
    event_type: "started",
    payload: { model: "claude-haiku-4-5", action: "parse_request" },
    created_at: "2026-03-08T10:00:00Z",
  },
  {
    id: "e2",
    agent: "papa_bois",
    event_type: "completed",
    payload: {
      duration_ms: 1200,
      chapters_planned: 3,
      genre: "Anansi trickster tale",
    },
    created_at: "2026-03-08T10:00:01Z",
  },
  {
    id: "e3",
    agent: "anansi",
    event_type: "started",
    payload: { model: "claude-haiku-4-5", chapter: 1 },
    created_at: "2026-03-08T10:00:02Z",
  },
  {
    id: "e4",
    agent: "anansi",
    event_type: "completed",
    payload: { duration_ms: 3200, words: 452, chapter: 1 },
    created_at: "2026-03-08T10:00:05Z",
  },
  {
    id: "e5",
    agent: "ogma",
    event_type: "started",
    payload: { model: "qwen3:4b (local)", chapter: 1 },
    created_at: "2026-03-08T10:00:06Z",
  },
  {
    id: "e6",
    agent: "ogma",
    event_type: "completed",
    payload: { duration_ms: 8100, quality_score: 9.1, approved: true, chapter: 1 },
    created_at: "2026-03-08T10:00:14Z",
  },
  {
    id: "e7",
    agent: "devi",
    event_type: "started",
    payload: { chapter: 1, voice_id: "SOYHLrjzK2X1ezoPC6cr" },
    created_at: "2026-03-08T10:00:15Z",
  },
  {
    id: "e8",
    agent: "devi",
    event_type: "completed",
    payload: { duration_ms: 4500, audio_seconds: 180, chapter: 1 },
    created_at: "2026-03-08T10:00:20Z",
  },
];

const AGENT_STYLES: Record<string, { color: string; icon: string; label: string }> = {
  papa_bois: { color: "text-green-400 bg-green-900/20 border-green-800/30", icon: "🌳", label: "Papa Bois" },
  anansi: { color: "text-amber-400 bg-amber-900/20 border-amber-800/30", icon: "🕷️", label: "Anansi" },
  ogma: { color: "text-blue-400 bg-blue-900/20 border-blue-800/30", icon: "📜", label: "Ogma" },
  devi: { color: "text-purple-400 bg-purple-900/20 border-purple-800/30", icon: "🎵", label: "Devi" },
};

function AgentDebugPage() {
  const { id } = Route.useParams();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-amber-100">Agent Debug Trace</h1>
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
        {Object.entries(AGENT_STYLES).map(([key, style]) => {
          const agentEvents = MOCK_EVENTS.filter((e) => e.agent === key);
          const completed = agentEvents.find((e) => e.event_type === "completed");
          const totalMs = completed?.payload.duration_ms as number | undefined;

          return (
            <div
              key={key}
              className={`border rounded-xl px-4 py-3 ${style.color}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span>{style.icon}</span>
                <span className="font-medium">{style.label}</span>
              </div>
              <div className="text-xs opacity-70">
                {agentEvents.length} events ·{" "}
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
        <div className="space-y-1.5">
          {MOCK_EVENTS.map((event) => {
            const style = AGENT_STYLES[event.agent];
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
      </div>
    </div>
  );
}

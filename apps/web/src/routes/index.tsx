import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const GENRES = [
  "Anansi trickster tale",
  "Papa Bois forest spirit",
  "Soucouyant mystery",
  "La Diablesse encounter",
  "Lagahoo shapeshifter",
  "Mama Dlo river spirit",
  "Douen children spirits",
  "Silk cotton tree legend",
];

const LENGTHS = [
  { value: "short", label: "Short (3 chapters)" },
  { value: "medium", label: "Medium (5 chapters)" },
  { value: "long", label: "Long (7 chapters)" },
];

// Mock recent stories for offline-first demo
const MOCK_STORIES = [
  {
    id: "1",
    title: "The Spider and the River Goddess",
    genre: "Anansi trickster tale",
    status: "complete",
    created_at: "2026-03-08T10:00:00Z",
  },
  {
    id: "2",
    title: "The Old Man of Moruga Forest",
    genre: "Papa Bois forest spirit",
    status: "generating",
    created_at: "2026-03-08T14:30:00Z",
  },
];

function HomePage() {
  const [genre, setGenre] = useState(GENRES[0]);
  const [length, setLength] = useState("medium");
  const [theme, setTheme] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // TODO: POST to /api/stories — Papa Bois will orchestrate
    console.log("Story request:", { genre, length, theme });
    setTimeout(() => setSubmitting(false), 2000);
  };

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="text-center space-y-3 py-6">
        <h1 className="text-4xl font-bold text-amber-100">
          Stories from the Spirit World
        </h1>
        <p className="text-amber-300/70 max-w-xl mx-auto">
          AI agents with Caribbean voices collaborate to weave your story.
          Read offline. Sync when connected.
        </p>
      </div>

      {/* Story Request Form */}
      <div className="bg-amber-950/50 border border-amber-800/30 rounded-2xl p-6 space-y-5">
        <h2 className="text-lg font-semibold text-amber-200">
          🕷️ Request a Story
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-amber-400/80 mb-1">
              Folklore Genre
            </label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full bg-amber-950 border border-amber-700/50 rounded-lg px-3 py-2 text-amber-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-amber-400/80 mb-1">
              Theme or Setting (optional)
            </label>
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="e.g. a young fisherman in Tobago, rainy season..."
              className="w-full bg-amber-950 border border-amber-700/50 rounded-lg px-3 py-2 text-amber-100 placeholder-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm text-amber-400/80 mb-1">
              Story Length
            </label>
            <div className="flex gap-3">
              {LENGTHS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setLength(l.value)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-colors ${
                    length === l.value
                      ? "bg-amber-600 border-amber-500 text-white"
                      : "bg-amber-950 border-amber-700/50 text-amber-400 hover:border-amber-600"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
          >
            {submitting ? "🌿 Papa Bois is listening..." : "🌴 Begin the Story"}
          </button>
        </form>
      </div>

      {/* Recent Stories */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-amber-200">
          📖 Recent Stories
        </h2>
        <div className="space-y-2">
          {MOCK_STORIES.map((story) => (
            <a
              key={story.id}
              href={`/stories/${story.id}`}
              className="block bg-amber-950/30 border border-amber-800/20 rounded-xl px-5 py-4 hover:border-amber-700/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-amber-100">{story.title}</div>
                  <div className="text-sm text-amber-400/60 mt-0.5">
                    {story.genre}
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    story.status === "complete"
                      ? "bg-green-900/50 text-green-400"
                      : "bg-amber-900/50 text-amber-400"
                  }`}
                >
                  {story.status === "complete" ? "✓ Complete" : "⟳ Generating"}
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@powersync/react";
import { Story } from "../lib/powersync";

export const Route = createFileRoute("/")({
  component: HomePage,
});

/* Folklore genres with emoji mappings (Belle's design) */
const GENRES = [
  { label: "Anansi trickster tale", emoji: "🕷️", value: "anansi" },
  { label: "Papa Bois forest spirit", emoji: "🌳", value: "papa-bois" },
  { label: "Soucouyant mystery", emoji: "🔥", value: "soucouyant" },
  { label: "La Diablesse encounter", emoji: "👠", value: "la-diablesse" },
  { label: "Lagahoo shapeshifter", emoji: "🐺", value: "lagahoo" },
  { label: "Mama Dlo river spirit", emoji: "🐍", value: "mama-dlo" },
  { label: "Douen children spirits", emoji: "👣", value: "douen" },
  { label: "Silk cotton tree legend", emoji: "🌲", value: "silk-cotton" },
];

function HomePage() {
  const navigate = useNavigate();
  const { data: stories } = useQuery<Story>("SELECT * FROM stories ORDER BY created_at DESC");
  const [selectedGenre, setSelectedGenre] = useState(GENRES[0].value);
  const [theme, setTheme] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [summoning, setSummoning] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSummoning(true);

    try {
      // Trigger summon effect (particle burst)
      triggerSummonEffect();

      // Wait 800ms for effect to complete before navigating
      await new Promise(resolve => setTimeout(resolve, 800));

      // @ts-ignore - VITE_API_URL is provided by Vite
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3002";
      const response = await fetch(
        `${apiUrl}/stories`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            genre: selectedGenre,
            theme: theme || undefined,
            length: "short",
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = (await response.json()) as { id: string };
      // Navigate to the new story
      navigate({ to: `/stories/${data.id}` });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create story");
      setSubmitting(false);
      setSummoning(false);
    }
  };

  const triggerSummonEffect = () => {
    // Create 5-8 spirit particles that fly outward and fade
    const particles = ["🕷️", "✨", "🌿", "🌴"];
    const container = document.body;
    
    for (let i = 0; i < 6; i++) {
      const particle = document.createElement("div");
      const particle_emoji = particles[i % particles.length];
      particle.textContent = particle_emoji;
      particle.style.position = "fixed";
      particle.style.fontSize = "2rem";
      particle.style.pointerEvents = "none";
      particle.style.left = "50%";
      particle.style.top = "50%";
      
      const angle = (Math.PI * 2 * i) / 6;
      const distance = 200;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;
      
      particle.style.setProperty("--tx", `${tx}px`);
      particle.style.setProperty("--ty", `${ty}px`);
      particle.style.animation = "spirit-particle 0.8s ease-out forwards";
      particle.style.zIndex = "100";
      
      container.appendChild(particle);
      setTimeout(() => particle.remove(), 800);
    }
  };

  const selectedGenreObj = GENRES.find(g => g.value === selectedGenre) || GENRES[0];

  return (
    <div className="space-y-12">
      {/* HERO SECTION */}
      <div className="relative min-h-[50vh] flex flex-col items-center justify-center text-center space-y-6 py-8">
        <h1 className="text-5xl md:text-7xl font-bold text-amber-100 leading-tight">
          🌴 SandSync
        </h1>
        <p className="text-lg md:text-2xl text-amber-200/80 max-w-2xl mx-auto leading-relaxed font-medium">
          Caribbean folklore. AI-written. Narrated. Illustrated. Yours offline.
        </p>
        <p className="text-sm text-amber-200/50 max-w-xl mx-auto">
          Powered by PowerSync · Mastra · ElevenLabs · fal.ai · Supabase · Groq · TanStack
        </p>
        {/* Primary CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <a
            href="/pipeline-demo"
            className="inline-flex items-center gap-2 bg-amber-100 text-indigo-950 hover:bg-amber-200 font-semibold rounded-xl px-6 py-3 text-sm transition-all shadow-lg shadow-amber-400/20 hover:shadow-amber-400/40"
          >
            <span>▶</span>
            <span>Try the Demo</span>
          </a>
          <a
            href="/showcase"
            className="inline-flex items-center gap-2 bg-slate-700/50 border border-amber-400/30 text-amber-100 hover:border-amber-400/60 hover:bg-amber-500/10 font-semibold rounded-xl px-6 py-3 text-sm transition-all"
          >
            <span>📚</span>
            <span>Browse Stories</span>
          </a>
        </div>
      </div>

      {/* FORM SECTION */}
      <div className="max-w-2xl mx-auto w-full">
        <div className="glass rounded-2xl p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error alert */}
            {error && (
              <div className="bg-rose-400/10 border border-rose-400/50 rounded-lg px-4 py-3 text-sm text-rose-100">
                <strong>Summoning failed.</strong> {error}
              </div>
            )}

            {/* Genre Pills */}
            <div className="space-y-3">
              <label className="block text-amber-100 text-base font-semibold">
                What type of tale calls to you?
              </label>
              <div className="flex flex-wrap gap-3">
                {GENRES.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setSelectedGenre(g.value)}
                    className={`px-4 py-2 rounded-full font-medium text-sm transition-all ${
                      selectedGenre === g.value
                        ? "bg-amber-100 text-indigo-950 shadow-lg shadow-amber-400/30"
                        : "bg-indigo-900/30 text-amber-100 border border-indigo-700/50 hover:border-amber-200/50"
                    }`}
                  >
                    {g.emoji} {g.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-amber-200/50 italic">
                Each folklore spirit has its own flavor of tale.
              </p>
            </div>

            {/* Theme Input */}
            <div className="space-y-2">
              <label className="block text-amber-100 text-base font-semibold">
                What should this tale explore?
              </label>
              <textarea
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="A clever merchant outwitting a spirit... A love tested by trickery... A hunter's test..."
                className="w-full bg-indigo-900/30 border border-indigo-700/50 text-amber-100 placeholder-amber-200/30 rounded-lg px-4 py-3 resize-none focus:border-amber-200/70 focus:ring-1 focus:ring-amber-400/50 transition-all min-h-24"
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-amber-200/50">Be specific. Spirits respond to intention.</p>
                <span className="text-xs text-amber-200/40 font-mono">{theme.length}/200</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !selectedGenre}
              className="w-full bg-amber-100 text-indigo-950 hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold rounded-lg px-6 py-4 text-base transition-all duration-200 shadow-md hover:shadow-lg hover:shadow-amber-400/30"
            >
              {submitting ? (
                <>
                  <span className="inline-block animate-spin mr-2">⌛</span>
                  Summoning... Anansi is spinning the threads...
                </>
              ) : (
                "Summon the Story"
              )}
            </button>
          </form>
        </div>
      </div>

      {/* RECENT STORIES SECTION */}
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-amber-100">Recent Tales</h2>
        
        {!stories || stories.length === 0 ? (
          <div className="text-center py-12 px-6">
            <p className="text-5xl mb-4">🕸️</p>
            <p className="text-amber-200/60 text-lg mb-2">
              No tales have been summoned yet — the web is empty, waiting to be spun.
            </p>
            <p className="text-amber-200/40 text-sm">
              Create one above to see your stories appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stories.map((story) => (
              <a
                key={story.id}
                href={`/stories/${story.id}`}
                className="group glass rounded-lg p-6 space-y-3 hover:border-amber-200/70 hover:shadow-lg hover:shadow-amber-400/20 transition-all cursor-pointer border-l-4 border-amber-400/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-semibold text-amber-100 group-hover:text-amber-50 transition-colors line-clamp-2">
                      {story.title}
                    </h3>
                    <p className="text-sm text-amber-200/60 mt-1">
                      {story.genre}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium border whitespace-nowrap ${
                      story.status === "complete"
                        ? "bg-emerald-400/20 text-emerald-100 border-emerald-400/50"
                        : story.status === "failed"
                        ? "bg-rose-400/20 text-rose-100 border-rose-400/50"
                        : "bg-amber-400/20 text-amber-100 border-amber-400/50 animate-pulse"
                    }`}
                  >
                    {story.status === "complete"
                      ? "✓ Complete"
                      : story.status === "failed"
                      ? "✗ Failed"
                      : "⟳ Syncing"}
                  </span>
                </div>

                {/* Quick stats footer */}
                <div className="pt-2 border-t border-indigo-700/30 flex gap-4 text-xs text-amber-200/50">
                  <span>📖 Chapters</span>
                  <span>⏱️ {Math.ceil(Math.random() * 15) + 5} min</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

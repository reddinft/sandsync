import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/stories/$id")({
  component: StoryReaderPage,
});

// Mock data — will be replaced with PowerSync local SQLite reads
const MOCK_STORY = {
  id: "1",
  title: "The Spider and the River Goddess",
  genre: "Anansi trickster tale",
  status: "complete",
  chapters: [
    {
      id: "ch1",
      chapter_number: 1,
      title: "The Dry Season Bargain",
      content: `In the village of Moruga, where the sea meets the mangrove roots and the immortelle trees blaze orange every dry season, there lived a spider named Kwaku Anansi who had woven his web between the stories of two worlds.

The river had been silent for three months. Not dry — the water still ran — but silent. No songs. No rippling laughter that the old people remembered from their grandmothers' time, when Mama Dlo would teach the river to speak in the evenings, when the bats began their patrol.

Anansi watched this silence with his eight careful eyes and knew something was missing. A story was unfinished somewhere upstream.

"When a story stops in the middle," his grandmother had told him, spinning her own web in the silk cotton tree behind the house, "the land itself holds its breath."

So Anansi gathered his bundle — a length of thread stronger than any rope, three ripe mangoes, and a calabash he had spent seven days sanding smooth — and he walked upstream, against the current of the dry season wind.`,
      reviewed_content: null,
      audio_url: null,
      agent_trace: {
        anansi_model: "claude-haiku-4-5",
        ogma_model: "qwen3:4b",
        anansi_latency_ms: 3200,
        ogma_latency_ms: 8100,
      },
    },
    {
      id: "ch2",
      chapter_number: 2,
      title: "The Price of Song",
      content: `Mama Dlo was not where Anansi expected to find her — which was, of course, exactly how she wanted it.

He had walked past the place where the river forked, past the old sugar mill that had fallen into the water fifty years ago and now held its stones together with roots, past the pool where the children were forbidden to swim after dark. He had climbed the rocky section where the water ran fast and cold even in dry season, fed by springs that had no memory of drought.

She was sitting on a flat stone in the middle of the river, combing her hair with a fishbone comb.

"Spider," she said, without turning around. "You took long enough."

"I had webs to check," Anansi said carefully. He didn't approach the water's edge. Mama Dlo was beautiful and ancient and patient, and he was none of those things. "The village sends its wondering."

"The village sends its spider." She turned then, and her eyes were the colour of water over dark stone. "Which means the village is frightened but too proud to say so."`,
      reviewed_content: null,
      audio_url: null,
      agent_trace: {
        anansi_model: "claude-haiku-4-5",
        ogma_model: "qwen3:4b",
        anansi_latency_ms: 2800,
        ogma_latency_ms: 7600,
      },
    },
  ],
};

const AGENT_COLORS: Record<string, string> = {
  papa_bois: "text-green-400",
  anansi: "text-amber-400",
  ogma: "text-blue-400",
  devi: "text-purple-400",
};

function StoryReaderPage() {
  const { id } = Route.useParams();
  const story = MOCK_STORY; // TODO: read from PowerSync local SQLite

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
        <div className="flex items-center gap-2 text-xs text-green-400/70">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
          Available offline — synced locally via PowerSync
        </div>
      </div>

      {/* Agent status bar */}
      <div className="bg-amber-950/30 border border-amber-800/20 rounded-xl px-5 py-3">
        <div className="text-xs text-amber-400/60 mb-2">Agent Pipeline</div>
        <div className="flex items-center gap-4 text-sm">
          {["Papa Bois ✓", "Anansi ✓", "Ogma ✓", "Devi ✓"].map((agent, i) => (
            <span key={i} className="text-green-400/80">
              {agent}
            </span>
          ))}
        </div>
      </div>

      {/* Chapters */}
      <div className="space-y-10">
        {story.chapters.map((chapter) => (
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

            {/* Audio player placeholder */}
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

      {/* Debug link */}
      <div className="border-t border-amber-800/20 pt-4">
        <a
          href={`/stories/${id}/agents`}
          className="text-sm text-amber-500/50 hover:text-amber-400 transition-colors"
        >
          🔍 View agent debug trace →
        </a>
      </div>
    </div>
  );
}

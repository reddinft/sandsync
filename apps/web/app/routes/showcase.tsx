/**
 * SandSync Showcase — /showcase
 *
 * Gallery of previously generated Caribbean folklore stories.
 * Fetches from GET /stories (list endpoint) on mount.
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";

export const Route = createFileRoute("/showcase")({
  component: ShowcasePage,
});

// ── Types ──────────────────────────────────────────────────────────────────────

interface StoryCard {
  id: string;
  title: string;
  genre: string;
  status: string;
  created_at: string;
  first_chapter: {
    excerpt: string | null;
    image_url: string | null;
    audio_url: string | null;
  } | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const GENRE_EMOJI: [string, string][] = [
  ["anansi", "🕷️"],
  ["papa bois", "🌳"],
  ["papa-bois", "🌳"],
  ["soucouyant", "🔥"],
  ["la diablesse", "👠"],
  ["lagahoo", "🐺"],
  ["mama dlo", "🐍"],
  ["mama-dlo", "🐍"],
];

const GENRE_GRADIENTS: [string, string][] = [
  ["anansi", "from-amber-900 via-orange-800 to-yellow-900"],
  ["papa bois", "from-green-900 via-emerald-800 to-teal-900"],
  ["papa-bois", "from-green-900 via-emerald-800 to-teal-900"],
  ["soucouyant", "from-red-900 via-orange-900 to-rose-900"],
  ["la diablesse", "from-purple-900 via-violet-800 to-indigo-900"],
  ["lagahoo", "from-zinc-900 via-slate-800 to-gray-900"],
  ["mama dlo", "from-cyan-900 via-teal-800 to-blue-900"],
  ["mama-dlo", "from-cyan-900 via-teal-800 to-blue-900"],
];

function getGenreEmoji(genre: string): string {
  const lower = genre.toLowerCase();
  for (const [key, emoji] of GENRE_EMOJI) {
    if (lower.includes(key)) return emoji;
  }
  return "🌴";
}

function getGenreGradient(genre: string): string {
  const lower = genre.toLowerCase();
  for (const [key, grad] of GENRE_GRADIENTS) {
    if (lower.includes(key)) return grad;
  }
  return "from-indigo-900 via-purple-800 to-slate-900";
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-AU", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

// ── Story Card ─────────────────────────────────────────────────────────────────

function StoryCardItem({ story }: { story: StoryCard }) {
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const emoji = getGenreEmoji(story.genre);
  const gradient = getGenreGradient(story.genre);
  const imageUrl = story.first_chapter?.image_url;
  const audioUrl = story.first_chapter?.audio_url;
  const excerpt = story.first_chapter?.excerpt?.slice(0, 150);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  return (
    <div
      onClick={() => navigate({ to: `/stories/${story.id}` })}
      className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden cursor-pointer
        hover:border-amber-400/40 hover:shadow-lg hover:shadow-amber-400/10 hover:-translate-y-0.5
        transition-all duration-200 flex flex-col"
    >
      {/* Cover image or gradient placeholder */}
      <div className="relative h-44 flex-shrink-0">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={story.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <span className="text-5xl opacity-60">{emoji}</span>
          </div>
        )}
        {/* Genre badge */}
        <span className="absolute top-2 right-2 bg-slate-900/70 backdrop-blur text-amber-200/80 text-[10px] px-2 py-0.5 rounded-full font-medium capitalize">
          {story.genre}
        </span>
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        {/* Title */}
        <h3 className="text-sm font-semibold text-amber-100 line-clamp-2 leading-snug">
          {story.title || "Untitled Story"}
        </h3>

        {/* Excerpt */}
        {excerpt && (
          <p className="text-xs text-amber-200/40 leading-relaxed line-clamp-3">
            "{excerpt}{excerpt.length >= 150 ? "…" : ""}"
          </p>
        )}

        <div className="flex-1" />

        {/* Buttons + date */}
        <div className="flex items-center gap-2 mt-1">
          {audioUrl && (
            <>
              <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={() => setPlaying(false)}
                preload="none"
              />
              <button
                onClick={handlePlay}
                className="flex items-center gap-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 text-amber-200 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all"
              >
                {playing ? "⏸" : "▶"} Play
              </button>
            </>
          )}
          <a
            href={`/stories/${story.id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 bg-slate-700/60 hover:bg-slate-700/80 border border-slate-600/40 text-amber-100/80 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all"
          >
            📖 Read
          </a>
          <span className="ml-auto text-[10px] text-amber-200/30 font-mono">
            {formatDate(story.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden animate-pulse">
      <div className="h-44 bg-slate-700/50" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-slate-700/50 rounded w-3/4" />
        <div className="h-3 bg-slate-700/50 rounded w-full" />
        <div className="h-3 bg-slate-700/50 rounded w-2/3" />
        <div className="flex gap-2 mt-3">
          <div className="h-7 bg-slate-700/50 rounded-lg w-16" />
          <div className="h-7 bg-slate-700/50 rounded-lg w-16" />
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function ShowcasePage() {
  const [stories, setStories] = useState<StoryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const apiUrl = (import.meta.env as any).VITE_API_URL || "http://localhost:3002";

  useEffect(() => {
    fetch(`${apiUrl}/stories`)
      .then((r) => {
        if (!r.ok) throw new Error(`API ${r.status}`);
        return r.json();
      })
      .then((data) => {
          // Only show stories that have a cover image
          const all = data as StoryCard[];
          setStories(all.filter((s) => s.first_chapter?.image_url));
        })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-amber-100">🌴 Story Showcase</h1>
        <p className="text-sm text-amber-200/50 mt-1">
          {loading ? "Loading stories…" : `${stories.length} ${stories.length === 1 ? "story" : "stories"} — Previously generated Caribbean folklore`}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-400/40 rounded-xl px-4 py-3 text-sm text-rose-200 mb-6">
          Failed to load stories: {error}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : stories.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-4xl">🌴</p>
          <p className="text-amber-200/60 text-sm">No stories yet</p>
          <p className="text-amber-200/30 text-xs">
            Generate one on the{" "}
            <a href="/pipeline-demo" className="text-amber-400/70 hover:text-amber-400 underline">
              Pipeline page
            </a>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {stories.filter(s => s.first_chapter?.image_url).map((s) => (
            <StoryCardItem key={s.id} story={s} />
          ))}
        </div>
      )}
    </div>
  );
}

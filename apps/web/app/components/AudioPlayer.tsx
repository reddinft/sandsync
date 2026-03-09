import { useEffect, useRef, useState } from "react";

interface AudioPlayerProps {
  src: string;
  chapterTitle: string;
}

export function AudioPlayer({ src, chapterTitle }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const [isSeeking, setIsSeeking] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check for prefers-reduced-motion
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mql.matches);
    
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Event listeners
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      if (!isSeeking) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    const handleError = () => {
      setError("Failed to load audio");
      setIsLoading(false);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [isSeeking]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play();
    } else {
      audioRef.current.pause();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.code === "Space") {
      e.preventDefault();
      togglePlayPause();
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (error) {
    return (
      <div className="bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-800/30 rounded-xl px-5 py-4">
        <div className="flex items-center gap-2 mb-2 text-sm font-medium text-purple-400">
          <span>⚠️</span>
          <span>Audio unavailable</span>
        </div>
        <p className="text-xs text-purple-300/60">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-800/30 rounded-xl px-5 py-5">
      {/* Label */}
      <div className="flex items-center gap-2 mb-4 text-sm font-medium text-purple-300">
        <span>🎵</span>
        <span>Narration by Devi</span>
      </div>

      {/* Hidden audio element */}
      <audio ref={audioRef} src={src} crossOrigin="anonymous" />

      {/* Player controls */}
      <div className="flex items-center gap-3" onKeyDown={handleKeyDown} role="region" aria-label={`Audio player for ${chapterTitle}`}>
        {/* Play/pause button */}
        <button
          onClick={togglePlayPause}
          disabled={isLoading || !!error}
          className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
            isLoading || error
              ? "bg-purple-700/30 text-purple-400/50 cursor-not-allowed"
              : isPlaying
                ? "bg-purple-600 text-white hover:bg-purple-500"
                : "bg-purple-700/50 text-purple-300 hover:bg-purple-600"
          } ${
            prefersReducedMotion ? "" : "active:scale-95"
          }`}
          aria-label={isPlaying ? "Pause audio" : "Play audio"}
          title={isPlaying ? "Pause (Space)" : "Play (Space)"}
        >
          {isLoading ? (
            <span className={`inline-block ${prefersReducedMotion ? "" : "animate-spin"}`}>⟳</span>
          ) : isPlaying ? (
            <span>⏸</span>
          ) : (
            <span>▶</span>
          )}
        </button>

        {/* Progress bar */}
        <div className="flex-1 space-y-1">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleProgressChange}
            onMouseDown={() => setIsSeeking(true)}
            onMouseUp={() => setIsSeeking(false)}
            onTouchStart={() => setIsSeeking(true)}
            onTouchEnd={() => setIsSeeking(false)}
            disabled={isLoading || !!error || !duration}
            className="w-full h-1.5 bg-purple-700/30 rounded-full cursor-pointer accent-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Audio progress"
          />
          <div className="flex justify-between text-xs text-purple-400/70 font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume control */}
        <div className="flex items-center gap-2">
          <label htmlFor="volume-slider" className="text-xs text-purple-400/60">
            🔊
          </label>
          <input
            id="volume-slider"
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={handleVolumeChange}
            disabled={isLoading || !!error}
            className="w-12 h-1.5 bg-purple-700/30 rounded-full cursor-pointer accent-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Volume"
          />
        </div>
      </div>

      {/* Loading/generating state */}
      {isLoading && (
        <div className="mt-3 text-xs text-purple-400/60 flex items-center gap-2">
          <span className={prefersReducedMotion ? "" : "inline-block animate-pulse"}>●</span>
          <span>Loading audio...</span>
        </div>
      )}
    </div>
  );
}

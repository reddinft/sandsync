/**
 * SandSync Agent Debug Demo — /agents-demo
 *
 * Static demo page showing a realistic agent event timeline for recording.
 * Data represents the pipeline for: "Anansi and the Silk Cotton's Secret"
 * (story d71c78c9 — real story from the hackathon run)
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/agents-demo")({
  component: AgentsDemoPage,
});

// ── Types & Demo Data ──────────────────────────────────────────────────────────

type AgentEvent = {
  id: string;
  agent: "papa_bois" | "anansi" | "ogma" | "devi";
  event_type: "started" | "completed" | "failed";
  latency_ms?: number;
  model?: string;
  tokens?: number;
  quality_score?: number;
  decision?: string;
  revision_note?: string;
  chapter?: number;
};

const DEMO_EVENTS: AgentEvent[] = [
  // Papa Bois — orchestrator
  {
    id: "1",
    agent: "papa_bois",
    event_type: "started",
    model: "claude-haiku-4-5",
    tokens: 210,
    latency_ms: 320,
  },
  {
    id: "2",
    agent: "papa_bois",
    event_type: "completed",
    model: "claude-haiku-4-5",
    tokens: 580,
    latency_ms: 1840,
    decision: "Story brief: 3 chapters, Anansi trickster arc, silk-cotton tree symbolism",
  },

  // Anansi — chapter 1
  { id: "3", agent: "anansi", event_type: "started", chapter: 1, model: "claude-haiku-4-5", tokens: 320 },
  // Ogma review ch1 — REJECT
  {
    id: "4",
    agent: "ogma",
    event_type: "started",
    chapter: 1,
    model: "claude-haiku-4-5",
    tokens: 415,
    latency_ms: 890,
  },
  {
    id: "5",
    agent: "ogma",
    event_type: "completed",
    chapter: 1,
    model: "claude-haiku-4-5",
    tokens: 680,
    latency_ms: 2340,
    quality_score: 6.2,
    decision: "REJECT",
    revision_note: "Trinidadian dialect needs reinforcement; spider metaphors too generic",
  },
  // Anansi revision ch1
  { id: "6", agent: "anansi", event_type: "started", chapter: 1, model: "claude-haiku-4-5", tokens: 510 },
  // Ogma re-review ch1 — APPROVE
  {
    id: "7",
    agent: "ogma",
    event_type: "started",
    chapter: 1,
    model: "claude-haiku-4-5",
    tokens: 480,
    latency_ms: 910,
  },
  {
    id: "8",
    agent: "ogma",
    event_type: "completed",
    chapter: 1,
    model: "claude-haiku-4-5",
    tokens: 710,
    latency_ms: 2480,
    quality_score: 8.7,
    decision: "APPROVE",
    revision_note: "Strong dialect authenticity. Silk-cotton imagery vivid and culturally grounded.",
  },
  // Anansi chapter 2
  { id: "9", agent: "anansi", event_type: "started", chapter: 2, model: "claude-haiku-4-5", tokens: 390 },
  {
    id: "10",
    agent: "ogma",
    event_type: "started",
    chapter: 2,
    model: "claude-haiku-4-5",
    tokens: 450,
    latency_ms: 860,
  },
  {
    id: "11",
    agent: "ogma",
    event_type: "completed",
    chapter: 2,
    model: "claude-haiku-4-5",
    tokens: 690,
    latency_ms: 2190,
    quality_score: 8.4,
    decision: "APPROVE",
    revision_note: "Sky god bargain scene excellent. Trickster tension well-executed.",
  },
  // Devi TTS
  { id: "12", agent: "devi", event_type: "started", chapter: 1, model: "deepgram", tokens: 0 },
  { id: "13", agent: "devi", event_type: "failed", chapter: 1, decision: "ElevenLabs quota hit — falling back to Kokoro" },
  { id: "14", agent: "devi", event_type: "started", chapter: 1, model: "kokoro-local", tokens: 0 },
  { id: "15", agent: "devi", event_type: "completed", chapter: 1, model: "kokoro-local", latency_ms: 4320 },
];

const AGENT_CONFIG = {
  papa_bois: { icon: "🌳", label: "Papa Bois", color: "text-emerald-400", border: "border-emerald-600/50", bg: "bg-emerald-900/20", accent: "bg-emerald-400/20 text-emerald-100 border border-emerald-400/40" },
  anansi: { icon: "🕷️", label: "Anansi", color: "text-orange-400", border: "border-orange-500/50", bg: "bg-orange-900/20", accent: "bg-orange-500/20 text-orange-100 border border-orange-400/40" },
  ogma: { icon: "📜", label: "Ogma", color: "text-purple-400", border: "border-purple-600/50", bg: "bg-purple-900/20", accent: "bg-purple-400/20 text-purple-100 border border-purple-400/40" },
  devi: { icon: "✨", label: "Devi", color: "text-amber-400", border: "border-amber-500/50", bg: "bg-amber-900/20", accent: "bg-amber-400/20 text-amber-100 border border-amber-400/40" },
};

function QualityBadge({ score, decision }: { score?: number; decision?: string }) {
  if (!score && !decision) return null;
  const isApproved = decision === "APPROVE";
  const isRejected = decision === "REJECT";
  const isFailed = decision?.includes("fallback") || decision?.includes("quota");

  return (
    <div className="flex items-center gap-2 flex-wrap mt-2">
      {score !== undefined && (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
          score >= 8 ? "bg-green-500/20 text-green-300 border-green-400/40"
          : score >= 6 ? "bg-amber-500/20 text-amber-300 border-amber-400/40"
          : "bg-rose-500/20 text-rose-300 border-rose-400/40"
        }`}>
          ⭐ {score.toFixed(1)} / 10
        </span>
      )}
      {decision && (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
          isApproved ? "bg-green-500/20 text-green-300 border-green-400/40"
          : isRejected ? "bg-rose-500/20 text-rose-300 border-rose-400/40"
          : isFailed ? "bg-amber-500/20 text-amber-300 border-amber-400/40"
          : "bg-slate-500/20 text-slate-300 border-slate-400/40"
        }`}>
          {isApproved ? "✅ APPROVED" : isRejected ? "❌ REJECTED" : "⚠️ " + decision.slice(0, 30)}
        </span>
      )}
    </div>
  );
}

function EventCard({ event, index }: { event: AgentEvent; index: number }) {
  const cfg = AGENT_CONFIG[event.agent];
  const [expanded, setExpanded] = useState(event.quality_score !== undefined);

  const isComplete = event.event_type === "completed";
  const isFailed = event.event_type === "failed";
  const isStarted = event.event_type === "started";

  const statusDot = isFailed
    ? "bg-rose-400"
    : isComplete
    ? "bg-green-400"
    : "bg-amber-400 animate-pulse";

  return (
    <div
      className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4 space-y-2 cursor-pointer transition-all duration-300 hover:brightness-110`}
      onClick={() => setExpanded((e) => !e)}
    >
      <div className="flex items-center gap-2.5">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot}`} />
        <span className={`font-semibold text-sm ${cfg.color} flex items-center gap-1.5`}>
          {cfg.icon} {cfg.label}
          {event.chapter !== undefined && (
            <span className="text-[10px] text-amber-200/40 font-normal">ch.{event.chapter}</span>
          )}
        </span>
        <span className={`ml-auto text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full border ${
          isFailed ? "bg-rose-500/20 text-rose-300 border-rose-400/30"
          : isComplete ? "bg-green-500/20 text-green-300 border-green-400/30"
          : "bg-amber-500/20 text-amber-300 border-amber-400/30"
        }`}>
          {event.event_type}
        </span>
        {event.latency_ms && (
          <span className="text-[10px] text-amber-200/30 font-mono ml-1">
            {event.latency_ms >= 1000 ? `${(event.latency_ms / 1000).toFixed(1)}s` : `${event.latency_ms}ms`}
          </span>
        )}
      </div>

      {expanded && (
        <div className="space-y-1.5 pl-5">
          {event.model && (
            <p className="text-[11px] text-amber-200/50 font-mono">
              model: <span className="text-amber-200/70">{event.model}</span>
              {event.tokens ? <span className="ml-2 text-amber-200/35">{event.tokens} tokens</span> : null}
            </p>
          )}
          {event.decision && (
            <p className="text-[11px] text-amber-200/60 italic">
              "{event.decision}"
            </p>
          )}
          {event.revision_note && (
            <p className="text-[11px] text-amber-200/50">
              📝 {event.revision_note}
            </p>
          )}
          <QualityBadge score={event.quality_score} decision={
            event.quality_score !== undefined ? (event.quality_score >= 8 ? "APPROVE" : "REJECT") : event.decision
          } />
        </div>
      )}
    </div>
  );
}

function AgentsDemoPage() {
  const totalTokens = DEMO_EVENTS.reduce((s, e) => s + (e.tokens ?? 0), 0);
  const avgScore = DEMO_EVENTS
    .filter((e) => e.quality_score !== undefined)
    .reduce((s, e, _, a) => s + (e.quality_score ?? 0) / a.length, 0);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-amber-200/40 text-xs font-mono mb-2">
          <a href="/stories/d71c78c9-420e-4865-bd5d-64e17063ae41" className="hover:text-amber-200/70 transition-colors">
            ← Story Reader
          </a>
          <span>/</span>
          <span className="text-amber-200/60">agents</span>
        </div>
        <h1 className="text-2xl font-bold text-amber-100">🕷️ Anansi and the Silk Cotton's Secret</h1>
        <p className="text-sm text-amber-200/40 mt-1">Agent debug timeline · {DEMO_EVENTS.length} events · {totalTokens.toLocaleString()} tokens</p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Chapters", value: "2", icon: "📖" },
          { label: "Agent Events", value: String(DEMO_EVENTS.length), icon: "⚡" },
          { label: "Avg Quality", value: avgScore.toFixed(1) + "/10", icon: "⭐" },
          { label: "Revisions", value: "1", icon: "✏️" },
        ].map((stat) => (
          <div key={stat.label} className="bg-slate-800/50 rounded-xl border border-slate-700/40 p-3 text-center">
            <div className="text-lg">{stat.icon}</div>
            <div className="text-sm font-bold text-amber-100">{stat.value}</div>
            <div className="text-[10px] text-amber-200/40">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Ogma quality gate callout */}
      <div className="bg-purple-900/30 border border-purple-500/40 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-purple-400">📜</span>
          <span className="text-sm font-semibold text-purple-300">Ogma Quality Gate</span>
          <span className="ml-auto text-[10px] text-purple-300/60">LLM-as-judge · claude-haiku-4-5</span>
        </div>
        <p className="text-xs text-purple-200/60">
          Chapter 1 failed initial review (6.2/10) — dialect inauthenticity and generic spider metaphors.
          Anansi revised with stronger Trinidadian patois and silk-cotton tree symbolism.
          Second review approved at <strong className="text-purple-200/90">8.7/10</strong>. Chapter 2 approved first-pass at 8.4/10.
        </p>
      </div>

      {/* Event timeline */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-amber-200/40 uppercase tracking-widest">Agent Event Timeline</h2>
        {DEMO_EVENTS.map((event, i) => (
          <EventCard key={event.id} event={event} index={i} />
        ))}
      </div>
    </div>
  );
}

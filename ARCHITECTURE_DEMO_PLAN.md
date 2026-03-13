# SandSync — Architecture Demo Plan
**Version:** 1.0 | **Author:** Kit | **Date:** 2026-03-13  
**Target Duration:** 90–120 seconds  
**Deadline:** Mar 20, 2026

---

## 🔑 The Core Insight

> **We already have the perfect right panel: `/stories/:id/agents`**

The Agent Debug View (`/stories/:id/agents`) is already built. It:
- Shows live agent events via **PowerSync queries** updating in real-time
- Uses `useQuery()` from `@powersync/react` — data flows Supabase → PowerSync WASM → UI
- Displays Papa Bois, Anansi, Ogma, Devi, Imagen with latency, tokens, quality scores
- Shows the revision loop (Ogma rejects → Anansi revises → Ogma approves) visually

This **is** the architecture visualizer. No custom dashboard needed.

---

## 🎬 Recommended Visualization: Hybrid Option D+E (existing page + offline toggle)

| Component | What It Shows | How |
|-----------|--------------|-----|
| Left panel | App UI — story creation → reader | Live browser recording |
| Right panel | `/stories/:id/agents` — real-time flow | Live browser recording (second tab/window) |
| Offline demo | Chrome DevTools Network → Offline | On-screen DevTools toggle |
| Architecture intro | Animated flow diagram | Post-production (Finn) |

**Why not full custom dashboard (pure Option D)?**  
The agent debug view already exists, is beautiful, and shows real data. Building another is wasted time. Finn adds the static architecture diagram in post.

**Why not just DevTools (Option C)?**  
Too raw for judges. The agent view communicates architecture more clearly than HTTP request logs.

---

## 📐 Screen Layout for Recording

```
┌─────────────────────────────────────────────────────────────────┐
│                    Browser Window (1920×1080)                    │
├──────────────────────────────┬──────────────────────────────────┤
│                              │                                  │
│   LEFT: App UI               │   RIGHT: Agent Debug View        │
│   localhost:5173             │   localhost:5173/stories/:id     │
│                              │            /agents               │
│   • Homepage (story form)    │                                  │
│   • Story reader (loading)   │   • Papa Bois → started/done     │
│   • Story reader (complete)  │   • Anansi → started → revised   │
│   • Audio player visible     │   • Ogma → score 6.8 → reject    │
│   • PowerSync status pill    │   • Anansi → revised → 8.1 ✅    │
│                              │   • Devi → generating audio      │
│                              │   • Imagen → FLUX image done     │
│                              │                                  │
└──────────────────────────────┴──────────────────────────────────┘
```

Set up via: two browser windows side-by-side, or OBS two-scene composite.

---

## 🗓️ Video Structure (Segment-by-Segment)

### Segment 0 — Architecture Intro (10s) — POST-PRODUCTION
*Built by Finn in post. No live recording.*

**What's shown:**
```
[Animated diagram fades in]

  User Browser
  ┌─────────────────────────────────────┐
  │  React App  │  PowerSync SQLite WASM │
  └──────┬──────┴───────────┬───────────┘
         │ HTTP POST        │ Real-time sync
         ▼                  ▼
  ┌──────────────┐   ┌──────────────────┐
  │  Mastra API  │   │  Supabase        │
  │  (Bun/Hono)  │   │  PostgreSQL +    │
  │              │   │  Realtime        │
  │  Papa Bois   │   └──────────────────┘
  │  Anansi      │
  │  Ogma (judge)│──→ agent_events table
  │  Devi        │──→ story_chapters table
  │  Imagen      │
  └──────┬───────┘
         │
   ┌─────┼──────┐
   ▼     ▼      ▼
 fal.ai Deepgram ElevenLabs
 FLUX   TTS     TTS
```

**Voiceover (Finn/Papa Bois voice):**  
*"SandSync is a fully offline-first AI storytelling platform. Stories sync through PowerSync's SQLite WASM layer. The Mastra pipeline coordinates four AI agents. Let me show you exactly how it works."*

---

### Segment 1 — Story Request (15s) — LIVE RECORDING

**Screen:** Split view. Left = App homepage. Right = Agent Debug View (empty, "0 events").

**Actions:**
1. User types/selects a genre ("Soucouyant mystery" 🔥) + theme
2. Clicks "Summon Story" — particle burst animation fires
3. App navigates to `/stories/:id` (story loading state)
4. RIGHT PANEL simultaneously: First event appears — `papa_bois: started`

**PowerSync story here:**  
Story record is immediately written to Supabase → PowerSync syncs it to local SQLite → app reads it locally. No loading spinner waiting on Supabase — it's already in the local cache.

**Post label (Finn adds):** Arrow pointing to right panel — *"Real-time via PowerSync"*

---

### Segment 2 — The AI Pipeline Fires (30s) — LIVE RECORDING

*This is the centrepiece. The agent debug view filling up in real-time is the entire story.*

**Screen:** Split view stays. Focus on RIGHT PANEL.

**Watch the flow unfold:**
```
papa_bois:   started  → [0.4s later] → completed  (brief generated)
anansi:      started  → [3.2s later] → completed  (chapter draft 1)
ogma:        started  → [1.8s later] → completed  [SCORE: 6.8 — REJECTED]
anansi:      started  → [3.5s later] → completed  (chapter revised)
ogma:        started  → [1.2s later] → completed  [SCORE: 8.4 — APPROVED ✅]
devi:        started  → [5s later]   → completed  (audio ready)
imagen:      started  → [8s later]   → completed  (FLUX image ready)
```

**Key visual moment:** Ogma rejects the first draft with score 6.8. Anansi revises. Ogma approves at 8.4. **This is the LLM-as-judge loop visible live** — not in logs, not in docs, but in the UI.

**LEFT PANEL simultaneously:** Story reader shows chapters loading one by one via PowerSync — `story_chapters` rows written to Supabase, synced to browser, displayed reactively.

**Post labels (Finn adds):**
- Arrow to Ogma score: *"LLM-as-Judge quality gate (Ogma via qwen2.5)"*
- Arrow to latency times: *"Latency visible per agent"*
- Arrow to left panel: *"Chapters appear via PowerSync SQLite sync"*

---

### Segment 3 — Story Complete with AI Assets (15s) — LIVE RECORDING

**Screen:** Switch to full left panel (app reader).

**Show:**
1. Story title and first chapter text (Anansi's prose — beautiful Caribbean folklore)
2. FLUX illustration has loaded (fal.ai image under the chapter)
3. Audio player visible — tap play → Deepgram/ElevenLabs voice narrates the chapter
4. PowerSync status indicator in header: `● Synced` (green pill)

**Voiceover / on-screen text:**  
*"Four AI agents collaborated. Images via fal.ai FLUX. Voice via Deepgram Aura. All synchronized offline-first."*

---

### Segment 4 — The Offline Demo (25s) — LIVE RECORDING

*This is the PowerSync value prop. This is why you're not just using a REST API.*

**Setup:** Have Chrome DevTools Network tab open but minimised. App is open on the story reader.

**Actions:**
1. **[ON-SCREEN]** Press F12 → DevTools → Network → Toggle to "Offline"  
   A subtle banner appears in the app: *"Sync connection failed. Working offline with local cache."*  
   (This already exists in `__root.tsx`)

2. **Continue using the app:**  
   - Scroll through the story — **it loads instantly** (local SQLite)
   - Play audio — works (audio file served from API, already loaded/cached)
   - Navigate back to story list — **all stories visible** (local cache)

3. **Try to create a new story while offline:**  
   - POST to API fails immediately
   - App shows error state (existing error handling)
   - *Note: PowerSync queues write ops locally — add a brief annotation here*

4. **Toggle back online:**  
   - DevTools → Network → toggle off "Offline"
   - Header sync error banner disappears
   - PowerSync status → `● Syncing...` → `● Synced`
   - Any new events/chapters that appeared while offline stream in

**Post labels (Finn adds):**
- When toggling offline: *"Network disabled — PowerSync keeps reading from local SQLite"*
- When browsing offline: *"Zero network requests — all local"*
- When coming back online: *"PowerSync resumes sync automatically"*

---

### Segment 5 — Architecture Callout (10s) — POST-PRODUCTION

*Finn freezes the split-screen frame from Segment 2 and adds animated callout labels.*

**Animated labels appearing one by one:**
- Browser left panel → *"PowerSync SQLite WASM (in-browser)"*
- Browser right panel → *"agent_events synced via PowerSync Realtime"*  
- (implied) Supabase → *"PostgreSQL + Realtime subscriptions"*
- (implied) Mastra API → *"Papa Bois · Anansi · Ogma · Devi · Imagen"*
- (implied) External APIs → *"fal.ai FLUX · Deepgram · ElevenLabs"*

**Duration:** 10s, each label fades in with ~1.5s delay.

---

### Segment 6 — Closing (5s) — POST-PRODUCTION

- App logo + tagline: *"SandSync — Caribbean Folklore, Reimagined"*
- *"PowerSync AI Hackathon 2026"*
- Fade to black

---

## 🛠️ Technical Implementation

### What Needs to Be Built (Pre-Recording)

#### 1. PowerSync Status Pill in Header (30 min, ~20 lines)
The `usePowerSyncStatus()` hook is already imported in `$id.tsx`. We need to surface a visible sync status in the **header** so judges can see it go offline/online.

**Add to `__root.tsx` header nav:**
```tsx
import { usePowerSyncStatus } from "@powersync/react";

// Inside RootComponent nav:
const syncStatus = usePowerSyncStatus();

// Replace current subtitle span:
<div className="flex items-center gap-3">
  <span className="text-xs text-amber-200/60">Caribbean Folklore AI</span>
  <span className={`text-xs px-2 py-0.5 rounded-full border font-mono ${
    !syncStatus.connected 
      ? "bg-red-500/20 text-red-400 border-red-400/40" 
      : syncStatus.hasSynced 
      ? "bg-green-500/20 text-green-400 border-green-400/40"
      : "bg-amber-500/20 text-amber-400 border-amber-400/40"
  }`}>
    {!syncStatus.connected ? "⚠ Offline" : syncStatus.hasSynced ? "● Synced" : "◌ Syncing"}
  </span>
</div>
```

**Why this matters for demo:** Judges can SEE the sync state change in real-time as we toggle offline/online. This makes the PowerSync value prop visceral.

#### 2. Pre-flight Check: Ensure Servers Are Running
Before recording, verify:
```bash
# API running on 3002
curl http://localhost:3002/health

# Web app running on 5173
curl http://localhost:5173

# Supabase local or cloud connected
# Check $SUPABASE_URL in apps/api/.env.local
```

#### 3. Demo Story Pre-Warm (Optional)
For a reliable demo, run one story through the pipeline 30 min before recording to confirm everything works end-to-end. Don't use this story for the demo — just validate the pipeline.

#### 4. Browser Setup
- Chrome (not Firefox — PowerSync WASM works best in Chrome)
- DevTools → Network tab open but minimized
- Zoom level: 90% (fits more content)
- Split: two Chrome windows side-by-side, each ~960px wide

---

## 🎥 Filming Approach (for Finn)

### What Finn Records (Live Screen Capture)
1. **Single continuous take** of Segments 1–4 (~85s)  
   - Both windows visible simultaneously via dual-window split or OBS
   - Record at 1920×1080, 30fps
   - Audio: no microphone during live recording (add voiceover in post)

2. **Separate take** of DevTools offline toggle (clean, deliberate)  
   - Slow and visible so judges can follow

### What Finn Builds in Post
1. **Segment 0** (~10s): Animated architecture diagram  
   - Tools: Motion/After Effects/Remotion — whichever Finn prefers
   - Keep it simple: boxes, arrows, fade-in labels
   - Background: match the SandSync dark purple/indigo theme

2. **Callout labels** on Segment 2 (agent pipeline):  
   - Pause/slow the recording at the Ogma rejection moment
   - Add text annotations pointing to score, revision, approval

3. **Callout labels** on Segment 4 (offline demo):  
   - Freeze frame when offline toggle fires, add label
   - Arrow to sync status pill as it goes red

4. **Voiceover** (optional, Papa Bois voice from ElevenLabs):  
   - Short, 2–3 lines max
   - Segment 0 and Segment 4 only

5. **Music** (optional):  
   - Soft Caribbean ambience — low under the recording, fade out on close

### Filming Checklist
- [ ] PowerSync status pill added to header
- [ ] Servers running (API + web + Supabase)
- [ ] Clean browser (no personal bookmarks/extensions visible)
- [ ] Story list has 2–3 existing stories (looks populated)
- [ ] DevTools minimized but accessible
- [ ] Screen resolution: 1920×1080
- [ ] Two chrome windows positioned: left=app UI, right=agent debug view

---

## ⏱️ Timing Breakdown

| Task | Owner | Time |
|------|-------|------|
| Add PowerSync status pill to header | Kit | 30 min |
| Pre-flight + pipeline dry run | Kit | 30 min |
| Browser setup + recording prep | Finn | 20 min |
| Live recording (multiple takes) | Finn | 30 min |
| Post: architecture diagram (Segment 0) | Finn | 45 min |
| Post: callout labels + annotations | Finn | 30 min |
| Post: voiceover + music | Finn | 20 min |
| Post: final cut + export | Finn | 15 min |
| **Total** | | **~3.5 hours** |

*If time is tight, skip the architecture diagram (Segment 0) and go straight to live recording. The agent debug view tells the story without it.*

---

## 🛟 Fallback Options

| Risk | Fallback |
|------|----------|
| Pipeline is too slow (agents take 60s+) | Pre-record a full pipeline run, use it as the "right panel" recording |
| Agent events don't arrive fast enough to look good on camera | Run a real story async BEFORE the demo, then replay by opening existing story's `/agents` page — the events are already there |
| Offline toggle is flaky / PowerSync reconnects too fast | Use Chrome DevTools → Throttling → "Slow 3G" instead of full offline — shows partial sync degradation |
| Split screen recording is hard in available tools | Forget split screen — record the agent debug view full-screen, then cut to app UI separately. Less impressive but still works |
| fal.ai image doesn't generate during recording | Have a pre-generated image in a test story to show as static screenshot of the completed state |
| ElevenLabs quota hit | Deepgram TTS fallback is already in the pipeline — demo still works, just different voice |
| App crashes mid-recording | Keep 1Password open with API keys, Supabase has `stories` data → restart app and navigate directly to a previously generated story for segments 3–4 |

---

## 🏆 Why This Plan Works for Judges

| Judge Criterion | How We Address It |
|----------------|------------------|
| How does data flow? | Agent debug view shows EVERY step: started → completed with latency |
| How does PowerSync enable offline? | Live offline toggle — browser keeps working with local SQLite |
| How does Supabase sync back? | Agent events written to Supabase → appear in browser via PowerSync in real-time |
| What products are integrated? | Papa Bois uses Claude, Anansi uses Claude, Ogma uses qwen2.5, Devi uses Deepgram/ElevenLabs, Imagen uses FLUX — all visible in agent trace |
| Why is this architecture innovative? | LLM-as-judge loop (Ogma rejecting + Anansi revising) visible live — this is NOT standard |
| PowerSync value prop is clear? | Going offline and continuing to read/browse makes it undeniable |

---

## 📎 Files Referenced

- **App:** `apps/web/app/routes/__root.tsx` — add status pill here
- **Agent debug view:** `apps/web/app/routes/stories/$id.agents.tsx` — already complete
- **Story reader:** `apps/web/app/routes/stories/$id.tsx` — already uses `usePowerSyncStatus()`
- **PowerSync schema:** `apps/web/app/lib/powersync.ts` — `agent_events`, `stories`, `story_chapters`
- **Pipeline:** `apps/api/src/mastra/workflows/story-pipeline.ts` — all agent steps

---

## 🚀 Next Steps (After Greenlight)

1. **Kit:** Add PowerSync status pill to `__root.tsx` header (30 min)
2. **Kit:** Run pre-flight test — submit a story, watch the full pipeline, confirm audio + image generate
3. **Finn:** Record the live demo following this plan
4. **Finn:** Add Segment 0 architecture diagram + callout labels in post
5. **Loki:** Review cut, approve, submit to hackathon portal

**Greenlight question for Nissan:**  
> Do we want the architecture intro diagram (Segment 0), or should we go straight to the live demo? The diagram takes 45 min of Finn's post-production time but gives judges an instant mental model.

---

*Plan authored by Kit — awaiting greenlight before execution.*

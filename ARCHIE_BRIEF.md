# ARCHIE_BRIEF.md — SandSync Hackathon Review
**Prepared by Archie (research specialist) · 2026-03-15**
**Deadline: Mar 20, 2026 11:59 PM PT**

---

## TL;DR
SandSync is genuinely impressive but has 3 critical gaps that will cost prizes: (1) PowerSync may not be doing real cloud sync, (2) the story reader reads from API first and PowerSync second — backwards for a "local-first" claim, (3) the README is nearly useless for submission. Story quality is excellent. Pipeline visualisation is slick. Fix the fundamentals first.

---

## What's Genuinely Strong

### Story quality: **Outstanding**
The AI output from the API `/stories` endpoint is legitimately good Caribbean oral tradition voice:
- Consistent oral formula: *"Listen now, and I go tell you how it start..."*
- Real Trinidadian place names: Moruga, Caroni, Northern Range
- Authentic dialect: *"the cane was high-high," "blue hour settling... like a silk veil," "night not quite reach"*
- Named folklore creatures used correctly: Soucouyant, Mama Dlo, Papa Bois, Lagahoo, La Diablesse
- The writing reads like actual Caribbean storytelling, not generic AI fantasy

This is the project's biggest differentiator. Lean into it hard in the pitch.

### Pipeline visualisation: **Excellent**
`/pipeline-demo` is the demo's strongest asset:
- Real-time node graph: User Input → PowerSync Write → Mastra → Papa Bois → Anansi ⟷ Ogma → ElevenLabs + fal.ai → Supabase → PowerSync Sync → Published
- Amber pulse animation on active nodes, green on complete, red on failed
- Live agent event streaming with structured cards (score, latency, cost, cultural notes)
- Deepgram STT voice input mode (speak your prompt, edit transcript, confirm)
- Standalone demo mode (`?demo=1`) for safe offline presentations

### Mastra usage: **Genuinely deep**
- `createWorkflow` + `createStep` + `.then().then().commit()` — proper Mastra workflow primitives
- 3-step sequential pipeline with typed Zod schemas at each step boundary
- Agent-to-agent handoffs through Mastra workflow (not just raw LLM calls)
- LLM-as-judge revision loop: Ogma scores 0-10, rejects below 7.5, triggers Anansi revision, max 2 cycles
- Rich `agent_events` telemetry written to Supabase (visible in pipeline debug panel)
- Specific model routing: Claude Haiku (Papa Bois, Anansi, Devi) + qwen3:4b local (Ogma)

### PowerSync SDK: **Wired up, but needs verification**
- `@powersync/web` ^1.35.0, `@powersync/react` ^1.9.0
- Schema defined: `stories`, `story_chapters`, `agent_events` tables
- `PowerSyncContext.Provider` wraps entire app in `__root.tsx`
- `usePowerSyncStatus()` → live Synced/Offline/Syncing pill in navbar
- `useQuery()` used on homepage and story reader
- **SEE CRITICAL GAP #1 BELOW** — connector config not visible in powersync.ts

### TanStack Router: **Correctly used**
- `@tanstack/react-router` ^1.166.3 (the right package — Router, not just Query)
- `createRootRoute` + `createFileRoute` on every page
- Type-safe params: `Route.useParams()` → `const { id } = Route.useParams()` in story reader
- `TanStackRouterDevtools` included
- File-based routing: `/stories/$id`, `/stories/$id.agents`, `/pipeline-demo`, `/showcase`

### Supabase: **Active and in use**
- Health endpoint confirms: `{"ok":true,"mastra":true,"supabase":true}`
- Postgres: stories + story_chapters + agent_events
- Storage: audio (`story-audio/`) and images (`story-images/`) — public CDN URLs confirmed in API
- Recent stories (last 8) all have both `image_url` AND `audio_url` — pipeline fully working

### Multi-provider resilience: **Impressive for a hackathon**
- ElevenLabs TTS → Deepgram TTS fallback → Kokoro local fallback
- fal.ai FLUX → Gemini Imagen → local Flux.1-schnell fallback
- Both cascades fully implemented with error handling and retry scheduling

---

## Critical Gaps (Risk of Losing Prizes)

### 🔴 GAP 1: PowerSync connector may not be doing real cloud sync
**This is the main prize risk.**

`apps/web/app/lib/powersync.ts` creates `PowerSyncDatabase` with only `schema` and `dbFilename`. There is no `PowerSyncBackendConnector` visible — no URL, no token fetch, no `fetchCredentials`. Without a connector, PowerSync runs as local SQLite only; it cannot sync to/from the PowerSync cloud service.

**Check immediately:** Does `powerSyncDatabase.connect()` in `__root.tsx` actually connect to a PowerSync backend instance? The `connect()` call exists but without a connector passed to `PowerSyncDatabase`, it may be a no-op or using a connector defined elsewhere.

**Action:** Find where the connector is defined (may be in a separate file not reviewed). If it doesn't exist, implement `PowerSyncBackendConnector` with `fetchCredentials()` hitting a `/api/auth/powersync-token` endpoint. This is ~30 lines. Without it, the main prize is gone.

### 🔴 GAP 2: Story reader reads from API first, PowerSync second
In `apps/web/app/routes/stories/$id.tsx`:
```typescript
// API fetch state (primary source)
const [apiStory, setApiStory] = useState<any>(null);

// PowerSync queries (secondary — real-time updates if PS is connected)
const { data: storyArray } = useQuery<Story>("SELECT * FROM stories WHERE id = ?", [id]);
```

The comment says it clearly: API is primary, PowerSync is secondary. A local-first app should do the opposite. The story should load instantly from SQLite (PowerSync), with API as a network fallback.

**Action:** Invert this. Read from PowerSync first. If `storyArray` has data, render immediately. Only fall back to API fetch if PowerSync has nothing. This is the difference between "we use PowerSync" and "we ARE local-first."

### 🟡 GAP 3: No visible offline scenario
Judges for both PowerSync (main) and Best Local-First ($500) will look for proof that offline actually works — not just a status pill. There is no UI element, button, or demo mode that explicitly shows: "we went offline, stories still loaded, we reconnected, new stories synced."

**Action:** Add an "Offline Demo" mode button (ideally in pipeline-demo, or a dedicated `/offline-demo` page) that shows: go offline → stories still readable → new story request queued → reconnect → synced. Even a GIF in README demonstrating this would help. The `?demo=1` mode exists for pipeline viz — do the same for offline.

### 🟡 GAP 4: Showcase gallery has 8 duplicate story titles
The `/stories` API returns 20 stories. **8 of them** are titled "Anansi and the Lion's Pride" with identical genre tags. The showcase gallery will look like a broken test run, not a polished demo. Judges will see this immediately.

**Action:** Delete the duplicates from Supabase. Seed 5-6 diverse showcase stories covering different genres: Anansi, Papa Bois, Soucouyant, La Diablesse, Mama Dlo, Lagahoo. The existing non-duplicate stories (Fisherman's Bargain, The Girl Between the Silk Cotton Trees, Anansi and the Golden-Maned Stranger, The Waterfall's Blessing) are good — keep those.

### 🟡 GAP 5: README is submission-blocker incomplete
Based on SUBMISSION_CHECKLIST.md, the README is missing:
- [ ] Live demo URL (https://web-eta-black-15.vercel.app) — not present
- [ ] Architecture section / data flow description
- [ ] PowerSync Sync Streams explicitly named and described
- [ ] Offline scenario described in text
- [ ] All 5 agents named with roles
- [ ] Mastra section with code example
- [ ] TanStack Router section
- [ ] Supabase section (RLS documented?)
- [ ] Video link (no video recorded yet)
- [ ] Local-first claim not present

Without these, multiple prize categories are at immediate risk. This is a 90-minute writing task.

---

## Top 5 High-Impact Improvements
**Ranked by: prizes won × implementation ease × demo impact**

### 1. Verify + Fix PowerSync Connector (Priority: CRITICAL)
**Prizes at risk:** Main prize (PowerSync), Best Local-First ($500)
**Time:** 2-4 hours
**Impact:** Disqualification risk → prize contender

Find the PowerSyncBackendConnector. If it doesn't exist, implement:
```typescript
// In powersync.ts, add:
class SandSyncConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const res = await fetch(`${API_URL}/auth/powersync-token`);
    const { token, powersync_url } = await res.json();
    return { endpoint: powersync_url, token };
  }
  async uploadData(database) { /* offline write queue */ }
}
export const connector = new SandSyncConnector();
// Then: powerSyncDatabase.connect(connector)
```

### 2. Invert Story Reader to Local-First (Priority: HIGH)
**Prizes at risk:** Best Local-First ($500), PowerSync main prize
**Time:** 1 hour
**Impact:** Architectural integrity — makes the "local-first" claim true

Swap primary/secondary data sources in `stories/$id.tsx`. Read PowerSync first, API second. Show "📡 Loading from local cache" vs "🔄 Fetching from network" as a status indicator.

### 3. Rewrite README (Priority: HIGH)
**Prizes at risk:** All 5 categories — submission checklists for most require README evidence
**Time:** 90 minutes
**Impact:** Every judge reads it before the live demo

Structure: What it is (2 sentences) → Live demo link → Architecture diagram (ASCII/Mermaid) → PowerSync section (Sync Streams, local SQLite as primary, offline scenario) → Mastra section (code snippet of workflow) → TanStack Router section (createFileRoute, type-safe params) → Supabase section (Postgres + RLS + Storage) → Agent pipeline table → Getting started.

### 4. Clean Showcase + Seed Diverse Stories (Priority: MEDIUM)
**Prizes at risk:** Demo impact (all prizes — judges browse the showcase)
**Time:** 30 minutes
**Impact:** First visual impression goes from "broken dev testing" to "polished product"

Delete the 8 duplicate "Anansi and the Lion's Pride" stories from Supabase. Generate one story per folklore type via the pipeline: Anansi, Papa Bois, Soucouyant, La Diablesse, Lagahoo, Mama Dlo. Choose one with audio + image as the featured story on the showcase hero.

### 5. Add Sync Visibility Panel to Pipeline Demo (Priority: MEDIUM)
**Prizes at risk:** PowerSync main prize, Best Local-First ($500)
**Time:** 2 hours
**Impact:** Judges can SEE sync happening, not just trust it's happening

Add a small "Sync Monitor" panel to the pipeline-demo page:
- Shows PowerSync status (Connected/Offline/Syncing) with the actual `usePowerSyncStatus()` hook
- Shows local SQLite row count for `stories` table
- When story completes, show "✅ Story synced to local SQLite (3 rows written)"
- A "Simulate Offline" toggle that calls `powerSyncDatabase.disconnect()` and shows stories still loading from SQLite
This is the definitive proof for judges that PowerSync is doing real work.

---

## UI/UX Improvements That Would Help Live Demo

- **Showcase grid cards:** The genre-gradient cards look good, but need to deduplication first. Keep the audio preview button (it's clever).
- **Audio player prominence:** ElevenLabs narration exists but `<audio controls>` HTML element is small/ugly. The AudioPlayer component exists (`AudioPlayer.tsx`) — make sure it's used prominently in the story reader. Judges should notice the audio immediately.
- **Pipeline timing callouts:** The pipeline debug panel shows latency per step — add a "total cost: $X.XXXX" running total visible in the pipeline viz (not just in the debug panel). Judges love cost transparency.
- **Homepage:** The homepage is very minimal. Add a hero with 2-3 sentences and a "Try the Pipeline →" CTA. Link directly to `/pipeline-demo`.
- **Sync pill:** The "Synced/Offline/Syncing" pill in the navbar is subtle. Make it slightly larger and add a tooltip: "Stories cached locally via PowerSync". Judges may not even notice the pill exists.
- **Voice mode:** The Deepgram STT voice input is a great feature but hidden. Add a brief "🎤 or speak your prompt" label on the pipeline demo page to draw attention to it.

---

## Missing Sponsor Visibility

| Sponsor | In UI | In README | Notes |
|---------|-------|-----------|-------|
| PowerSync | ✅ "PowerSync" in nav pill + pipeline node | ❌ | Add Sync Streams mention, offline-first claim |
| Mastra | ✅ Pipeline node labeled "Mastra Orchestrator" | ❌ | No README section, no code example |
| TanStack | ❌ Not mentioned anywhere in UI | ❌ | Add "Built with TanStack Router" to footer |
| ElevenLabs | ✅ "ElevenLabs" in pipeline node + stack legend | ❌ | Voice narration is a key feature — mention in README |
| fal.ai | ✅ "fal.ai FLUX" in pipeline node | ❌ | Image generation visible in showcase |
| Supabase | ✅ Stack legend ("Postgres + real-time") | ❌ | No RLS mention |
| Deepgram | ✅ Stack legend ("Speech-to-text") | ❌ | STT fallback isn't documented |

**Quick win:** Add a `## Built With` section to README with logos/links for all sponsors. Add TanStack Router to the navbar or footer ("Powered by TanStack Router"). One line each, done.

---

## Audio UX Assessment

**Good:**
- ElevenLabs narration actually works — recent 8 stories all have `audio_url` pointing to Supabase Storage
- Showcase cards have a play/pause button (one-tap audio from gallery view)
- Story reader uses an `AudioPlayer` component

**Problems:**
- 12 of 20 stories in the API have `audio_url: null` — older stories never got Devi narration. These appear in the showcase and look broken.
- The ElevenLabs voice (SOYHLrjzK2X1ezoPC6cr — multilingual_v2) narrates the whole chapter, not just the excerpt. First-time listeners won't know to wait through it.
- Audio player in story reader needs to autoplay or have a prominent "Listen to this story" CTA.

**Fix:** Filter showcase to only show stories with both `image_url AND audio_url`. Run Devi narration on the remaining stories (or delete them from showcase). This takes one script.

---

## Prize-Specific Gap Analysis

### 🏆 Best Use of PowerSync (Main Prize)
**Have:** SDK installed, schema defined, `useQuery()` used, sync status pill visible
**Missing:** Verified cloud sync working (connector TBD), local-first read pattern, offline scenario demo, Sync Streams explicitly named in README
**Verdict:** 6/10 currently. Fix connector + invert story reader → 9/10.

### 🥈 Best Local-First ($500)
**Have:** PowerSync SDK, local SQLite schema, sync status indicator
**Missing:** Stories read from API first (not SQLite), no offline scenario documented or demonstrable, README doesn't claim "local-first"
**Verdict:** 4/10 currently. Invert primary source + add offline demo + README update → 8/10.

### 🥈 Best Use of Supabase ($1,000 credits)
**Have:** Postgres active, Storage working (audio + images confirmed), API health confirms supabase:true
**Missing:** RLS policies not visible from code reviewed (need to check migrations), README has no Supabase section
**Verdict:** 7/10 currently. Document RLS + README section → 8/10. Check `supabase/migrations/` for RLS policies.

### 🥈 Best Use of Mastra ($500)
**Have:** `createWorkflow`, `createStep`, 3-step pipeline, agent-to-agent handoffs, LLM-as-judge loop, Zod schemas, model routing
**Missing:** README doesn't have a Mastra section, no code examples linked
**Verdict:** 9/10 on implementation. 5/10 on documentation. Add README section with code snippet → 9/10 overall.

### 🎁 Best Use of TanStack (1:1 with Tanner)
**Have:** `@tanstack/react-router` ^1.166.3, `createFileRoute` on every route, `createRootRoute`, `Route.useParams()` for type-safe params, `TanStackRouterDevtools`
**Missing:** Nothing substantive on implementation — but TanStack is not mentioned ANYWHERE in the UI or README. Tanner will look at the README first.
**Verdict:** 8/10 on implementation. 2/10 on visibility. This is an easy win — just write it up.

---

## README vs SUBMISSION_CHECKLIST Gap

All 🔴 REQUIRED items at risk:

| Checklist Item | Status |
|---|---|
| README exists + describes project | ⚠️ Exists but minimal (no live URL, no architecture) |
| README includes how to run locally | ✅ `bun install`, `supabase start`, `bun dev` |
| README links to live demo URL | ❌ Missing |
| Architecture section | ❌ Missing |
| PowerSync Sync Streams named | ❌ Missing |
| Data flow diagram (Client → PowerSync → SQLite → Supabase) | ❌ Missing |
| Offline scenario described | ❌ Missing |
| All 5 agents named with roles | ⚠️ Agent pipeline diagram exists but brief |
| Tech stack table | ✅ Present |
| Demo video recorded + linked | ❌ Not done |
| Submission form filled | ❌ Not done |

**Priority order based on time remaining:**
1. Record demo video (30 mins) — single highest-value artifact
2. Fix PowerSync connector if broken (2-4 hours) — main prize risk
3. Rewrite README (90 mins) — unlocks all bonus prizes  
4. Clean showcase (30 mins) — demo impact
5. Invert story reader to local-first (1 hour) — local-first prize
6. Submit form (10 mins) — don't miss deadline

---

## Things That Are Genuinely Not Problems

- **Story content quality:** It's excellent. The Caribbean dialect, place names, and folklore accuracy are real.
- **fal.ai image generation:** Working, images look good based on naming convention (FLUX/Schnell at landscape_4_3)
- **Pipeline demo page:** One of the best live pipeline visualisations I've seen in a hackathon. Keep it exactly as-is.
- **Multi-agent naming:** Papa Bois, Anansi, Ogma, Devi, Imagen — culturally resonant, memorable, makes the pitch story compelling.
- **Mastra workflow code:** Production-quality. No shortcuts. The LLM-as-judge loop is genuine ML systems work.
- **ElevenLabs TTS fallback chain:** Three fallbacks (Deepgram, Kokoro) is beyond what most hackathon submissions do.
- **API is alive and fast:** `/health` responds in 217ms, `/stories` in 166ms. Fly.io instance is warm.

---

*Archie (research specialist) · OpenClaw Agent Team · Redditech Pty Ltd*
*Reviewed: live URLs × codebase × submission checklist × prize requirements*

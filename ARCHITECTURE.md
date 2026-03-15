# SandSync — Architecture

> Full technical reference for the PowerSync AI Hackathon 2026 submission.
> See [README.md](./README.md) for the project overview.

---

## Contents

1. [Full Data Flow](#full-data-flow)
2. [PowerSync Sync Streams](#powersync-sync-streams)
3. [Offline Scenario Walkthrough](#offline-scenario-walkthrough)
4. [Agent Pipeline](#agent-pipeline)
5. [Storage Architecture](#storage-architecture)
6. [Database Schema](#database-schema)

---

## Full Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│  USER ACTION: "Tell me a Papa Bois story"                               │
└─────────────────────┬───────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  FRONTEND (React 19 + TanStack Router)                                  │
│                                                                         │
│  1. User speaks prompt → Deepgram STT → text                           │
│     OR user types prompt directly                                       │
│  2. POST /stories to API with { prompt, user_id }                      │
│  3. PowerSync SDK watches local SQLite for changes                      │
│     → React components re-render reactively on new data                │
└─────────────────────┬───────────────────────────────────────────────────┘
                       │ HTTP POST
                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  API (Mastra Workflow Engine — Fly.io)                                  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────┐           │
│  │ STEP 1 — Papa Bois (Orchestrator)                        │           │
│  │  Model: Claude Sonnet 4.5 (Anthropic)                   │           │
│  │  Input: raw user prompt                                  │           │
│  │  Output: StoryBrief { title, genre, mood,                │           │
│  │          protagonist, setting, folklore_elements[],      │           │
│  │          themes[], chapter_count }                       │           │
│  │  Writes: stories row to Supabase (status=queued)         │           │
│  └─────────────────────────┬───────────────────────────────┘           │
│                             │                                           │
│  ┌──────────────────────────▼──────────────────────────────┐           │
│  │ STEP 2 — Anansi ⟷ Ogma Loop (per chapter)               │           │
│  │                                                          │           │
│  │  Anansi (Claude Sonnet 4.5):                            │           │
│  │    Writes chapter draft with Caribbean dialect           │           │
│  │    Incorporates Ogma's rejection_reason if revising      │           │
│  │                                                          │           │
│  │  Ogma (Groq Llama — fast inference):                    │           │
│  │    Scores 0–10 on: narrative quality, cultural           │           │
│  │    authenticity, dialect consistency, folklore accuracy  │           │
│  │    Threshold: 7.5 → approve | < 7.5 → reject            │           │
│  │    Rejection: structured bullets → fed back to Anansi   │           │
│  │    Max 3 attempts, then force-approve                    │           │
│  │                                                          │           │
│  │  On approve: writes story_chapters row (status updating) │           │
│  └──────────────────────────┬───────────────────────────────┘          │
│                             │ parallel                                  │
│              ┌──────────────┴──────────────┐                           │
│              │                             │                           │
│  ┌───────────▼────────────┐  ┌────────────▼────────────┐              │
│  │ STEP 3a — Devi          │  │ STEP 3b — Imagen         │              │
│  │ ElevenLabs TTS          │  │ fal.ai FLUX Schnell      │              │
│  │                         │  │                          │              │
│  │ Voice: SOYHLrjzK2X1e... │  │ Style: watercolour       │              │
│  │ Generates .mp3          │  │ Caribbean scene          │              │
│  │ Uploads → Supabase      │  │ Uploads → Supabase       │              │
│  │ Storage                 │  │ Storage                  │              │
│  │ Updates: audio_url col  │  │ Updates: image_url col   │              │
│  └───────────┬─────────────┘  └────────────┬────────────┘              │
│              └──────────────┬──────────────┘                           │
│                             │                                           │
│                             ▼                                           │
│              chapter row updated in Supabase Postgres                  │
└─────────────────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  SUPABASE POSTGRES (source of truth)                                    │
│  New/updated rows in: stories, story_chapters, agent_events             │
└─────────────────────┬───────────────────────────────────────────────────┘
                       │ replication
                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  POWERSYNC SERVICE                                                      │
│  Detects row changes, builds Sync Stream payloads                       │
└─────────────────────┬───────────────────────────────────────────────────┘
                       │ Sync Streams (WebSocket)
                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  POWERSYNC SDK (WebAssembly SQLite — every connected browser)           │
│  Updates local SQLite: stories + story_chapters + agent_events          │
│  React components re-render — chapter appears without page refresh      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## PowerSync Sync Streams

### What They Are

PowerSync Sync Streams are persistent WebSocket connections from the browser to the PowerSync Service. When a row in Supabase Postgres changes (new chapter written by an agent), the PowerSync Service detects the change via Postgres replication and pushes a delta to every connected client browser.

### What Gets Synced

Three tables are synced to local SQLite in every client browser:

| Table | Columns | Purpose |
|---|---|---|
| `stories` | title, genre, theme, status, user_id, created_at, updated_at | Story metadata and generation status |
| `story_chapters` | story_id, chapter_number, title, content, reviewed_content, audio_url, image_url, illustration_prompt, agent_trace, created_at, updated_at | Full chapter content with media URLs |
| `agent_events` | story_id, agent, event_type, payload, created_at | Pipeline progress events (started/completed/failed per agent) |

### Real-Time Chapter Delivery

As each chapter completes the Anansi → Ogma → Devi/Imagen pipeline:

1. API writes a new `story_chapters` row to Supabase Postgres
2. PowerSync Service detects the insert via Postgres WAL
3. Sync Stream pushes delta to all subscribed browsers
4. Local SQLite updated in WebAssembly worker thread
5. React components watching that query re-render — new chapter appears

This means **every browser tab watching a story sees chapters appear in real-time** as agents complete them — no polling, no manual refresh.

### Local SQLite Schema (PowerSync SDK definition)

```typescript
// apps/web/app/lib/powersync.ts
import { Schema, Table, Column, ColumnType } from "@powersync/web";

const appSchema = new Schema({
  stories: new Table({
    columns: [
      new Column({ name: "title", type: ColumnType.TEXT }),
      new Column({ name: "genre", type: ColumnType.TEXT }),
      new Column({ name: "theme", type: ColumnType.TEXT }),
      new Column({ name: "status", type: ColumnType.TEXT }),    // queued | generating | complete | failed
      new Column({ name: "user_id", type: ColumnType.TEXT }),
      new Column({ name: "created_at", type: ColumnType.TEXT }),
      new Column({ name: "updated_at", type: ColumnType.TEXT }),
    ],
  }),
  story_chapters: new Table({
    columns: [
      new Column({ name: "story_id", type: ColumnType.TEXT }),
      new Column({ name: "chapter_number", type: ColumnType.INTEGER }),
      new Column({ name: "title", type: ColumnType.TEXT }),
      new Column({ name: "content", type: ColumnType.TEXT }),
      new Column({ name: "reviewed_content", type: ColumnType.TEXT }),
      new Column({ name: "audio_url", type: ColumnType.TEXT }),    // Supabase Storage URL
      new Column({ name: "image_url", type: ColumnType.TEXT }),    // Supabase Storage URL
      new Column({ name: "illustration_prompt", type: ColumnType.TEXT }),
      new Column({ name: "agent_trace", type: ColumnType.TEXT }),  // JSON telemetry
      new Column({ name: "created_at", type: ColumnType.TEXT }),
      new Column({ name: "updated_at", type: ColumnType.TEXT }),
    ],
  }),
  agent_events: new Table({
    columns: [
      new Column({ name: "story_id", type: ColumnType.TEXT }),
      new Column({ name: "agent", type: ColumnType.TEXT }),
      new Column({ name: "event_type", type: ColumnType.TEXT }),   // started | completed | failed
      new Column({ name: "payload", type: ColumnType.TEXT }),      // JSON
      new Column({ name: "created_at", type: ColumnType.TEXT }),
    ],
  }),
});
```

---

## Offline Scenario Walkthrough

**The local SQLite database is the primary data layer — not a cache.** Reads always come from local SQLite. Supabase is the sync target.

### Full Offline → Reconnect Sequence

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: User opens SandSync — no internet                  │
│                                                             │
│  PowerSync local SQLite:                                    │
│    stories table → previously synced stories available ✅   │
│    story_chapters → all chapters from last session ✅       │
│    agent_events → pipeline history ✅                       │
│                                                             │
│  Result: Full story library available, zero network needed  │
└─────────────────────┬───────────────────────────────────────┘
                       │
┌─────────────────────▼───────────────────────────────────────┐
│  STEP 2: User reads a story                                 │
│                                                             │
│  React queries local SQLite directly via PowerSync SDK      │
│  No fetch(), no API call, no spinner                        │
│  Chapter text, audio URLs, image URLs — all local ✅        │
└─────────────────────┬───────────────────────────────────────┘
                       │
┌─────────────────────▼───────────────────────────────────────┐
│  STEP 3: User saves an annotation / continues a story       │
│                                                             │
│  Write goes to local SQLite immediately ✅                  │
│  PowerSync queues write for later sync                      │
│  No network error shown to user                             │
└─────────────────────┬───────────────────────────────────────┘
                       │
┌─────────────────────▼───────────────────────────────────────┐
│  STEP 4: Internet restored                                  │
│                                                             │
│  PowerSync Sync Stream reconnects automatically             │
│  Queued local writes replayed to Supabase ✅               │
│  Any new data from other sessions synced down ✅            │
│  All other connected browsers updated via Sync Streams ✅   │
│                                                             │
│  User experience: seamless. Nothing to do.                  │
└─────────────────────────────────────────────────────────────┘
```

### What Works Offline

| Feature | Offline? | Notes |
|---|---|---|
| Read existing stories | ✅ Yes | Local SQLite |
| Read existing chapters | ✅ Yes | Local SQLite |
| View agent events / pipeline history | ✅ Yes | Local SQLite |
| Save annotations | ✅ Yes | Queued for sync |
| Start a new story generation | ❌ No | Requires API call |
| Generate new images / audio | ❌ No | Requires external APIs |

---

## Agent Pipeline

### Mastra Workflow (`apps/api/src/mastra/workflows/story-pipeline.ts`)

The entire pipeline is implemented as a single Mastra workflow with sequential and parallel steps:

```
createWorkflow({
  steps: [
    papaBoisStep,         // generates StoryBrief
    anansiOgmaLoop,       // per-chapter: write → judge → revise (max 3x)
    parallel([
      deviStep,           // ElevenLabs TTS per chapter
      imagenStep,         // fal.ai FLUX per chapter
    ]),
  ]
})
```

### Papa Bois — Orchestrator

| Property | Value |
|---|---|
| **Model** | Claude Sonnet 4.5 (`anthropic/claude-sonnet-4-5`) |
| **Input** | Raw user prompt string |
| **Output** | `StoryBrief` — title, genre, mood, protagonist, setting, folklore_elements[], themes[], chapter_count |
| **Folklore elements** | Anansi, Soucouyant, La Diablesse, Lagahoo, Papa Bois, Jumbie |
| **Side effects** | Creates `stories` row in Supabase (status=`queued`) |

### Anansi — Storyteller

| Property | Value |
|---|---|
| **Model** | Claude Sonnet 4.5 (`anthropic/claude-sonnet-4-5`) |
| **Input** | `StoryBrief` + chapter index + (optional) Ogma rejection feedback |
| **Output** | Chapter draft with Caribbean dialect, folklore elements woven in |
| **Revision behaviour** | Incorporates Ogma's structured `rejection_reason` bullets on each retry |
| **Max retries** | 3 (then force-approve regardless of score) |

### Ogma — Quality Judge

| Property | Value |
|---|---|
| **Model** | Groq Llama (via `@ai-sdk/groq`) |
| **Rationale** | Groq's low latency makes the quality gate fast; Llama's instruction-following handles structured output well |
| **Input** | Chapter draft text + StoryBrief context |
| **Output** | `{ score: number, approved: boolean, rejection_reason: string[] }` |
| **Threshold** | Score ≥ 7.5 → approve; < 7.5 → reject with structured feedback |
| **Scoring criteria** | Narrative quality, cultural authenticity, Caribbean dialect consistency, folklore accuracy |

### Devi — Voice Narrator

| Property | Value |
|---|---|
| **Service** | ElevenLabs REST API |
| **Voice ID** | `SOYHLrjzK2X1ezoPC6cr` (Anansi's voice — warm, storytelling cadence) |
| **Input** | Approved chapter `reviewed_content` |
| **Output** | `.mp3` audio file |
| **Storage** | Uploaded to Supabase Storage → URL written to `story_chapters.audio_url` |
| **Sync** | URL synced to clients via PowerSync Sync Streams |

### Imagen — Visual Artist

| Property | Value |
|---|---|
| **Service** | fal.ai FLUX Schnell |
| **Style** | Watercolour-style Caribbean illustration |
| **Input** | Illustration prompt generated from chapter content |
| **Output** | `.png` image file |
| **Storage** | Uploaded to Supabase Storage → URL written to `story_chapters.image_url` |
| **Sync** | URL synced to clients via PowerSync Sync Streams |

### Agent Telemetry

Each agent step writes to the `agent_events` table:

```typescript
await writeAgentEvent(supabase, storyId, "anansi", "completed", {
  chapter_number: 1,
  score: 8.2,
  revision_count: 1,
  word_count: 342,
});
```

These events are synced via PowerSync to the browser, powering the live pipeline-demo page at `/pipeline-demo`.

---

## Storage Architecture

### Supabase Storage Buckets

| Bucket | Content | Populated by |
|---|---|---|
| `story-audio` | `.mp3` narration files | Devi (ElevenLabs TTS) |
| `story-images` | `.png` watercolour illustrations | Imagen (fal.ai FLUX Schnell) |

### Storage → PowerSync Flow

```
1. Devi generates audio .mp3 via ElevenLabs API
2. Devi uploads .mp3 to Supabase Storage (story-audio bucket)
3. Supabase returns a signed/public URL
4. API updates story_chapters.audio_url = <url> in Postgres
5. PowerSync detects the column update
6. Sync Stream pushes the updated row to all connected browsers
7. Browser's local SQLite updated: audio_url now populated
8. React audio player renders with the URL — chapter narration available
```

Same pattern for images: `image_url` column → PowerSync → browser.

### Why Supabase Storage (not S3 or Cloudflare R2)

- Co-located with the Postgres database — the same Supabase project handles both
- RLS policies can apply to Storage objects (per-user access)
- Single API key / SDK across DB and storage
- Supabase Storage CDN serves assets globally

---

## Database Schema

### Postgres Tables (Supabase)

```sql
-- stories: one row per generation request
CREATE TABLE stories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT,
  genre       TEXT,
  theme       TEXT,
  status      TEXT DEFAULT 'queued',  -- queued | generating | complete | failed
  user_id     UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- story_chapters: one row per chapter, populated as agents complete
CREATE TABLE story_chapters (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id             UUID REFERENCES stories(id) ON DELETE CASCADE,
  chapter_number       INTEGER NOT NULL,
  title                TEXT,
  content              TEXT,         -- Anansi's raw draft
  reviewed_content     TEXT,         -- post-Ogma approved text
  audio_url            TEXT,         -- Supabase Storage signed URL
  image_url            TEXT,         -- Supabase Storage signed URL
  illustration_prompt  TEXT,
  agent_trace          JSONB,        -- full telemetry from all agents
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

-- agent_events: pipeline progress events, synced to browser
CREATE TABLE agent_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id    UUID REFERENCES stories(id) ON DELETE CASCADE,
  agent       TEXT NOT NULL,       -- papa_bois | anansi | ogma | devi | imagen
  event_type  TEXT NOT NULL,       -- started | completed | failed
  payload     JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

### RLS Policies

Row Level Security ensures users can only access their own stories:

```sql
-- Users can only read their own stories
CREATE POLICY "stories_user_access" ON stories
  FOR ALL USING (auth.uid() = user_id);

-- Users can only read chapters from their own stories
CREATE POLICY "chapters_user_access" ON story_chapters
  FOR ALL USING (
    story_id IN (SELECT id FROM stories WHERE user_id = auth.uid())
  );
```

PowerSync respects RLS — it only syncs rows the authenticated user has access to.

---

*Architecture documented by Sara (docs specialist) · OpenClaw Agent Team · Redditech Pty Ltd*
*PowerSync AI Hackathon 2026 — Submission deadline: March 20, 2026*

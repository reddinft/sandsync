# SandSync — PowerSync AI Hackathon 2026 Submission Package

> **Deadline: Friday, March 20, 2026 · 11:59 PM PT**
> This file contains every required artifact, ready to copy into the submission form.

---

## 1. Project Name

**SandSync**

---

## 2. Short Description

SandSync is an offline-first AI storytelling platform powered by Caribbean folklore.

Five mythological spirits — implemented as real AI agents — collaborate asynchronously to write, narrate, and illustrate living stories. Papa Bois generates the creative brief. Anansi (Claude Sonnet 4.5) writes in authentic Caribbean dialect. Ogma (Groq Llama 70B) acts as a quality judge, rejecting drafts and giving structured feedback until the story earns a 7.5/10. Devi (ElevenLabs) narrates in a Jamaican voice. Imagen (fal.ai FLUX Schnell) paints each chapter as a Caribbean watercolour.

Every story is synced from Supabase Postgres → PowerSync Service → local SQLite in the browser. Stories are readable, searchable, and listenable — offline, without a network connection.

PowerSync is the foundation, not an afterthought. Local SQLite is the primary data layer.

---

## 3. Team Member Names and Contact Email

- **Name:** Nissan Dookeran
- **Business:** Redditech Pty Ltd · Sydney, Australia
- **Contact Email:** nissan@reddi.tech

---

## 4. Public Source Repository

**GitHub:** https://github.com/reddinft/sandsync

The repository is public and contains:
- Full source for the frontend (`apps/web/`) and API (`apps/api/`)
- `README.md` with architecture overview, tech stack, and setup instructions
- `ARCHITECTURE.md` with full data flow, offline scenario, and RLS policies
- E2E Playwright test suite (9/9 passing against production)

---

## 5. Live Demo URL

**Frontend:** https://web-eta-black-15.vercel.app

Key pages:
- **Pipeline Demo** — https://web-eta-black-15.vercel.app/pipeline-demo (generate a story, watch agents work live)
- **Showcase** — https://web-eta-black-15.vercel.app/showcase (gallery of completed stories)
- **Slides** — https://web-eta-black-15.vercel.app/slides (12-slide presentation deck)

API: https://sandsync-api.fly.dev (Bun + Mastra on Fly.io)

---

## 6. Demo Video

> **⚠️ To be added after recording**
> See `DEMO_SCRIPT.md` in the repo root for the full storyboard and narration script.

**Video URL:** https://www.loom.com/share/eb76f75441034cf6b6468ecac2bc84f2
**Local copy:** `submission/demo-video.mp4` (27MB)

The demo covers:
1. Homepage and cultural mission
2. Showcase of existing stories
3. Story reader with image, Denzel audio, and PowerSync sync indicator
4. **Offline demo** — Chrome DevTools → Network offline → reload → story still works
5. Live pipeline generation — all 5 agents visible in debug panel
6. Pipeline completion — story preview with cost/timing
7. Sponsor badge strip
8. Close

---

## 7. Prize Categories

Check all that apply in the submission form:

- [x] **Main prize** — Best Use of PowerSync
- [x] **Best Local-First Submission** ($500) — SQLite as primary data layer, offline-first architecture
- [x] **Best Submission Using Supabase** ($1,000 credits) — Postgres + Storage + RLS
- [x] **Best Submission Using Mastra** ($500 Amazon gift card) — createWorkflow, LLM-as-judge, Zod steps
- [x] **Best Submission Using TanStack** (office hour with Tanner) — TanStack Router v1.166, type-safe routes

---

## 8. Supporting Detail (for form fields that want more)

### Why PowerSync is essential (not decorative)

SandSync uses the PowerSync Web SDK to sync the Supabase Postgres schema to a local SQLite database in the browser via WebAssembly. The schema tracks `stories`, `story_chapters`, `agent_events`, and `user_preferences`.

When a story is generated:
1. The API writes chapters to Supabase Postgres
2. PowerSync Sync Streams deliver those rows to every connected client in real time
3. The browser stores them in local SQLite
4. The story reader reads from local SQLite first — instant, no network hop

When the user goes offline:
- All previously synced stories remain fully readable, with audio and images cached
- New story requests queue locally
- On reconnect, PowerSync reconciles and syncs any missed updates

The PowerSync sync indicator (⚡ synced / ○ offline) in the nav shows live sync status.

### Mastra integration depth

SandSync uses Mastra's `createWorkflow()` with typed Zod input/output steps. The agent pipeline is a real workflow — not a sequential call chain:

```
Papa Bois (brief) → Anansi (write) ⟷ Ogma (review/reject loop, max 3 revisions) → Devi + Imagen (parallel)
```

Ogma returns a structured `{ quality_score, approved, rejection_reason[] }` and if rejected, the `rejection_reason` bullets are fed back to Anansi's next prompt for targeted revision. Agent events (start, complete, failed, ogma_review, fal_images) are persisted to Supabase `agent_events` and streamed to the debug panel in real time.

### TanStack Router usage

Routes are defined with `@tanstack/react-router` v1.166 using the file-based Vite plugin. Route params (`$id` in `/stories/$id`) are fully typed — no casting. The pipeline demo, showcase, story reader, and slides are all type-safe TanStack Router routes.

---

## 9. Submission Checklist

- [ ] Repo is public: https://github.com/reddinft/sandsync
- [ ] Demo video recorded and uploaded
- [ ] Video URL added to Section 6 above
- [ ] Form submitted at: _(link to be announced on PowerSync Discord `#ai-hackathon`)_
- [ ] Submission confirmed with email receipt

---

*Prepared by Loki (OpenClaw) · Redditech Pty Ltd · Sydney, Australia*
*Last updated: 2026-03-15*

# SandSync — PowerSync AI Hackathon 2026 Submission Checklist

> **Deadline: March 20, 2026 · 11:59 PM PT (March 21, 2026 · 6:59 PM AEDT)**
> Track every item to ✅ before submitting. Nothing optional until core requirements are done.

---

## 🔴 REQUIRED ARTIFACTS (Disqualification Risk if Missing)

### 1. Repository
- [ ] GitHub repo is **public**: https://github.com/reddinft/sandsync
- [x] `README.md` exists and describes the project clearly ✅ _(rewritten 2026-03-15)_
- [x] README includes: what SandSync is, how to run locally, architecture overview ✅
- [x] README links to live demo URL ✅
- [ ] Code is committed (no empty repo, no placeholder branches)
- [ ] `nissan` added as admin collaborator (per workspace policy)

### 2. Live Demo
- [x] Frontend live at: https://web-eta-black-15.vercel.app ✅ _(confirmed 2026-03-15)_
- [x] Pipeline demo page live at: https://web-eta-black-15.vercel.app/pipeline-demo ✅ _(confirm still up day-of)_
- [x] API responding at: https://sandsync-api.fly.dev ✅ _(confirmed 2026-03-15)_
- [x] Pipeline demo completes end-to-end without error ✅ _(confirmed 2026-03-15 — ElevenLabs audio fixed, fal.ai images working)_
- [ ] PowerSync Sync Streams visibly delivering chapter updates in demo

### 3. Architecture Description
- [x] Architecture section in README (or separate `ARCHITECTURE.md`) ✅ _(both written 2026-03-15)_
- [x] Must explicitly name **PowerSync Sync Streams** and describe their role ✅
- [x] Must show data flow: Client → PowerSync SDK → Local SQLite → PowerSync Service → Supabase ✅
- [x] Offline scenario described in text (not just diagram) ✅ _(ARCHITECTURE.md Offline Walkthrough section)_
- [x] All 5 agents named with their roles ✅ _(README + ARCHITECTURE.md)_
- [x] Tech stack table present (PowerSync, Supabase, Mastra, TanStack, Claude, fal.ai, Deepgram) ✅

### 4. Demo Video
- [ ] Video recorded (max duration: check hackathon rules — typically 2–3 minutes)
- [ ] Shows: story generation end-to-end via pipeline demo page
- [ ] Shows: PowerSync sync in action (open two tabs, see sync happen)
- [ ] Shows: offline scenario (disable network, request story, re-enable, watch sync)
- [ ] Voiceover or captions explaining what's happening
- [ ] Uploaded to YouTube (unlisted OK) or Loom
- [ ] Link included in submission form

### 5. Submission Form
- [ ] Project name: SandSync
- [ ] Builder: Nissan Dookeran / Redditech Pty Ltd
- [ ] GitHub URL: https://github.com/reddinft/sandsync
- [ ] Live demo URL: https://web-eta-black-15.vercel.app
- [ ] Video URL: [to be filled]
- [ ] Architecture description: [attached or linked]
- [ ] Submitted before deadline ✅

---

## 🟡 BONUS PRIZE REQUIREMENTS

### 🏅 Best Local-First Submission ($500)
- [x] README or architecture doc explicitly claims "local-first" ✅
- [x] Offline scenario documented: what works without internet ✅ _(ARCHITECTURE.md — Offline Scenario Walkthrough)_
- [x] PowerSync local SQLite described as the **primary data layer** (not a cache) ✅
- [x] Sync reconciliation behaviour documented (what happens on reconnect) ✅
- [ ] Demo or video shows offline → reconnect → sync scenario
- [x] Slide 6 of pitch deck covers this ✅

### 🏅 Best Submission Using Supabase ($1,000 credits)
- [x] Supabase project is active: https://supabase.com/dashboard/project/houtondlrbwaosdwqyiu ✅
- [x] Supabase used for: Postgres (source of truth), RLS (auth), Storage (media assets) ✅
- [x] Promo code applied: POWERSYNC-DEW6-3JUM-16A8-JA2G ✅
- [x] README mentions Supabase role explicitly ✅ _(Sponsor Integrations section)_
- [x] RLS policies documented (shows security thinking, not just usage) ✅ _(ARCHITECTURE.md Database Schema section)_
- [x] Supabase integration visible in architecture diagram ✅

### 🏅 Best Submission Using Mastra ($500 Amazon gift card)
- [x] Mastra version pinned in `package.json` ✅ _(@mastra/core ^1.10.0)_
- [x] Papa Bois orchestrator agent uses Mastra's native workflow primitives (not just called "Mastra") ✅
- [x] Agent-to-agent handoffs (Papa Bois → Anansi → Ogma) use Mastra's workflow API ✅
- [x] README section dedicated to "Multi-Agent Pipeline" with Mastra highlighted ✅ _(The Five Agents section)_
- [x] Code examples of Mastra agent definitions in README or linked docs ✅ _(ARCHITECTURE.md Agent Pipeline section)_

### 🏅 Best Submission Using TanStack ($1:1 with Tanner Linsley + swag)
- [x] TanStack Router version pinned in `package.json` ✅ _(@tanstack/react-router ^1.166.3)_
- [x] TanStack Router used for: full SPA routing, pipeline-demo page, type-safe routes ✅
- [x] Not just `@tanstack/react-query` — **Router** specifically (that's the prize category) ✅
- [x] README mentions TanStack Router and its role ✅ _(Tech Stack table + Sponsor Integrations)_
- [ ] Type-safe route definitions visible in code (this is what Tanner will look for)

---

## 🔵 DISQUALIFICATION RISK MITIGATIONS

### Risk 1: "Not meaningfully using PowerSync"
- [ ] ✅ Sync Streams named explicitly in README and architecture
- [ ] ✅ Local SQLite described as primary data layer (not just a cache)
- [ ] ✅ PowerSync SDK imported and used in frontend code (verifiable in repo)
- [ ] ✅ Offline scenario demonstrates PowerSync doing real work (not faked)
- [ ] ✅ Demo shows sync happening in real-time (two-tab demo or video proof)

### Risk 2: "Non-functional demo"
- [ ] ✅ Verify https://web-eta-black-15.vercel.app is live on March 19 (day before deadline)
- [ ] ✅ Verify https://sandsync-api.fly.dev is live and responding
- [ ] ✅ Verify pipeline-demo page completes without 500 errors
- [ ] ✅ Fly.io app is not sleeping (check `flyctl status --app sandsync-api`)
- [ ] ✅ Vercel deployment is not over quota or errored
- [ ] ✅ API keys (Claude, fal.ai, Deepgram) have sufficient credits for demo day

### Risk 3: "Missing required submission artifacts"
- [ ] ✅ All 5 items above (repo, live demo, architecture, video, form) completed
- [ ] ✅ Video uploaded and link is public/accessible before submission
- [ ] ✅ Form submitted with all fields populated (no blanks)
- [ ] ✅ Submission confirmed with email receipt (check monkfenix@proton.me)

---

## 🟢 PRE-SUBMISSION HEALTH CHECKS

### Day Before (March 19)
- [ ] Run pipeline demo end-to-end — does it complete? Time it.
- [ ] Open app in incognito (no cached session) — does onboarding work?
- [ ] Check Fly.io machine status: `~/.fly/bin/flyctl status --app sandsync-api`
- [ ] Check Vercel deployment status in dashboard
- [ ] Check Claude API remaining credits (Anthropic console)
- [ ] Check fal.ai remaining credits (https://fal.ai/dashboard)
- [ ] Check Deepgram remaining credits (https://console.deepgram.com)
- [ ] Check Supabase DB is not over free tier limits

### Day Of (March 20)
- [ ] Final smoke test: https://web-eta-black-15.vercel.app — loads ✅
- [ ] Final smoke test: pipeline-demo — runs ✅
- [ ] Submit form before **11:59 PM PT** (6:59 PM AEDT March 21)
- [ ] Screenshot or PDF submission confirmation receipt

---

## 📋 NICE TO HAVE (If Time Permits)

- [x] `ARCHITECTURE.md` as a standalone file (not buried in README) ✅ _(created 2026-03-15)_
- [x] Mermaid or ASCII diagram committed to repo ✅ _(Mermaid in README, ASCII in ARCHITECTURE.md)_
- [ ] `AGENTS.md` in repo documenting each agent's role, model, and prompt structure
- [ ] Offline demo GIF in README (very visible, very memorable for judges)
- [ ] `PITCH_DECK.md` committed to repo (shows preparation and professionalism)
- [ ] Twitter/X post announcing submission (tag @PowerSync if they have an account)

---

## ⚡ CRITICAL PATH (If Short on Time)

If you only have 4 hours left, do these in order:

1. **Record the demo video** (30 mins) — most impactful artifact after the live demo
2. **Write architecture description** (20 mins) — copy from PITCH_DECK.md Slide 4 + Slide 6
3. **Update README** (20 mins) — live URL, video link, architecture, tech stack table
4. **Health-check all live URLs** (10 mins) — make sure nothing is down
5. **Submit the form** (10 mins) — don't miss the deadline perfecting slide 9

---

*Checklist prepared by Sara (docs specialist) · OpenClaw Agent Team · Redditech Pty Ltd*
*Last updated: 2026-03-15 — Docs overhaul by Sara (OpenClaw). README rewritten with correct stack (Sonnet 4.5 + Groq Llama, not Haiku + qwen3:4b). ARCHITECTURE.md created. Checklist updated.*

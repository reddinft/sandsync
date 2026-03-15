# SandSync — PowerSync AI Hackathon 2026 Pitch Deck

> Format: One `---` per slide break. Each slide: bold headline, 3–5 bullets, judge signal (italicised speaker note).
> Estimated pitch pace: ~30 seconds per slide × 12 slides = **~6 minutes**

---

## Slide 1 — Title

# **SandSync**
### *Where Stories Live Offline and Breathe Online*

- 🌴 Offline-first AI storytelling platform powered by Caribbean folklore
- 🤖 Multi-agent pipeline: five mythological spirits, one living story
- 🔁 Synced across every device via **PowerSync** — even without internet
- 👤 Built by **Nissan Dookeran** · Redditech Pty Ltd · Sydney, Australia
- 🏆 Submitted to the **PowerSync AI Hackathon 2026**

*🎯 Judge signal: Sets stakes immediately — this is a real product with a real cultural mission, not a toy demo. The PowerSync credit is front-and-centre, not buried.*

---

## Slide 2 — The Problem

## **Oral Traditions Are Dying in the Cloud**

- 📉 Caribbean, West African, and Indigenous oral traditions exist in fragmented, inaccessible archives — not in the hands of communities
- 🌐 Every "AI storytelling" tool requires a live internet connection — useless in rural communities, remote schools, or low-bandwidth regions
- 📱 No platform lets a story **begin offline, survive offline**, and seamlessly rejoin the digital world on reconnect
- 🔇 AI-generated folklore ignores cultural authenticity — generic stories, no roots, no reviewers
- 🕳️ The gap: **living oral traditions deserve living, local-first infrastructure**

*🎯 Judge signal: Establishes genuine need. Not a solution looking for a problem — the problem is real, documented, and personal to the builder.*

---

## Slide 3 — The Hook

## **"What If a Story Could Follow You Offline?"**

> *What if a story could follow you offline — and find you again when you reconnect?*

- A child in Trinidad reads a Papa Bois story on a tablet. **The internet drops.** The story keeps loading.
- She annotates it. Adds her own chapter. All saved locally in **SQLite via PowerSync**.
- Two hours later, signal returns. **PowerSync syncs her annotations to every device in the classroom** — instantly, without her doing anything.
- This isn't a workaround. This is the architecture. **Offline-first by design, not by accident.**

*🎯 Judge signal: Emotionally anchors the technical architecture. Shows judges the human stakes of the PowerSync integration before the technical diagram.*

---

## Slide 4 — PowerSync is the Foundation

## **PowerSync: Engine, Not Afterthought**

```
┌─────────────────────────────────────────────────────────────┐
│                    SANDSYNC SYNC ARCHITECTURE               │
│                                                             │
│  [Client — React/TanStack]                                  │
│       │                                                     │
│       ▼                                                     │
│  [PowerSync SDK]  ←──── Sync Streams (real-time)           │
│       │                       ▲                             │
│       ▼                       │                             │
│  [Local SQLite DB]     [PowerSync Service]                  │
│  (offline reads/writes)       │                             │
│                               ▼                             │
│                    [Supabase Postgres + RLS]                │
│                    (source of truth + auth)                 │
└─────────────────────────────────────────────────────────────┘
```

- **Sync Streams** power real-time chapter delivery — new story segments stream to every connected client as agents complete them
- **Local SQLite write path:** story requests, annotations, and chapter reads are written locally first — zero dependency on network availability
- **Offline read scenario:** full story library cached locally; agents can generate from cached prompts; no spinner of death
- **Reconnect:** PowerSync automatically reconciles local writes with Supabase — no manual merge, no data loss

*🎯 Judge signal: Directly addresses disqualification risk #1. Sync Streams are named and diagrammed. PowerSync is load-bearing, not decorative. This is for Dev, Conrad, and Kobie specifically.*

---

## Slide 5 — The Multi-Agent Pipeline

## **Five Spirits. One Pipeline. Real Stories.**

```
                    ┌──────────────┐
                    │  Papa Bois   │  ← Orchestrator (Mastra)
                    │  🌳 Guardian  │    Routes, decides, controls flow
                    └──────┬───────┘
                           │
              ┌────────────▼────────────┐
              │        Anansi           │  ← Storyteller (Claude Haiku)
              │  🕷️ The Spider Weaver   │    Generates the folklore narrative
              └────────────┬────────────┘
                           │
              ┌────────────▼────────────┐
              │         Ogma            │  ← Cultural Reviewer (Claude Haiku)
              │  📜 Language Guardian   │    LLM-as-judge: authenticity check
              └──────┬──────────┬───────┘
                     │          │
          ┌──────────▼─┐    ┌───▼──────────┐
          │   Firefly   │    │    Devi      │
          │ 🔥 fal.ai   │    │ 🎙️ Deepgram  │
          │  FLUX imgs  │    │  TTS voice   │
          └─────────────┘    └──────────────┘
```

- **Papa Bois** (forest guardian) orchestrates because guardians *route and protect* — he decides story arc, agent order, retry logic
- **Anansi** (spider, trickster, story-keeper) weaves the narrative — culturally appropriate casting
- **Ogma** (Celtic god of language) reviews cultural accuracy — LLM-as-judge before delivery
- **Firefly + Devi** run in parallel post-review: image generation and voice synthesis simultaneously

*🎯 Judge signal: Shows sophisticated AI architecture with clear agent roles. Mastra orchestration is explicit. LLM-as-judge (Ogma) demonstrates AI maturity beyond simple generation.*

---

## Slide 6 — Local-First Architecture

## **Offline-First Is the Product, Not a Feature**

**Scenario: Zero connectivity. Full story.**

```
STEP 1 — User opens SandSync with no internet
         ↓
         PowerSync local SQLite cache: story library available ✅
         
STEP 2 — User requests a new story
         ↓
         Cached prompts + character archetypes generate locally ✅
         Chapter fragments written to local SQLite immediately ✅
         
STEP 3 — User annotates and saves
         ↓
         Annotation persisted locally in SQLite ✅
         No network call required ✅
         
STEP 4 — Internet restored
         ↓
         PowerSync Sync Streams reconcile local writes → Supabase ✅
         All other devices receive updates via Sync Streams ✅
         Story is now cloud-persisted, cross-device synced ✅
```

- Local SQLite (via PowerSync SDK) is the **primary data layer** — Supabase is the sync target, not the read source
- Stories available in full offline — chapters, images, and audio cached after first load
- Annotations and user-generated continuations survive complete connectivity loss
- **Targeting: Best Local-First Submission ($500 prize)**

*🎯 Judge signal: Step-by-step offline walkthrough makes the local-first claim undeniable. Explicitly targets the $500 bonus prize. Shows the judges exactly what "offline-first" means in practice for SandSync.*

---

## Slide 7 — Tech Stack

## **Six Technologies. Every One Load-Bearing.**

| Technology | Role in SandSync | 🏆 Bonus Category |
|---|---|---|
| **PowerSync** | Sync engine, Sync Streams, local SQLite | Core requirement |
| **Supabase** | Postgres source of truth, RLS auth, storage | 💰 Best Supabase ($1,000 credits) |
| **Mastra** | Multi-agent orchestration (Papa Bois conductor) | 💰 Best Mastra ($500 gift card) |
| **TanStack Router** | Frontend SPA navigation, type-safe routes | 💰 Best TanStack (Tanner 1:1 + swag) |
| **Claude Haiku** | Anansi (story gen) + Ogma (cultural review) | Core AI |
| **fal.ai FLUX + Deepgram** | Parallel image gen + voice synthesis | Core AI |

- **No throwaway integrations** — each technology handles a distinct, irreplaceable function
- Supabase RLS enforces per-user story access — not just a database, a security layer
- TanStack Router handles pipeline-demo page routing with full type safety — not bolted on
- Mastra chosen specifically for its agent-to-agent handoff model, not just for the prize

*🎯 Judge signal: Transparency about bonus prize targeting builds credibility. Every technology has a named, specific function — no "we used X" without "because X does Y that nothing else could."*

---

## Slide 8 — Live Demo

## **Let's See It Run**

> 🌐 **Live:** https://web-eta-black-15.vercel.app
> 🔁 **Pipeline Demo:** https://web-eta-black-15.vercel.app/pipeline-demo
> ⚙️ **API:** https://sandsync-api.fly.dev
> 📦 **Repo:** https://github.com/reddinft/sandsync

**What you'll see in the pipeline demo:**
- Papa Bois receiving a story request and routing it to Anansi
- Anansi streaming chapter text in real-time
- Ogma reviewing and approving cultural accuracy
- Firefly (fal.ai FLUX) generating scene imagery in parallel
- Devi (Deepgram) synthesising audio — the story speaks
- **PowerSync Sync Streams delivering each completed chapter to the client in real-time**

*🎯 Judge signal: Directly addresses disqualification risk #2. This is a functional product, not a mockup. Live URL is provided. The demo page is purpose-built to show the exact pipeline the judges want to evaluate.*

---

## Slide 9 — Cultural Authenticity

## **Built by the Culture. For the Culture.**

- **Nissan Dookeran** — Trinidad-heritage developer based in Sydney. This isn't appropriation. It's preservation by the community it belongs to.
- **Papa Bois** is the guardian spirit of the Trinidad and Tobago forest — forest guardians *protect and route*. He is the orchestrator because the mythology demands it.
- **Anansi** (West African/Caribbean spider deity) is the keeper of all stories — the storyteller agent is not a random name, it's an identity.
- **Ogma** (Celtic god of eloquent speech and language) reviews cultural accuracy — language gods review language. The casting is intentional.
- **The agents aren't themed.** They *are* the culture — their technical roles mirror their mythological roles precisely.

> *"We didn't name an AI agent after Papa Bois. We built Papa Bois as an AI agent."*

*🎯 Judge signal: Prevents the "gimmick" objection. Shows the judges that cultural framing is load-bearing to the architecture, not a marketing layer. Addresses authenticity concerns before they arise.*

---

## Slide 10 — Bonus Prize Coverage

## **Targeting Four Bonus Prizes. Here's the Evidence.**

| Prize | Value | How SandSync Qualifies |
|---|---|---|
| 🥇 **Best Local-First** | $500 cash | PowerSync local SQLite is the primary data layer; full offline story generation + annotation; Sync Streams reconcile on reconnect |
| 🥇 **Best Using Supabase** | $1,000 credits | Supabase Postgres is the cloud source of truth with RLS; Supabase storage for generated media assets; auth integrated |
| 🥇 **Best Using Mastra** | $500 Amazon gift card | Mastra orchestrates all five agents; Papa Bois agent-to-agent handoffs use Mastra's native workflow primitives |
| 🥇 **Best Using TanStack** | Tanner 1:1 + swag | TanStack Router powers the full SPA; pipeline-demo page uses type-safe route definitions; not a wrapper, it's the nav layer |

- All four bonus categories are **genuinely integrated** — not bolted on for the prize
- Each integration was present in v1 architecture before bonus prizes were announced
- No conflicts between categories — they serve different layers of the stack

*🎯 Judge signal: Explicit, evidence-backed bonus prize coverage. Saves judges from having to infer eligibility. The honesty that "each was in v1 architecture" prevents cynicism about chase-the-prize engineering.*

---

## Slide 11 — Impact & Scalability

## **One Platform. Every Oral Tradition on Earth.**

- **SandSync is a blueprint**, not a one-off. The agent architecture is folklore-agnostic.
- 🇳🇿 **Māori:** Replace Anansi with Maui. Replace Ogma with a te reo Māori validator. Same pipeline.
- 🇦🇺 **Aboriginal Australian Dreaming Stories:** Local-first is *essential* — remote communities with low connectivity finally have a native platform
- 🌍 **West African Griot Tradition:** Oral histories passed between generations, now preserved in a living database that works offline in rural Senegal
- The **LLM-as-judge pattern** (Ogma) scales to any cultural reviewer — swap the system prompt, keep the architecture
- **Real-time AI cultural preservation** — stories don't just survive, they *grow* through community annotations synced via PowerSync

*🎯 Judge signal: Demonstrates the judges aren't just funding one project — they're funding the infrastructure pattern for AI-driven cultural preservation globally. Raises the stakes of their decision.*

---

## Slide 12 — Closing

## **SandSync: Stories That Belong to Everyone**

### Links
| | |
|---|---|
| 🌐 Live App | https://web-eta-black-15.vercel.app |
| 🔁 Pipeline Demo | https://web-eta-black-15.vercel.app/pipeline-demo |
| ⚙️ API | https://sandsync-api.fly.dev |
| 📦 Repository | https://github.com/reddinft/sandsync |

### Team
**Nissan Dookeran** — Founder, Builder, Cultural Custodian
Redditech Pty Ltd · Sydney, Australia · Caribbean heritage

### What We're Asking
- 🏆 Judge on what you see: a **functional, offline-first, culturally grounded AI storytelling platform**
- 🔁 The PowerSync integration is **architectural** — remove it and the product ceases to exist
- 🌴 Stories belong to communities. **SandSync puts them back.**

*Thank you.*

*🎯 Judge signal: Clean, confident close. Repo and live demo links are visible for judges to click immediately. The closing line reframes SandSync as a mission, not a submission.*

---

*Deck prepared by Sara (docs specialist) · OpenClaw Agent Team · Redditech Pty Ltd*
*PowerSync AI Hackathon 2026 — Submission deadline: March 20, 2026 11:59 PM PT*

# SandSync Demo Video — Voiceover Takes
**Production:** SandSync Hackathon Demo · PowerSync AI Hackathon 2026
**Scriptwriter:** Sara
**Voice structure:** Three voices — Papa Bois (AI) · Anansi (AI) · Nissan (human)
**Total narration:** ~84 seconds across 7 takes (6 scenes, Scene 2 split)
**Total word count:** ~169 words

---

## Voice Key

| Voice | Role in App | ElevenLabs Voice ID | Model | Tone |
|-------|-------------|---------------------|-------|------|
| 🌳 **Papa Bois** | Orchestrator — receives request, interprets, writes brief | `6HeS5o1MgiMBuqtUDJaA` | `eleven_turbo_v2_5` | Deep, slow, authoritative |
| 🕷️ **Anansi** | Story Generator — weaves the actual tale | `SOYHLrjzK2X1ezoPC6cr` | `eleven_multilingual_v2` | Quick, playful, conspiratorial |
| 🎙️ **Nissan** | The user — authentic Caribbean human in the loop | *(human recording)* | N/A | Natural, Caribbean accent |

**Arc:** Papa Bois opens → Nissan requests → Anansi weaves the pipeline → Nissan reconnects → Papa Bois closes with cultural weight.

---

## SCENE 1 — The Hook
**Duration:** ~8 seconds
**VOICE:** 🌳 Papa Bois
**ElevenLabs ID:** `6HeS5o1MgiMBuqtUDJaA` · model `eleven_turbo_v2_5`
**What's on screen:** SandSync title card fades in. Pipeline idle. Tech stack nodes visible — PowerSync, Mastra, Claude, fal.ai, Deepgram, Supabase.
**Nissan records this:** NO — AI generated
**Output file:** `vo-scene-1-papa-bois.wav`

### Script
> Some stories cannot wait for a signal.
> They live in the deep places.
> This is SandSync.

### Recording / Generation Note
Papa Bois speaks like a forest elder who already knows the ending. "Some stories cannot wait for a signal" — this is the thesis of the entire app (offline-first) disguised as folklore wisdom. **"They live in the deep places"** — slower still, reverent. "This is SandSync" — plain, certain, no fanfare needed. Recommend ElevenLabs stability: 0.7, similarity: 0.8, style exaggeration: 0.4.

---

## SCENE 2A — The Request (Papa Bois)
**Duration:** ~5 seconds
**VOICE:** 🌳 Papa Bois
**ElevenLabs ID:** `6HeS5o1MgiMBuqtUDJaA` · model `eleven_turbo_v2_5`
**What's on screen:** App home screen. Request form loading. User about to interact.
**Nissan records this:** NO — AI generated
**Output file:** `vo-scene-2a-papa-bois.wav`

### Script
> A request enters the forest.
> Anansi — the Storyteller — is listening.

### Recording / Generation Note
Papa Bois is handing off to Anansi. He says Anansi's name with familiarity — like an introduction between old friends. **"Anansi"** = *ah-NAHN-see* — if ElevenLabs mispronounces, use phonetic input: `ah-NAHN-see`. Brief pause between the two sentences. This take directly precedes Nissan's voice — Finn cuts from Papa Bois to Nissan mid-scene.

---

## SCENE 2B — The Request (Nissan)
**Duration:** ~7 seconds
**VOICE:** 🎙️ Nissan (human)
**What's on screen:** User's hand tapping screen. Story theme selector showing "Anansi". Genre: Folklore. Submit button pressed. Pipeline nodes shift from idle → ready.
**Nissan records this:** YES — Take 2B
**Output file:** `vo-scene-2b-nissan.wav`

### Script
> I tap the screen. Select Anansi's story.
> Hit submit. The pipeline comes alive.

### Recording / Generation Note
Nissan's voice is the proof of concept — a Caribbean person, using a platform built for their culture. Say this naturally, not performatively. Not "I am now demonstrating the submission flow." Just: someone excited to hear a story. **"The pipeline comes alive"** — a hint of wonder in it.

---

## SCENE 3 — Pipeline Activates
**Duration:** ~20 seconds
**VOICE:** 🕷️ Anansi
**ElevenLabs ID:** `SOYHLrjzK2X1ezoPC6cr` · model `eleven_multilingual_v2`
**What's on screen:** Live pipeline visualization on `/pipeline-demo`. Mastra orchestrator node lights first. Claude Haiku Storyteller agent activates. Progress indicators running. Story text beginning to stream into UI.
**Nissan records this:** NO — AI generated
**Output file:** `vo-scene-3-anansi.wav`

### Script
> Every thread I spin becomes a story. Watch.
>
> Mastra calls me forward. I reach into the folklore —
> Papa Bois. Soucouyant. La Diablesse.
> And I begin to weave.
>
> See the pipeline light up — node by node —
> each agent, alive.

### Recording / Generation Note
Anansi is showing off. This is his domain — he is the Claude Haiku agent, the story weaver. **"Watch."** — single word, conspiratorial, like he's about to pull a trick. The folklore names are a roll call: *Papa Bois. [beat] Soucouyant. [beat] La Diablesse.* — *La Diablesse* = `la-dee-AH-bles` (phonetic for ElevenLabs). "And I begin to weave" — slower, like a conjurer starting the trick. Final two lines — pick up pace to match nodes lighting on screen. Recommend: stability 0.5, similarity 0.75, style exaggeration 0.6 (more expressive for Anansi).

---

## SCENE 4 — AI Agents Working
**Duration:** ~20 seconds
**VOICE:** 🕷️ Anansi
**ElevenLabs ID:** `SOYHLrjzK2X1ezoPC6cr` · model `eleven_multilingual_v2`
**What's on screen:** Multiple agents active simultaneously — fal.ai image gen node lit, Deepgram voice synthesis node lit, Review agent checking output. Generated story image appearing. Audio waveform. Offline indicator prominent (no network / airplane mode visible).
**Nissan records this:** NO — AI generated
**Output file:** `vo-scene-4-anansi.wav`

### Script
> fal.ai paints what I describe. Forest. Dark. Ancient.
> Deepgram speaks the words I spin.
> My Review self checks every thread. Tightens it.
>
> Supabase holds the cloth.
> PowerSync keeps the loom running.
>
> And the trick?
> All of this — no signal needed.

### Recording / Generation Note
Anansi maps every technology to weaving metaphor — this is the architecture explained through his voice without reading a spec sheet. **"Forest. Dark. Ancient."** — three separate words, each one Anansi is painting as he names it. **"My Review self checks every thread"** — Anansi narrating his own agent loop (the Review agent is Anansi reviewing Anansi — make this feel slightly self-amused). **"And the trick?"** — dramatic pause. This is the Anansi trickster reveal moment. **"All of this — no signal needed."** — land it like the punchline of the tale. Slight delight in his voice here.

---

## SCENE 5 — Sync & Publish
**Duration:** ~10 seconds
**VOICE:** 🎙️ Nissan (human)
**What's on screen:** Phone going from offline → Wi-Fi connected. PowerSync sync animation triggering. Story appearing in published state. Supabase realtime row appearing.
**Nissan records this:** YES — Take 5
**Output file:** `vo-scene-5-nissan.wav`

### Script
> It was offline the whole time.
> The moment I reconnect —
> PowerSync pushes everything live.
> Just like that.

### Recording / Generation Note
This is Nissan as the authentic human witness — the "can you believe this actually works" voice. **"It was offline the whole time"** — let that sit for a beat, genuine surprise. **"The moment I reconnect"** — pause before the dash. **"PowerSync pushes everything live"** — momentum. **"Just like that."** — understated. Don't over-sell it. The understatement makes it more convincing.

---

## SCENE 6 — The Result
**Duration:** ~10 seconds
**VOICE:** 🌳 Papa Bois
**ElevenLabs ID:** `6HeS5o1MgiMBuqtUDJaA` · model `eleven_turbo_v2_5`
**What's on screen:** Completed story page — full text, FLUX-generated illustration, Deepgram voice playing. Final shot pulls back to show full app. SandSync branding.
**Nissan records this:** NO — AI generated
**Output file:** `vo-scene-6-papa-bois.wav`

### Script
> The forest always knew.
>
> Story told. Culture kept.
> With or without the world's permission.
>
> SandSync.

### Recording / Generation Note
Papa Bois returns to close what he opened. He is satisfied. **"The forest always knew"** — this callbacks to Scene 1 ("deep places") and to his character as the forest guardian. Everything that just happened was already written in the old knowledge. **"Story told. Culture kept."** — two declarations, each complete. Not rushed. **"With or without the world's permission."** — this is the cultural defiance line. The app exists for communities who can't rely on connectivity. Papa Bois says this with gravity, not anger — it's simply truth. **"SandSync."** — one word. Let it echo. Long natural decay before fade.

---

## Take Summary

| Take ID | Scene | Voice | File | Nissan Records |
|---------|-------|-------|------|----------------|
| 1 | The Hook | 🌳 Papa Bois | `vo-scene-1-papa-bois.wav` | ❌ AI |
| 2A | The Request | 🌳 Papa Bois | `vo-scene-2a-papa-bois.wav` | ❌ AI |
| 2B | The Request | 🎙️ Nissan | `vo-scene-2b-nissan.wav` | ✅ Human |
| 3 | Pipeline Activates | 🕷️ Anansi | `vo-scene-3-anansi.wav` | ❌ AI |
| 4 | AI Agents Working | 🕷️ Anansi | `vo-scene-4-anansi.wav` | ❌ AI |
| 5 | Sync & Publish | 🎙️ Nissan | `vo-scene-5-nissan.wav` | ✅ Human |
| 6 | The Result | 🌳 Papa Bois | `vo-scene-6-papa-bois.wav` | ❌ AI |

**7 takes total · 2 human (Nissan) · 5 AI generated**

---

## Timing Sheet

| Take | Voice | Words | Est. Duration |
|------|-------|-------|---------------|
| 1 — The Hook | Papa Bois (~95 wpm) | 15 | ~9s |
| 2A — Request | Papa Bois (~95 wpm) | 11 | ~7s |
| 2B — Request | Nissan (~120 wpm) | 15 | ~8s |
| 3 — Pipeline | Anansi (~140 wpm) | 45 | ~19s |
| 4 — Agents | Anansi (~140 wpm) | 43 | ~18s |
| 5 — Sync | Nissan (~120 wpm) | 18 | ~9s |
| 6 — The Result | Papa Bois (~95 wpm) | 15 | ~9s |
| **TOTAL** | | **162 words** | **~79–84s** |

*Papa Bois takes ~25s · Anansi takes ~37s · Nissan takes ~17s*

---

## Opening Title Card (5 seconds — no voiceover)

```
SandSync

Stories that outlive the signal.

Built for PowerSync AI Hackathon 2026
```

*Design: Logo centred, tagline in lighter weight, hackathon credit small at bottom.*

---

## Closing Card (5 seconds — no voiceover)

```
Built with:
PowerSync  ·  Mastra  ·  fal.ai  ·  Deepgram  ·  Supabase  ·  Claude

github.com/[repo]  |  sandsync.app
```

*Design: Tech stack on one line with logos if available. CTA link centred below.*

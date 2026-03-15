# SandSync Demo Video — Asset Inventory
_Generated: 2026-03-14 by Finn_
_Updated: 2026-03-14_

---

## 🎬 Raw Takes (Playwright Recordings — WebM/VP8, 1920×1080)

### Take 1: Pipeline Full
| File | Duration | Status | Covers |
|------|----------|--------|--------|
| `take-1-pipeline-full/0d894519…webm` | ~23.8s | ✅ Real footage | Pipeline page (idle state) |
| `take-1-pipeline-full/af001b4c…webm` | **89.8s** | ✅ Real footage ⭐ | **Pipeline visualization page** with full tech stack (PowerSync, Mastra, Claude, fal.ai, Deepgram, Supabase), Run Pipeline button, Offline badge |

### Take 2: Offline Sync
| File | Duration | Status | Covers |
|------|----------|--------|--------|
| `take-2-offline-sync/5c765b0f…webm` | ~25.6s | ✅ Real footage | Demo/home page (Summon a Story) |
| `take-2-offline-sync/5fe9bd85…webm` | 39.5s | ✅ Real footage | Demo page with story selection |
| `take-2-offline-sync/805fdbfe…webm` | **66.7s** | ✅ Real footage ⭐ | **Demo page with offline-first sync interaction** |

### Take 3: Agents Debug
| File | Duration | Status | Covers |
|------|----------|--------|--------|
| `take-3-agents-debug/07c98186…webm` | 10.9s | ✅ Real footage | Short clip — story not found / debug state |
| `take-3-agents-debug/20424fc8…webm` | ~3m 9.7s | ✅ Real footage | Long debug session |
| `take-3-agents-debug/26fd3d85…webm` | ~1m 53.8s | ✅ Real footage | Extended debug session |
| `take-3-agents-debug/3d61d973…webm` | 46.8s | ✅ Real footage | Debug session |
| `take-3-agents-debug/b5a9d462…webm` | **156.3s** | ✅ Real footage ⭐ | **Long agents debug / pipeline run session** |
| `take-3-agents-debug/b7720bb5…webm` | ~1m 18.3s | ✅ Real footage | Debug session |
| `take-3-agents-debug/cabadf35…webm` | ~23.7s | ✅ Real footage | Short debug clip |

---

## 🎞️ Processed Clips (H.264, 1920×1080)

### Scenario Clips — New (BEST — use these)
| File | Duration | Status | Covers |
|------|----------|--------|--------|
| `scenario-1-new/6f9f44d5…webm` | 65.1s | ✅ Real footage | Source webm for scenario-1 |
| `scenario-1-new/scenario-1-clip.mp4` | **65.1s** | ✅ Real footage ⭐ | **Summon a Story UI — Anansi trickster selected** |
| `scenario-2-new/c3cc61e7…webm` | 58.1s | ✅ Real footage | Source webm for scenario-2 |
| `scenario-2-new/scenario-2-clip.mp4` | **58.1s** | ✅ Real footage ⭐ | **Summon a Story UI — Papa Bois forest spirit selected** |
| `scenario-3-new/29d148ad…webm` | 59.4s | ✅ Real footage | Source webm for scenario-3 |
| `scenario-3-new/scenario-3-clip.mp4` | **59.4s** | ✅ Real footage ⭐ | **Summon a Story UI — Soucouyant mystery selected** |

### Scenario Clips — Old
| File | Duration | Status | Covers |
|------|----------|--------|--------|
| `scenario-1/clip.mp4` | 60.0s | ✅ Real footage | Summon a Story — Anansi (earlier recording) |
| `scenario-1/clip-old-synthetic.mp4` | unknown | ⚠️ Synthetic | Old placeholder — DO NOT USE |
| `scenario-2/clip.mp4` | 58.1s | ✅ Real footage | Summon a Story — Papa Bois (earlier) |
| `scenario-2/clip-old-synthetic.mp4` | unknown | ⚠️ Synthetic | Old placeholder — DO NOT USE |
| `scenario-3/clip.mp4` | 59.4s | ✅ Real footage | Summon a Story — Soucouyant (earlier) |
| `scenario-3/clip-old-synthetic.mp4` | unknown | ⚠️ Synthetic | Old placeholder — DO NOT USE |

---

## 📹 Composed Videos (demo-video/)

| File | Duration | Status | Notes |
|------|----------|--------|-------|
| `sandsync-demo-final.mp4` | 162.9s | ⚠️ Synthetic | Built from generated colored screens — placeholder only, DO NOT submit |
| `scenario-pipeline-full.mp4` | 94.9s | ⚠️ Synthetic | Placeholder scenario render |
| `scenario-offline-sync.mp4` | 60.8s | ⚠️ Synthetic | Placeholder scenario render |
| `scenario-agents-debug.mp4` | 40.2s | ⚠️ Synthetic | Placeholder scenario render |
| **`sandsync-demo-DRAFT.mp4`** | **92s** | ✅ **REAL FOOTAGE** | **Draft with AI voiceover — ready for review** |

---

## 🎙️ Audio Assets

| File | Duration | Status | Notes |
|------|----------|--------|-------|
| `voiceover-ai-draft.mp3` | 107.1s | ✅ Generated | ElevenLabs Papa Bois voice (`6HeS5o1MgiMBuqtUDJaA`), `eleven_turbo_v2_5` — secondary API key used (primary at quota) |
| `VOICEOVER-SCRIPT.md` | — | ✅ Written | Caribbean storytelling tone, ~65s narration |
| ❌ `voiceover-nissan.wav` | — | ❌ Missing | Nissan's own recording — not yet recorded |
| ❌ Background music | — | ℹ️ Generated | ffmpeg sine synthesis (CC0) — used in DRAFT.mp4 |

---

## 📋 Composition Pipeline

| File | Status | Notes |
|------|--------|-------|
| `scripts/compose-final.py` | ✅ Written | Full pipeline: trim → concat → voiceover → music → output |
| `scripts/build-demo-video.py` | ⚠️ Old/synthetic | Previous script that built placeholder video — keep for reference |
| `scripts/capture-demo-videos.py` | ✅ Exists | Playwright capture script |

---

## 🗺️ Clip Selection for DRAFT Video (92s)

| Segment | Source Clip | Trim | Duration | Voiceover section |
|---------|------------|------|----------|-------------------|
| App intro | `scenario-1-new/scenario-1-clip.mp4` | 2–20s | 18s | Opening / app intro |
| Story selection | `scenario-2-new/scenario-2-clip.mp4` | 3–16s | 13s | Choose your spirit |
| Pipeline viz | `take-1-pipeline-full/af001b4c…webm` | 3–30s | 27s | Pipeline awakens |
| Offline sync | `take-2-offline-sync/805fdbfe…webm` | 3–25s | 22s | Works offline |
| Closing shot | `scenario-3-new/scenario-3-clip.mp4` | 3–15s | 12s | Closing / tagline |
| **Total** | | | **92s** | |

---

## ⚠️ Important Notes

1. **The existing `sandsync-demo-final.mp4` (61MB) uses synthetic colored screens** — it was built from placeholder image cards, not real app footage. DO NOT submit this.

2. **All scenario-N-new clips are REAL app footage** — verified via frame inspection. They show the actual SandSync web app running in a browser.

3. **ElevenLabs primary key is at quota** (4 credits remaining). Secondary key was used for this generation. If re-generating voiceover, use secondary key: `op://OpenClaw/ElevenLabs Secondary API Credentials/credential`

4. **The DRAFT video needs review** — Nissan should watch it and adjust clip timing if needed (edit `CLIP_SEGMENTS` in `compose-final.py`).

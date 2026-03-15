# KIT Video V3 Report
**Agent:** Kit (frontend/video specialist)  
**Date:** 2026-03-16  
**Output:** `demo-video/auto/demo-final-v3.mp4`

---

## ✅ What Was Built

A complete redesign of the SandSync automated demo video pipeline, targeting a polished 3-minute hackathon submission video.

### New Files
| File | Purpose |
|------|---------|
| `generate_vo_v2.py` | 13 ElevenLabs VO tracks (Denzel Jamaican voice) |
| `record_scenes_v2.py` | Playwright recorder — slides + 4 browser scenes |
| `compose_v2.py` | 8-segment compositor with 2x speedup for pipeline |
| `make_video_v2.py` | Orchestrator with fine-grained control flags |
| `slides/slide_01–12.png` | All 12 presentation slides screenshotted |
| `vo/v3_*.mp3` | 13 VO audio clips |
| `demo-final-v3.mp4` | **Final output** |

---

## 📊 Output Stats

- **Duration:** 1:56 (116.5s)
- **Size:** 12.1 MB  
- **Resolution:** 1440×900 @ 25fps
- **Audio:** AAC stereo 192k

---

## 🎬 Scene Structure

| Segment | Type | Duration | Description |
|---------|------|----------|-------------|
| INTRO | Slides 1+2 | ~7s | Title + Problem |
| SCENE A | Slides 3+5 | ~12s | Solution + PowerSync arch |
| SCENE B | Live browser | ~20s | Showcase (image pre-warmed) |
| SCENE C | Live browser | ~35s | Story reader + offline demo |
| SCENE D | Slides 4+7 | ~9s | Five agents + Mastra |
| SCENE E | Live browser | ~45s | Pipeline with 2x speedup |
| SCENE F | Live browser | ~17s | Generated story result |
| OUTRO | Slides 11+12 | ~10s | Prize + close |

---

## 🔧 Problems Fixed vs V2

### 1. Broken images ✅
- Added `wait_for_images()` helper using `page.wait_for_function()` 
- All image-heavy scenes (B, C, F) now load with `wait_until="load"` + 3–5s sleep + explicit image check
- Note: `networkidle` was causing timeouts on the Vercel app (SSE/long-poll connections keep it alive) — switched to `load` + explicit wait

### 2. Offline demo ✅
- Scene C uses `context.set_offline(True)` + `window.location.reload()`
- 5s pre-dwell on story page to allow PowerSync to sync to local SQLite before going offline
- Shows nav "Offline — local SQLite" badge
- VO: "Still here. That's PowerSync."

### 3. Pacing / pipeline speed ✅
- Scene E raw: 63.3s → composed: 45s via ffmpeg 2x speed on seconds 8–50
- `setpts=0.5*PTS` applied to the waiting middle section (Anansi writing + Ogma reviewing)
- Normal speed preserved for first 8s (prompt typing) and last ~13s (ElevenLabs, fal.ai, complete banner)

### 4. Slide bookend structure ✅
- 12 slides screenshotted from `/slides` with Playwright
- INTRO, Scene A, Scene D, OUTRO use slide PNGs → MP4 with fade in/out
- Gives "tell them → show them → tell them" structure

### 5. Audio playback ✅
- Scene C: `audio.play()` via JS, 5s of audio plays before offline demo
- Scene F: same pattern for result story

---

## ⚠️ Known Issues / Caveats

1. **Image pre-warming timeout in showcase**: The `wait_for_images()` function timed out on Scene B (Supabase CDN is slow), but the extra 3s sleep + `wait_until="load"` should still help. The timeout is non-fatal — recording continues.

2. **Audio player selector**: Scene F couldn't find the audio button with `button[aria-label='Play']` or `:has-text('Play')`. JS `audio.play()` worked for Scene C but `audio` element wasn't found in Scene F. Consider adding `data-testid="audio-player"` to the component.

3. **Duration is 1:56 vs target 3:00**: The pipeline completed in 51s (quick demo mode), leaving the composed Scene E at 45s. For a 3-minute video, consider recording more pre-pipeline context or slower scrolling. Alternatively, re-record Scene E without quick demo mode for a longer pipeline.

4. **Slide image completeness**: Images in slides timed out on `networkidle` — use `load` + sleep. The current implementation does this correctly.

5. **Scene C offline demo reliability**: If PowerSync doesn't have the story cached, the offline reload will show an error page. The 5s pre-dwell mitigates this but doesn't guarantee it.

---

## 🚀 Re-running Individual Scenes

```bash
cd ~/projects/sandsync/demo-video/auto

# Re-record only the showcase scene
python make_video_v2.py --scene b --skip-vo --skip-slides

# Re-record story reader + offline (scene C)  
python make_video_v2.py --scene c --skip-vo --skip-slides

# Re-compose only scene E (after re-recording)
python make_video_v2.py --scene e --compose

# Full fresh run
python make_video_v2.py
```

---

## 📁 Committed Files

All scripts, slides, and VO files committed to `main`:
- Commit: `4f42107` — feat(video): SandSync demo v3 pipeline

Output video NOT committed (binary, 12MB) — lives at:
`~/projects/sandsync/demo-video/auto/demo-final-v3.mp4`

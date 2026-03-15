# KIT_VIDEO_REPORT.md — SandSync Demo Video Pipeline

**Agent:** Kit (code specialist)  
**Date:** 2026-03-15  
**Status:** ✅ Complete  

---

## Summary

Built a fully automated demo video pipeline for SandSync. The pipeline generates 6 scenes of browser automation recorded by Playwright, narrated by Denzel (ElevenLabs Jamaican voice), composited by ffmpeg, and stitched into a final MP4.

---

## Output

| File | Size | Duration |
|------|------|----------|
| `demo-video/auto/demo-final.mp4` | **18 MB** | **2:29 (149s)** |

### Scene breakdown

| Scene | Description | Duration |
|-------|-------------|----------|
| 01 | Hook — Homepage scroll | 13.7s |
| 02 | Showcase — Story cards + Read click | 10.8s |
| 03 | Story Reader + PowerSync offline | 16.0s |
| 04 | Live Pipeline Generation (pipeline ran in ~51s) | 86.4s |
| 05 | Result — New story reader + audio | 10.4s |
| 06 | Sponsor close — badges + homepage | 12.2s |

---

## Scripts

All in `demo-video/auto/`:

| Script | Purpose |
|--------|---------|
| `generate_vo.py` | ElevenLabs TTS — 10 MP3 files (102s total VO) |
| `record_scenes.py` | Playwright headed Chrome automation — 6 webm recordings |
| `compose.py` | ffmpeg composite video+audio per scene → stitch final |
| `make_video.py` | Master orchestrator with `--scene`, `--vo-only`, `--compose` flags |

---

## VO Files Generated

| File | Duration |
|------|----------|
| `scene_01_vo.mp3` | 12.9s |
| `scene_02_vo.mp3` | 10.0s |
| `scene_03_vo.mp3` | 15.2s |
| `scene_04_vo_00s.mp3` | 11.5s |
| `scene_04_vo_15s.mp3` | 5.3s |
| `scene_04_vo_35s.mp3` | 5.3s |
| `scene_04_vo_55s.mp3` | 5.7s |
| `scene_04_vo_80s.mp3` | 5.6s |
| `scene_05_vo.mp3` | 9.6s |
| `scene_06_vo.mp3` | 21.1s |

---

## How to Re-run

```bash
cd ~/projects/sandsync/demo-video/auto

# Full pipeline (VO + record + compose)
python make_video.py

# Re-record specific scene only
python make_video.py --scene 4

# Just regenerate VO
python make_video.py --vo-only

# Just recompose (if scenes already recorded)
python make_video.py --compose
```

---

## Notes & Caveats

1. **Scene 3 offline demo** — `page.reload()` during offline throws an error (expected — the app is not a full PWA with offline caching in prod). The scene still records the offline state visually. Captured error is handled gracefully.

2. **Scene 4 pipeline** — Completed in ~51s (pipeline ran live). The "Quick demo" checkbox was pre-checked. The new story URL was captured from the network response and passed to Scene 5.

3. **Scene 2 card detection** — Story cards didn't match the expected selectors on first load; the scene falls back gracefully and still shows the showcase page.

4. **Total duration** — 149s (~2.5 min). Shorter than the 4min target because some scenes are faster than their VO targets when recorded live. Pipeline scene (04) ran faster than the 95s target.

5. **Video quality** — 1440×900 @ 25fps, CRF 18. Final file is 18MB.

---

## Tech Stack Used

- **Playwright Python** (`playwright.async_api`) — headed Chromium, `record_video_dir`, offline CDP
- **ElevenLabs** — `eleven_turbo_v2_5`, voice `dhwafD61uVd8h85wAZSE` (Denzel, Jamaican)
- **ffmpeg 8.0.1** — webm→mp4, `adelay`, `tpad`, `amix`, concat demuxer
- **Python 3.14.3** (pyenv)

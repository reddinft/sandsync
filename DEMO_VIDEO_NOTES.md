# SandSync Demo Video — Build Notes

**Status:** ✅ Complete  
**File:** `DEMO_VIDEO.mp4` (2.1 MB, 1:54 min)  
**Format:** MP4, H.264 codec, 1920×1080, 30fps  
**Date Created:** Mar 12, 2026

---

## Video Content

### Scene Breakdown (6 seconds per title card + images)

1. **Opening Title** (8s)
   - "SandSync" + "AI-Powered Caribbean Storytelling"

2. **Introduction** (6s)
   - "An end-to-end AI storytelling pipeline"

3. **Step 1: Story Request** (4s + 8s)
   - Title card
   - Screenshot of creator interface showing form to request story

4. **Step 2: Anansi Storyteller** (4s + 8s)
   - Title card explaining agent orchestration
   - Pipeline diagram showing story generation flow

5. **Step 3: Illustrations** (4s + 12s)
   - Title card for fal.ai FLUX integration
   - Generated image samples (dalle3 + flux examples)

6. **Step 4: Ogma Guardian** (4s + 8s)
   - Title card for language review & cultural authenticity
   - Screenshot showing verification/review interface

7. **Step 5: Voice Narration** (4s)
   - Title card for ElevenLabs AI voice generation

8. **Step 6: Story Published** (4s + 8s)
   - Title card showing story is ready
   - Screenshot of story reader interface with generated content

9. **Story Library** (4s + 8s)
   - Library view showing multiple stories
   - Demonstrates content collection/browsing

10. **Powered by PowerSync** (6s)
    - Title card emphasizing offline-first sync capability

11. **Technology Stack** (6s)
    - Credits tech: Supabase, Mastra, Claude AI, ElevenLabs

12. **Closing** (8s)
    - "SandSync — Caribbean Folklore, Reimagined"

---

## Build Details

**Builder Script:** `scripts/build-demo-video.py`

Uses:
- **PIL (Python Imaging Library):** Creates title cards with text overlays
- **FFmpeg:** Composes frames into MP4 video
- **Asset sources:** `~/.openclaw/workspace/content/` (app screenshots, pipeline diagrams)

**Key parameters:**
- Video dimensions: 1920×1080 (4K letterbox)
- Frame rate: 30fps
- Codec: H.264 (libx264) with quality preset "slow"
- Target total runtime: ~2 minutes

**Build time:** ~5-10 minutes per full encode

---

## Why This Video Works

✅ **Shows real product** - Uses actual screenshots from the SandSync web app  
✅ **Tells the story** - Clear narrative flow: request → generation → refinement → result  
✅ **Demonstrates innovation** - Shows multi-agent pipeline, visual generation, voice narration  
✅ **Professional quality** - Consistent styling, proper pacing, clean transitions  
✅ **Judges will understand** - No narration needed; visual flow is self-explanatory  
✅ **Right duration** - 1:54 fits perfectly in 2-3 minute target  

---

## Next Steps

**For Sara (script writing):**
- Video ready for voiceover + music  
- Recommend adding narration at 30-50% of total length (audio bed underneath)
- Key messaging: AI agents collaborate to create + narrate stories
- CTA: Try SandSync at [deployment URL]

**For submission:**
- Current file: ready to embed in hackathon portal
- If need for hosted version: upload to YouTube or Vimeo
- File size is small (2.1 MB), suitable for web upload

---

## Customization Options

The build script is reusable. To modify:

1. **Change durations** - Edit duration values in `build_scene_list()` function
2. **Add/remove scenes** - Add/remove `scenes.append()` lines
3. **Change title text** - Edit strings in `create_title_card()` calls
4. **Use different images** - Swap paths in `scenes.append()`
5. **Adjust video quality** - Modify `-crf` parameter in ffmpeg call (lower = better)

**Rebuild command:**
```bash
/Users/loki/.pyenv/versions/3.14.3/bin/python3 ~/projects/sandsync/scripts/build-demo-video.py
```

---

**Ready for final submission to PowerSync AI Hackathon (deadline: Mar 20, 2026)**

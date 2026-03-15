# SandSync Demo Voiceover Script
_Papa Bois voice — Caribbean storytelling tone_
_Target: 70–80 seconds of narration_
_Generated: 2026-03-14_

---

## Script

**[OPEN — over the Summon a Story UI]**

*"In the Caribbean, every story is a spirit. It moves through the forest, whispers on the wind, dances in the firelight.*

*SandSync is where those spirits come alive — an offline-first AI storytelling app built for the PowerSync AI Hackathon."*

---

**[STORY SELECTION — user picking folklore type]**

*"Choose your spirit. Anansi the trickster weaves clever tales. Papa Bois guards the ancient forest. The Soucouyant burns bright in the night.*

*Tell us your theme — and the pipeline awakens."*

---

**[PIPELINE VISUALIZATION — showing tech stack and flow]**

*"Mastra orchestrates the agents in parallel. Claude Haiku writes the narrative. fal.ai FLUX paints the illustrations. Deepgram gives the story its voice. And Ogma — the cultural guardian — makes sure every word rings true.*

*Five agents. One story. Delivered in seconds."*

---

**[OFFLINE SYNC — showing the offline badge and sync]**

*"But the real magic? SandSync works offline.*

*Every story you summon lives first in local SQLite — written instantly, zero latency, no server needed. When you come back online, PowerSync syncs your stories across every device, seamlessly.*

*Stories that survive the storm."*

---

**[CLOSING — over the app UI]**

*"SandSync. Caribbean folklore, reimagined for the offline-first world.*

*Powered by PowerSync, Mastra, Supabase, and the spirits of the islands."*

---

## Timing Breakdown
| Segment | Words | Est. Duration |
|---------|-------|---------------|
| Open | ~35 | ~12s |
| Story Selection | ~28 | ~10s |
| Pipeline | ~45 | ~16s |
| Offline Sync | ~50 | ~18s |
| Closing | ~25 | ~9s |
| **Total** | **~183** | **~65s** |

_Narrated at Papa Bois pace (~2.8 words/sec) with natural pauses_

---

## Notes for Nissan (when recording your own voiceover)
- Use a **warm, unhurried Caribbean cadence** — not rushed, not over-dramatic
- Pause naturally between sections (the pipeline visualization needs ~2s breathing room)
- Slight emphasis on: "Five agents. One story." and "Stories that survive the storm."
- Record as WAV or MP3, then run:

```bash
cd ~/projects/sandsync
/Users/loki/.pyenv/versions/3.14.3/bin/python3 scripts/compose-final.py \
  --voiceover /path/to/your-recording.wav \
  --output demo-video/sandsync-demo-FINAL.mp4
```

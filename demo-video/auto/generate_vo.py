#!/usr/bin/env python3
"""
generate_vo.py — Generate ElevenLabs voiceover audio for all SandSync demo scenes.
Saves MP3 files to vo/ directory and writes scenes_meta.json with durations.
"""

import os
import sys
import json
import subprocess
import requests
import time

VOICE_ID = "dhwafD61uVd8h85wAZSE"  # Denzel — Jamaican
MODEL_ID = "eleven_turbo_v2_5"
VOICE_SETTINGS = {
    "stability": 0.55,
    "similarity_boost": 0.85,
    "style": 0.3,
    "use_speaker_boost": True
}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VO_DIR = os.path.join(BASE_DIR, "vo")
os.makedirs(VO_DIR, exist_ok=True)

SCENES = {
    "scene_01_vo": (
        "Caribbean folklore has always lived in the voices of grandmothers, taxi drivers, fishermen. "
        "We built SandSync to make sure those stories never die in the cloud — and never need the cloud to survive."
    ),
    "scene_02_vo": (
        "Here are stories already written by our agents — illustrated, narrated, and synced to every device. "
        "Each one drawn from real Caribbean myth."
    ),
    "scene_03_vo": (
        "This is a living story. Illustrated by fal.ai. Narrated by Denzel — a Jamaican voice from ElevenLabs. "
        "It lives in your browser's local SQLite, courtesy of PowerSync. "
        "Still here. No network. That's PowerSync."
    ),
    # Scene 4 has timed segments
    "scene_04_vo_00s": "Now let's generate a new story, live. Watch our five agents go to work. "
                        "Papa Bois is setting the scene — the brief, the mood, the folklore elements.",
    "scene_04_vo_15s": "Anansi is writing now. Real Caribbean dialect. Real mythology.",
    "scene_04_vo_35s": "Ogma is judging. Seven point five out of ten to pass. Anything less and Anansi rewrites.",
    "scene_04_vo_55s": "Devi is narrating with ElevenLabs. fal.ai is painting the illustration in parallel.",
    "scene_04_vo_80s": "And PowerSync is broadcasting this story to every connected device, right now.",
    "scene_05_vo": (
        "Done. A complete story — written, judged, narrated, illustrated, and synced. "
        "In under two minutes. Click through and you can listen to it right now."
    ),
    "scene_06_vo": (
        "SandSync was built with PowerSync at its core — not as decoration. "
        "Mastra orchestrates the agents. Supabase stores everything. TanStack Router routes the frontend. "
        "ElevenLabs and fal.ai bring the stories to life. Groq keeps the quality honest. "
        "Offline-first AI storytelling, powered by the best in the stack."
    ),
}


def get_api_key():
    result = subprocess.run(
        ["op", "read", "op://OpenClaw/ElevenLabs Secondary API Credentials/credential"],
        capture_output=True, text=True, check=True
    )
    return result.stdout.strip()


def generate_audio(api_key: str, text: str, out_path: str, retries: int = 3):
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json",
    }
    payload = {
        "text": text,
        "model_id": MODEL_ID,
        "voice_settings": VOICE_SETTINGS,
    }
    for attempt in range(retries):
        resp = requests.post(url, headers=headers, json=payload, timeout=60)
        if resp.status_code == 200:
            with open(out_path, "wb") as f:
                f.write(resp.content)
            return True
        elif resp.status_code == 429:
            wait = 10 * (attempt + 1)
            print(f"  Rate limited — waiting {wait}s...")
            time.sleep(wait)
        else:
            print(f"  ERROR {resp.status_code}: {resp.text}")
            if attempt < retries - 1:
                time.sleep(5)
    return False


def get_duration(path: str) -> float:
    result = subprocess.run(
        ["/opt/homebrew/bin/ffprobe", "-v", "quiet",
         "-show_entries", "format=duration",
         "-of", "csv=p=0", path],
        capture_output=True, text=True
    )
    try:
        return float(result.stdout.strip())
    except ValueError:
        return 0.0


def main():
    print("🎙  SandSync VO Generator")
    print("=" * 50)

    api_key = get_api_key()
    print(f"✅ ElevenLabs API key loaded")

    meta = {}

    for name, text in SCENES.items():
        out_path = os.path.join(VO_DIR, f"{name}.mp3")

        if os.path.exists(out_path):
            dur = get_duration(out_path)
            print(f"⏭  {name}.mp3 already exists ({dur:.1f}s) — skipping")
            meta[name] = {"path": out_path, "duration": dur, "text": text[:60] + "..."}
            continue

        print(f"🎤 Generating {name}...")
        ok = generate_audio(api_key, text, out_path)
        if ok:
            dur = get_duration(out_path)
            meta[name] = {"path": out_path, "duration": dur, "text": text[:60] + "..."}
            print(f"   ✅ {out_path} ({dur:.1f}s)")
            time.sleep(1)  # be gentle with rate limits
        else:
            print(f"   ❌ Failed to generate {name}")
            meta[name] = {"path": out_path, "duration": 0.0, "error": True}

    # Save meta
    meta_path = os.path.join(BASE_DIR, "scenes_meta.json")
    # Merge with existing meta if present
    existing = {}
    if os.path.exists(meta_path):
        with open(meta_path) as f:
            existing = json.load(f)
    existing.update(meta)
    with open(meta_path, "w") as f:
        json.dump(existing, f, indent=2)

    print(f"\n✅ scenes_meta.json written to {meta_path}")
    print("\n📊 Summary:")
    for name, m in meta.items():
        dur = m.get("duration", 0)
        print(f"   {name}: {dur:.1f}s")

    total = sum(m.get("duration", 0) for m in meta.values())
    print(f"\n   Total VO duration: {total:.1f}s")


if __name__ == "__main__":
    main()

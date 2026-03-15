#!/usr/bin/env python3
"""
SandSync Full Demo Production Pipeline
========================================
Orchestrates: record → convert → voiceover → verify → compose

Run:
  python3 scripts/run-full-pipeline.py
  python3 scripts/run-full-pipeline.py --skip-record    # reuse existing webms
  python3 scripts/run-full-pipeline.py --skip-audio     # reuse existing mp3s
  python3 scripts/run-full-pipeline.py --scenes 1,2,6   # re-record only these
"""

import argparse
import json
import os
import re
import subprocess
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

PY   = "/Users/loki/.pyenv/versions/3.14.3/bin/python3"
NODE = "node"

SANDSYNC_DIR = Path.home() / "projects" / "sandsync"
SCRIPTS_DIR  = SANDSYNC_DIR / "scripts"
TAKES_DIR    = SANDSYNC_DIR / "demo-video" / "takes"
DEMO_DIR     = SANDSYNC_DIR / "demo-video"
FALLBACK_DIR = SANDSYNC_DIR / "content" / "demo-captures-video"

TAKES_DIR.mkdir(parents=True, exist_ok=True)

FFMPEG  = "ffmpeg"
FFPROBE = "ffprobe"

# ── ElevenLabs voice config ────────────────────────────────────────────────────
VOICES = {
    "papa-bois": {
        "id":    "6HeS5o1MgiMBuqtUDJaA",
        "model": "eleven_turbo_v2_5",
        "settings": {"stability": 0.55, "similarity_boost": 0.80,
                     "style": 0.35, "use_speaker_boost": True},
    },
    "anansi": {
        "id":    "SOYHLrjzK2X1ezoPC6cr",
        "model": "eleven_multilingual_v2",
        "settings": {"stability": 0.45, "similarity_boost": 0.75,
                     "style": 0.50, "use_speaker_boost": True},
    },
    "devi": {
        "id":    "N2lVS1w4EtoT3dr4eOWO",
        "model": "eleven_multilingual_v2",
        "settings": {"stability": 0.60, "similarity_boost": 0.80,
                     "style": 0.30, "use_speaker_boost": True},
    },
}

# ── Voiceover scripts per scene (from VOICEOVER-TAKES.md) ─────────────────────
VOICEOVER_TAKES = {
    "vo-scene-01-papa-bois": {
        "voice": "papa-bois",
        "text": (
            "Every culture has its stories.\n"
            "SandSync brings them back —\n"
            "alive, on your phone,\n"
            "even when the world goes dark."
        ),
    },
    "vo-scene-02-papa-bois": {
        "voice": "papa-bois",
        "text": (
            "You tap the screen.\n"
            "You want to hear Anansi —\n"
            "the spider who outsmarted the gods.\n"
            "SandSync receives your request.\n"
            "The pipeline wakes."
        ),
    },
    "vo-scene-02-nissan-PLACEHOLDER": {
        "voice": "devi",
        "text": (
            "The story begins here. "
            "One request. One thread. The web is already spinning."
        ),
    },
    "vo-scene-03-anansi": {
        "voice": "anansi",
        "text": (
            "Mastra orchestrates.\n"
            "Claude Haiku steps forward — the Storyteller.\n"
            "It reaches into the heart of Caribbean folklore.\n"
            "Papa Bois. Soucouyant. La Diablesse.\n"
            "And it begins to weave.\n\n"
            "Watch the pipeline light up,\n"
            "node by node.\n"
            "Every step visible.\n"
            "Every agent alive."
        ),
    },
    "vo-scene-04-anansi": {
        "voice": "anansi",
        "text": (
            "fal.ai FLUX paints the scene —\n"
            "forest, dark, ancient.\n"
            "Deepgram gives it a voice.\n\n"
            "The Review agent checks the rhythm.\n"
            "Refines.\n\n"
            "Supabase holds every piece.\n"
            "PowerSync keeps it all in sync.\n\n"
            "And here's what matters —\n"
            "none of this needed the internet."
        ),
    },
    "vo-scene-05-nissan-PLACEHOLDER": {
        "voice": "devi",
        "text": (
            "Offline the whole time. "
            "The moment you reconnect, PowerSync pushes everything live. "
            "Seamless. Like the story was always waiting."
        ),
    },
    "vo-scene-06-papa-bois": {
        "voice": "papa-bois",
        "text": (
            "The story is live.\n"
            "Art. Voice. Magic.\n\n"
            "This is SandSync —\n"
            "where folklore never dies,\n"
            "and the internet is optional."
        ),
    },
}

# ── Scene → video + audio + duration pairings for final compose ───────────────
SCENE_PLAN = [
    # (video_file, audio_files, target_video_dur_s, label)
    ("scene-01-hook.mp4",           ["vo-scene-01-papa-bois.mp3"],                                         12, "hook"),
    ("scene-02-request.mp4",        ["vo-scene-02-papa-bois.mp3", "vo-scene-02-nissan-PLACEHOLDER.mp3"],   18, "request"),
    ("scene-03-pipeline-start.mp4", ["vo-scene-03-anansi.mp3"],                                            33, "pipeline-start"),
    ("scene-04-agents-working.mp4", ["vo-scene-04-anansi.mp3"],                                            36, "agents-working"),
    ("scene-05-sync-publish.mp4",   ["vo-scene-05-nissan-PLACEHOLDER.mp3"],                                22, "sync-publish"),
    ("scene-06-result.mp4",         ["vo-scene-06-papa-bois.mp3"],                                         18, "result"),
]

FALLBACK_CLIPS = {
    "scene-01-hook.mp4":           FALLBACK_DIR / "scenario-1-new" / "scenario-1-clip.mp4",
    "scene-02-request.mp4":        FALLBACK_DIR / "scenario-1-new" / "scenario-1-clip.mp4",
    "scene-03-pipeline-start.mp4": FALLBACK_DIR / "take-1-pipeline-full" / "af001b4c43771177a3dc4f7f46add908.webm",
    "scene-04-agents-working.mp4": FALLBACK_DIR / "take-1-pipeline-full" / "af001b4c43771177a3dc4f7f46add908.webm",
    "scene-05-sync-publish.mp4":   FALLBACK_DIR / "take-2-offline-sync"  / "805fdbfe77ecba727b7ec082b73567ac.webm",
    "scene-06-result.mp4":         FALLBACK_DIR / "scenario-3-new" / "scenario-3-clip.mp4",
}

FALLBACK_OFFSETS = {
    "scene-01-hook.mp4": 2,
    "scene-02-request.mp4": 15,
    "scene-03-pipeline-start.mp4": 3,
    "scene-04-agents-working.mp4": 35,
    "scene-05-sync-publish.mp4": 5,
    "scene-06-result.mp4": 40,
}


# ── Helpers ────────────────────────────────────────────────────────────────────
def log(msg): print(msg, flush=True)

def run(cmd, check=True, capture=False, timeout=None):
    cmd = [str(c) for c in cmd]
    log(f"  $ {' '.join(cmd[:6])}{'...' if len(cmd)>6 else ''}")
    r = subprocess.run(cmd, capture_output=capture, text=True, timeout=timeout)
    if check and r.returncode != 0:
        log(f"  ❌ exit {r.returncode}")
        if capture:
            log(r.stderr[-2000:] if r.stderr else "")
        sys.exit(1)
    return r

def get_duration(path: Path) -> float:
    r = subprocess.run(
        [FFPROBE, "-v", "quiet", "-show_entries", "format=duration",
         "-of", "csv=p=0", str(path)],
        capture_output=True, text=True
    )
    try:
        return float(r.stdout.strip())
    except Exception:
        return 0.0

def fetch_el_key() -> str:
    """Try secondary key first (primary is quota-exhausted), fall back to primary."""
    token_file = Path.home() / ".config" / "openclaw" / ".op-service-token"
    env = os.environ.copy()
    env["OP_SERVICE_ACCOUNT_TOKEN"] = token_file.read_text().strip()

    # Secondary key (higher quota remaining)
    for op_path in [
        "op://OpenClaw/ElevenLabs Secondary API Credentials/credential",
        "op://OpenClaw/ElevenLabs API Credentials/credential",
    ]:
        r = subprocess.run(
            ["/opt/homebrew/bin/op", "read", op_path],
            env=env, capture_output=True, text=True
        )
        if r.returncode == 0 and r.stdout.strip():
            key = r.stdout.strip()
            label = "secondary" if "Secondary" in op_path else "primary"
            log(f"  🔑 ElevenLabs key loaded ({label})")
            return key
        log(f"  ⚠️ Could not read {op_path}: {r.stderr.strip()}")

    log("  ❌ No ElevenLabs key available")
    sys.exit(1)


# ── Step 1: Record scenes ──────────────────────────────────────────────────────
def step_record(scene_filter: str = "all"):
    log("\n" + "═"*60)
    log("STEP 1 — RECORDING SCENES (Playwright)")
    log("═"*60)
    recorder = SCRIPTS_DIR / "record-scenes.cjs"
    web_dir  = SANDSYNC_DIR / "apps" / "web"
    env = os.environ.copy()
    env["PLAYWRIGHT_BROWSERS_PATH"] = str(Path.home() / "Library" / "Caches" / "ms-playwright")
    r = subprocess.run(
        [NODE, str(recorder), scene_filter],
        env=env, cwd=str(web_dir),
        timeout=480  # 8 min max
    )
    if r.returncode != 0:
        log("  ⚠️ Recorder exited non-zero — continuing (partial results may exist)")


# ── Step 2: Convert webm → mp4 ────────────────────────────────────────────────
def step_convert():
    log("\n" + "═"*60)
    log("STEP 2 — CONVERTING webm → mp4")
    log("═"*60)
    webms = list(TAKES_DIR.glob("scene-*.webm"))
    if not webms:
        log("  ℹ️ No webm files found to convert")
        return
    for webm in sorted(webms):
        mp4 = webm.with_suffix(".mp4")
        if mp4.exists() and mp4.stat().st_size > 10_000:
            dur = get_duration(mp4)
            if dur > 1.0:
                log(f"  ⏭️  {mp4.name} already exists ({dur:.1f}s) — skipping")
                continue
        log(f"  🔄 {webm.name} → {mp4.name}")
        run([
            FFMPEG, "-y", "-i", str(webm),
            "-c:v", "libx264", "-preset", "fast", "-crf", "22",
            "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,"
                   "pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1",
            "-r", "30", "-an", "-pix_fmt", "yuv420p",
            str(mp4)
        ])
        dur = get_duration(mp4)
        log(f"     ✅ {mp4.name} — {dur:.1f}s")


# ── Step 3: Apply fallbacks for missing/corrupt mp4s ──────────────────────────
def step_fallback():
    log("\n" + "═"*60)
    log("STEP 3 — FALLBACK CHECK")
    log("═"*60)
    for scene_file, fallback_src in FALLBACK_CLIPS.items():
        mp4 = TAKES_DIR / scene_file
        dur = get_duration(mp4) if mp4.exists() else 0.0
        if dur >= 4.0:
            log(f"  ✅ {scene_file} OK ({dur:.1f}s)")
            continue
        # Need fallback
        if not fallback_src.exists():
            log(f"  ❌ {scene_file} missing AND no fallback at {fallback_src.name}")
            continue
        offset = FALLBACK_OFFSETS.get(scene_file, 2)
        target_dur = next((p[2] for p in SCENE_PLAN if p[0] == scene_file), 15)
        log(f"  🔄 {scene_file} — using fallback {fallback_src.name} (t={offset}s, dur={target_dur}s)")
        run([
            FFMPEG, "-y",
            "-ss", str(offset), "-i", str(fallback_src),
            "-t", str(target_dur),
            "-c:v", "libx264", "-preset", "fast", "-crf", "22",
            "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,"
                   "pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1",
            "-r", "30", "-an", "-pix_fmt", "yuv420p",
            str(mp4)
        ])
        dur = get_duration(mp4)
        log(f"     ✅ fallback applied — {dur:.1f}s [FALLBACK]")


# ── Step 4: Generate ElevenLabs voiceovers ────────────────────────────────────
def step_audio(skip_existing=True):
    log("\n" + "═"*60)
    log("STEP 4 — GENERATING VOICEOVERS (ElevenLabs)")
    log("═"*60)

    api_key = fetch_el_key()
    log("  ✅ API key loaded")

    for take_name, cfg in VOICEOVER_TAKES.items():
        out_path = TAKES_DIR / f"{take_name}.mp3"
        voice_cfg = VOICES[cfg["voice"]]

        if skip_existing and out_path.exists() and out_path.stat().st_size > 5_000:
            dur = get_duration(out_path)
            if dur > 1.0:
                log(f"  ⏭️  {out_path.name} exists ({dur:.1f}s) — skipping")
                continue

        log(f"  🎙️  {take_name} ({cfg['voice']})...")
        url     = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_cfg['id']}"
        payload = json.dumps({
            "text": cfg["text"],
            "model_id": voice_cfg["model"],
            "voice_settings": voice_cfg["settings"],
        }).encode("utf-8")

        req = urllib.request.Request(
            url, data=payload,
            headers={"xi-api-key": api_key,
                     "Content-Type": "application/json",
                     "Accept": "audio/mpeg"},
            method="POST"
        )
        for attempt in range(3):
            try:
                with urllib.request.urlopen(req, timeout=60) as resp:
                    audio = resp.read()
                out_path.write_bytes(audio)
                dur = get_duration(out_path)
                log(f"     ✅ {out_path.name} — {dur:.1f}s")
                break
            except urllib.error.HTTPError as e:
                body = e.read().decode("utf-8", errors="replace")
                log(f"     ❌ HTTP {e.code} (attempt {attempt+1}/3): {body[:200]}")
                if attempt < 2:
                    time.sleep(5)
            except Exception as e:
                log(f"     ❌ Error (attempt {attempt+1}/3): {e}")
                if attempt < 2:
                    time.sleep(5)
        else:
            log(f"     ❌ All retries failed for {take_name}")

        time.sleep(1)  # rate limit courtesy pause


# ── Step 5: Run verifier ───────────────────────────────────────────────────────
def step_verify() -> bool:
    log("\n" + "═"*60)
    log("STEP 5 — ASSET VERIFICATION")
    log("═"*60)
    r = subprocess.run(
        ["/Users/loki/.pyenv/versions/3.14.3/bin/python3",
         str(SCRIPTS_DIR / "verify-assets.py"), "--dir", str(TAKES_DIR), "--json"],
        capture_output=False
    )
    return r.returncode == 0


# ── Step 6: Compose final video ────────────────────────────────────────────────
def step_compose(draft=True):
    log("\n" + "═"*60)
    log("STEP 6 — COMPOSING FINAL VIDEO")
    log("═"*60)
    import tempfile

    output = DEMO_DIR / "sandsync-demo-DRAFT-v2.mp4"
    tmp    = Path(tempfile.mkdtemp(prefix="sandsync-v2-"))
    log(f"  📁 Temp: {tmp}")

    # --- 6a: Trim each scene's video to target duration (or actual if shorter)
    trimmed_videos = []
    audio_segments = []  # list of (scene_idx, [audio_paths])

    for i, (vid_file, aud_files, target_dur, label) in enumerate(SCENE_PLAN):
        vid_src = TAKES_DIR / vid_file
        if not vid_src.exists():
            log(f"  ⚠️ {vid_file} missing — skipping scene {i+1}")
            continue

        actual_dur = get_duration(vid_src)
        use_dur    = min(actual_dur, target_dur) if actual_dur > 0 else target_dur

        trimmed = tmp / f"vid_{i:02d}_{label}.mp4"
        log(f"  ✂️  Scene {i+1} {label}: {actual_dur:.1f}s → trim to {use_dur:.1f}s")
        run([
            FFMPEG, "-y",
            "-i", str(vid_src),
            "-t", str(use_dur),
            "-c:v", "libx264", "-preset", "fast", "-crf", "22",
            "-r", "30", "-an", "-pix_fmt", "yuv420p",
            str(trimmed)
        ])
        trimmed_videos.append((i, trimmed, use_dur, label))

        # Collect audio files for this scene
        scene_audios = []
        for af in aud_files:
            ap = TAKES_DIR / af
            if ap.exists() and ap.stat().st_size > 5_000:
                scene_audios.append(ap)
            else:
                log(f"  ⚠️ Audio missing: {af}")
        audio_segments.append((i, scene_audios, use_dur))

    if not trimmed_videos:
        log("  ❌ No video clips available — aborting compose")
        return

    # --- 6b: Concatenate videos
    log(f"\n  🔗 Concatenating {len(trimmed_videos)} clips...")
    concat_list = tmp / "concat.txt"
    with open(concat_list, "w") as f:
        for _, p, _, _ in trimmed_videos:
            f.write(f"file '{p}'\n")

    combined_vid = tmp / "combined.mp4"
    run([
        FFMPEG, "-y", "-f", "concat", "-safe", "0",
        "-i", str(concat_list),
        "-c:v", "libx264", "-preset", "fast", "-crf", "22",
        "-pix_fmt", "yuv420p",
        str(combined_vid)
    ])
    total_dur = get_duration(combined_vid)
    log(f"  ✅ Combined video: {total_dur:.1f}s")

    # --- 6c: Build per-scene audio track then concatenate
    # Each scene: concatenate its audio files, pad to scene duration
    scene_audio_files = []
    cumulative = 0.0

    for idx, (scene_i, scene_audios, scene_dur) in enumerate(audio_segments):
        # Find the matching video index
        vid_entry = next((v for v in trimmed_videos if v[0] == scene_i), None)
        if vid_entry is None:
            continue
        _, _, actual_vid_dur, label = vid_entry

        if not scene_audios:
            # Silence for this scene
            silence = tmp / f"silence_{idx:02d}.mp3"
            run([
                FFMPEG, "-y",
                "-f", "lavfi", "-i", f"anullsrc=r=44100:cl=stereo",
                "-t", str(actual_vid_dur),
                "-c:a", "libmp3lame", "-b:a", "128k",
                str(silence)
            ])
            scene_audio_files.append(silence)
            continue

        if len(scene_audios) == 1:
            # Single audio — pad to video duration
            padded = tmp / f"audio_{idx:02d}.mp3"
            run([
                FFMPEG, "-y", "-i", str(scene_audios[0]),
                "-af", f"apad=pad_dur={actual_vid_dur},atrim=0:{actual_vid_dur}",
                "-c:a", "libmp3lame", "-b:a", "128k",
                str(padded)
            ])
            scene_audio_files.append(padded)
        else:
            # Multiple audio files — concatenate them, then pad to video duration
            cat_list = tmp / f"audiocat_{idx:02d}.txt"
            with open(cat_list, "w") as f:
                for ap in scene_audios:
                    f.write(f"file '{ap}'\n")
            catted = tmp / f"audio_cat_{idx:02d}.mp3"
            run([
                FFMPEG, "-y", "-f", "concat", "-safe", "0",
                "-i", str(cat_list),
                "-c:a", "libmp3lame", "-b:a", "128k",
                str(catted)
            ])
            padded = tmp / f"audio_{idx:02d}.mp3"
            run([
                FFMPEG, "-y", "-i", str(catted),
                "-af", f"apad=pad_dur={actual_vid_dur},atrim=0:{actual_vid_dur}",
                "-c:a", "libmp3lame", "-b:a", "128k",
                str(padded)
            ])
            scene_audio_files.append(padded)

    # --- 6d: Concatenate all scene audio into one track
    log(f"\n  🔗 Concatenating audio ({len(scene_audio_files)} segments)...")
    audio_concat_list = tmp / "audio_concat.txt"
    with open(audio_concat_list, "w") as f:
        for ap in scene_audio_files:
            f.write(f"file '{ap}'\n")
    combined_audio = tmp / "combined_audio.mp3"
    run([
        FFMPEG, "-y", "-f", "concat", "-safe", "0",
        "-i", str(audio_concat_list),
        "-c:a", "libmp3lame", "-b:a", "128k",
        str(combined_audio)
    ])

    # --- 6e: Gentle ambient bed (synthesised, CC0)
    log("  🎵 Generating ambient bed...")
    ambient = tmp / "ambient.mp3"
    run([
        FFMPEG, "-y",
        "-f", "lavfi",
        "-i", (
            "aevalsrc="
            "'0.12*sin(2*PI*110*t)*exp(-0.015*t)"
            "+0.09*sin(2*PI*220*t)*exp(-0.010*t)"
            "+0.06*sin(2*PI*330*t)*exp(-0.007*t)"
            "+0.04*sin(2*PI*165*t)"
            "+0.03*sin(2*PI*440*t*(1+0.002*sin(2*PI*0.3*t)))"
            f":s=44100:c=stereo'"
        ),
        "-t", str(total_dur + 5),
        "-af", f"afade=t=in:st=0:d=4,afade=t=out:st={total_dur}:d=5",
        "-c:a", "libmp3lame", "-b:a", "128k",
        str(ambient)
    ])

    # --- 6f: Mix voiceover + ambient
    log("  🎚️  Mixing voiceover + ambient (ambient @ 10%)...")
    mixed_audio = tmp / "mixed.aac"
    run([
        FFMPEG, "-y",
        "-i", str(combined_audio),
        "-i", str(ambient),
        "-filter_complex",
        (f"[0:a]apad=pad_dur={total_dur},atrim=0:{total_dur}[vo];"
         f"[1:a]volume=0.10,apad=pad_dur={total_dur},atrim=0:{total_dur}[bg];"
         "[vo][bg]amix=inputs=2:duration=first:dropout_transition=2[outa]"),
        "-map", "[outa]",
        "-c:a", "aac", "-b:a", "192k", "-ar", "44100",
        str(mixed_audio)
    ])

    # --- 6g: Mux video + audio
    log(f"\n  🎬 Muxing final video → {output.name}...")
    preset = "fast" if draft else "slow"
    run([
        FFMPEG, "-y",
        "-i", str(combined_vid),
        "-i", str(mixed_audio),
        "-c:v", "libx264", "-preset", preset, "-crf", "20",
        "-c:a", "aac", "-b:a", "192k",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        "-shortest",
        str(output)
    ])

    size_mb = output.stat().st_size / (1024 * 1024)
    final_dur = get_duration(output)
    log(f"\n  ✅ OUTPUT: {output}")
    log(f"     Size    : {size_mb:.1f} MB")
    log(f"     Duration: {final_dur:.1f}s (~{final_dur/60:.1f} min)")
    log(f"\n  💡 To swap in Nissan's voiceover (scene-by-scene):")
    log(f"     Drop his recording into: {TAKES_DIR}/vo-scene-05-nissan-REAL.mp3")
    log(f"     Then re-run:  python3 scripts/run-full-pipeline.py --skip-record --skip-audio")

    return output


# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    p = argparse.ArgumentParser()
    p.add_argument("--skip-record", action="store_true")
    p.add_argument("--skip-audio",  action="store_true")
    p.add_argument("--skip-verify", action="store_true")
    p.add_argument("--scenes",      default="all",
                   help="Comma-sep scene numbers to (re)record, e.g. 1,2,6")
    args = p.parse_args()

    log("\n🎬 SandSync Demo Production Pipeline v2")
    log(f"   Started: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")

    if not args.skip_record:
        step_record(args.scenes)
        step_convert()

    step_fallback()

    if not args.skip_audio:
        step_audio()

    if not args.skip_verify:
        step_verify()

    step_compose(draft=True)

    log("\n🏁 Pipeline complete!")
    log(f"   {time.strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    main()

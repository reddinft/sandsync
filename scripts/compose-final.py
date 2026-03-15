#!/usr/bin/env python3
"""
SandSync Final Demo Video Composer
===================================
Flexible composition pipeline for the SandSync hackathon demo video.

Usage:
  # AI voiceover (default — uses ElevenLabs Papa Bois voice):
  python3 compose-final.py

  # Nissan's own recording:
  python3 compose-final.py --voiceover /path/to/recording.wav

  # Custom output path:
  python3 compose-final.py --output /path/to/output.mp4

  # Skip music:
  python3 compose-final.py --no-music

  # Draft mode (faster encode):
  python3 compose-final.py --draft
"""

import argparse
import os
import subprocess
import sys
import tempfile
import json
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────────
SANDSYNC_DIR = Path(os.path.expanduser("~/projects/sandsync"))
CAPTURES_DIR = SANDSYNC_DIR / "content" / "demo-captures-video"
DEMO_VIDEO_DIR = SANDSYNC_DIR / "demo-video"
SCRIPTS_DIR = SANDSYNC_DIR / "scripts"
FFMPEG = "ffmpeg"
FFPROBE = "ffprobe"

# ── ElevenLabs ─────────────────────────────────────────────────────────────────
ELEVENLABS_VOICE_ID = "6HeS5o1MgiMBuqtUDJaA"   # Papa Bois
ELEVENLABS_MODEL    = "eleven_turbo_v2_5"

VOICEOVER_TEXT = """In the Caribbean, every story is a spirit. It moves through the forest, whispers on the wind, dances in the firelight.

SandSync is where those spirits come alive — an offline-first AI storytelling app built for the PowerSync AI Hackathon.

Choose your spirit. Anansi the trickster weaves clever tales. Papa Bois guards the ancient forest. The Soucouyant burns bright in the night.

Tell us your theme — and the pipeline awakens.

Mastra orchestrates the agents in parallel. Claude Haiku writes the narrative. fal.ai FLUX paints the illustrations. Deepgram gives the story its voice. And Ogma — the cultural guardian — makes sure every word rings true.

Five agents. One story. Delivered in seconds.

But the real magic? SandSync works offline.

Every story you summon lives first in local SQLite — written instantly, zero latency, no server needed. When you come back online, PowerSync syncs your stories across every device, seamlessly.

Stories that survive the storm.

SandSync. Caribbean folklore, reimagined for the offline-first world.

Powered by PowerSync, Mastra, Supabase, and the spirits of the islands."""


# ── Video clip definitions ─────────────────────────────────────────────────────
#
# Each segment is: (source_file, start_sec, duration_sec, label)
# The segments are concat-ed in order. Adjust start/duration to taste.
#
# Best available clips (all REAL app footage, 1920×1080):
#   scenario-1-clip.mp4  65s  — Summon a Story / Anansi selected
#   scenario-2-clip.mp4  58s  — Summon a Story / Papa Bois selected
#   scenario-3-clip.mp4  59s  — Summon a Story / Soucouyant selected
#   take-1 af001b.webm   90s  — Pipeline page (tech stack + visualization)
#   take-2 805f.webm     67s  — Offline sync demo page
#   take-3 b5a9.webm    156s  — Agents debug / story not found state
#
CLIP_SEGMENTS = [
    # (path_relative_to_CAPTURES_DIR, start, duration, label)
    ("scenario-1-new/scenario-1-clip.mp4",                      2,  18, "app-intro"),
    ("scenario-2-new/scenario-2-clip.mp4",                      3,  13, "story-select"),
    ("take-1-pipeline-full/af001b4c43771177a3dc4f7f46add908.webm",  3,  27, "pipeline-viz"),
    ("take-2-offline-sync/805fdbfe77ecba727b7ec082b73567ac.webm",    3,  22, "offline-sync"),
    ("scenario-3-new/scenario-3-clip.mp4",                      3,  12, "closing-shot"),
]
# Total: 18+13+27+22+12 = 92s — target is 90–120s ✓


# ── Helpers ────────────────────────────────────────────────────────────────────

def run(cmd, check=True, capture=False):
    """Run a shell command, print it, and optionally capture output."""
    print(f"  $ {' '.join(str(c) for c in cmd)}")
    result = subprocess.run(
        [str(c) for c in cmd],
        capture_output=capture,
        text=True
    )
    if check and result.returncode != 0:
        print(f"❌ Command failed (exit {result.returncode})")
        if capture:
            print(result.stderr)
        sys.exit(1)
    return result


def get_duration(path: Path) -> float:
    """Return duration in seconds via ffprobe."""
    result = subprocess.run(
        [FFPROBE, "-v", "quiet", "-show_entries", "format=duration",
         "-of", "csv=p=0", str(path)],
        capture_output=True, text=True
    )
    try:
        return float(result.stdout.strip())
    except ValueError:
        # webm without a duration header — decode to measure
        result2 = subprocess.run(
            [FFMPEG, "-i", str(path), "-f", "null", "-"],
            capture_output=True, text=True
        )
        for line in result2.stderr.splitlines():
            if "time=" in line:
                t = line.split("time=")[-1].split()[0]
                h, m, s = t.split(":")
                return float(h)*3600 + float(m)*60 + float(s)
        return 0.0


def fetch_elevenlabs_key() -> str:
    """Read ElevenLabs API key from 1Password."""
    op_token_path = Path(os.path.expanduser("~/.config/openclaw/.op-service-token"))
    if not op_token_path.exists():
        print("❌ 1Password service token not found at ~/.config/openclaw/.op-service-token")
        sys.exit(1)
    env = os.environ.copy()
    env["OP_SERVICE_ACCOUNT_TOKEN"] = op_token_path.read_text().strip()
    result = subprocess.run(
        ["/opt/homebrew/bin/op", "read", "op://OpenClaw/ElevenLabs API Credentials/credential"],
        env=env, capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f"❌ Failed to read ElevenLabs key from 1Password: {result.stderr.strip()}")
        sys.exit(1)
    return result.stdout.strip()


def generate_voiceover(output_path: Path) -> Path:
    """Generate voiceover MP3 via ElevenLabs Papa Bois voice."""
    import urllib.request
    import urllib.error

    api_key = fetch_elevenlabs_key()
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}"
    payload = json.dumps({
        "text": VOICEOVER_TEXT,
        "model_id": ELEVENLABS_MODEL,
        "voice_settings": {
            "stability": 0.55,
            "similarity_boost": 0.80,
            "style": 0.35,
            "use_speaker_boost": True
        }
    }).encode("utf-8")

    print(f"🎙️  Generating voiceover via ElevenLabs (Papa Bois)…")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "xi-api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            audio_data = resp.read()
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"❌ ElevenLabs API error {e.code}: {body}")
        sys.exit(1)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(audio_data)
    print(f"✅ Voiceover saved → {output_path}")
    return output_path


def generate_ambient_music(output_path: Path, duration: float) -> Path:
    """
    Generate a simple CC0 ambient background track using ffmpeg's audio synthesis.
    Creates a soft A-minor chord (110/220/330 Hz) with gentle tremolo.
    """
    print(f"🎵  Generating ambient background music ({duration:.0f}s)…")
    cmd = [
        FFMPEG, "-y",
        "-f", "lavfi",
        "-i", (
            f"aevalsrc="
            f"'0.18*sin(2*PI*110*t)*exp(-0.02*t)"
            f"+0.15*sin(2*PI*220*t)*exp(-0.015*t)"
            f"+0.10*sin(2*PI*330*t)*exp(-0.01*t)"
            f"+0.06*sin(2*PI*165*t)"
            f"+0.04*sin(2*PI*440*t*(1+0.002*sin(2*PI*0.3*t)))"
            f":s=44100:c=stereo'"
        ),
        "-t", str(duration + 5),
        "-af", "afade=t=in:st=0:d=3,afade=t=out:st=" + str(duration) + ":d=5",
        "-ar", "44100", "-ac", "2",
        str(output_path)
    ]
    run(cmd)
    print(f"✅ Ambient music → {output_path}")
    return output_path


def trim_clip(src: Path, start: float, duration: float, dst: Path) -> Path:
    """Trim a video clip (fast seek + encode to H.264 for seamless concat)."""
    cmd = [
        FFMPEG, "-y",
        "-ss", str(start),
        "-i", str(src),
        "-t", str(duration),
        "-c:v", "libx264", "-preset", "fast", "-crf", "22",
        "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,"
               "pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1",
        "-r", "30",
        "-an",        # strip audio from captures (we add voiceover separately)
        "-pix_fmt", "yuv420p",
        str(dst)
    ]
    run(cmd)
    return dst


def concat_clips(clip_paths: list, dst: Path) -> Path:
    """Concatenate clips via ffmpeg concat filter (re-encodes for smooth cuts)."""
    inputs = []
    filter_parts = []
    for i, p in enumerate(clip_paths):
        inputs += ["-i", str(p)]
        filter_parts.append(f"[{i}:v]")

    n = len(clip_paths)
    filter_str = "".join(filter_parts) + f"concat=n={n}:v=1:a=0[outv]"

    cmd = [
        FFMPEG, "-y",
        *inputs,
        "-filter_complex", filter_str,
        "-map", "[outv]",
        "-c:v", "libx264", "-preset", "fast", "-crf", "22",
        "-pix_fmt", "yuv420p",
        str(dst)
    ]
    run(cmd)
    return dst


def mix_audio(voiceover: Path, music: Path, total_duration: float,
              music_volume: float, dst: Path) -> Path:
    """Mix voiceover + ambient music into a single audio track."""
    print(f"🎚️  Mixing audio (voiceover + music @ {music_volume:.0%} volume)…")
    cmd = [
        FFMPEG, "-y",
        "-i", str(voiceover),
        "-i", str(music),
        "-filter_complex",
        (
            f"[0:a]apad=pad_dur={total_duration},atrim=0:{total_duration}[vo];"
            f"[1:a]volume={music_volume},apad=pad_dur={total_duration},"
            f"atrim=0:{total_duration}[bg];"
            f"[vo][bg]amix=inputs=2:duration=first:dropout_transition=2[outa]"
        ),
        "-map", "[outa]",
        "-c:a", "aac", "-b:a", "192k", "-ar", "44100",
        str(dst)
    ]
    run(cmd)
    return dst


def compose_final(video: Path, audio: Path, output: Path, draft: bool = False) -> Path:
    """Mux final video + audio into the output file."""
    preset = "fast" if draft else "slow"
    cmd = [
        FFMPEG, "-y",
        "-i", str(video),
        "-i", str(audio),
        "-c:v", "libx264", "-preset", preset, "-crf", "20",
        "-c:a", "aac", "-b:a", "192k",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        "-shortest",
        str(output)
    ]
    run(cmd)
    return output


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="SandSync demo video composer")
    parser.add_argument(
        "--voiceover", type=Path, default=None,
        help="Path to a WAV/MP3 voiceover recording (skips ElevenLabs generation)"
    )
    parser.add_argument(
        "--output", type=Path,
        default=DEMO_VIDEO_DIR / "sandsync-demo-FINAL.mp4",
        help="Output video path (default: demo-video/sandsync-demo-FINAL.mp4)"
    )
    parser.add_argument(
        "--music-volume", type=float, default=0.12,
        help="Background music volume 0.0–1.0 (default: 0.12)"
    )
    parser.add_argument(
        "--no-music", action="store_true",
        help="Omit background music entirely"
    )
    parser.add_argument(
        "--draft", action="store_true",
        help="Faster encode (slightly lower quality)"
    )
    parser.add_argument(
        "--ai-voiceover-only", action="store_true",
        help="Only generate the AI voiceover MP3, then exit"
    )
    args = parser.parse_args()

    DEMO_VIDEO_DIR.mkdir(parents=True, exist_ok=True)
    tmp = Path(tempfile.mkdtemp(prefix="sandsync-compose-"))
    print(f"\n🎬  SandSync Demo Composer")
    print(f"    Temp dir : {tmp}")
    print(f"    Output   : {args.output}\n")

    # ── Step 1: Voiceover ──────────────────────────────────────────────────────
    ai_draft_path = DEMO_VIDEO_DIR / "voiceover-ai-draft.mp3"

    if args.voiceover:
        voiceover_path = args.voiceover.expanduser().resolve()
        if not voiceover_path.exists():
            print(f"❌ Voiceover file not found: {voiceover_path}")
            sys.exit(1)
        print(f"🎙️  Using provided voiceover: {voiceover_path}")
    else:
        # Generate AI voiceover (or reuse existing draft)
        if ai_draft_path.exists():
            print(f"🎙️  Reusing existing AI voiceover: {ai_draft_path}")
            voiceover_path = ai_draft_path
        else:
            voiceover_path = generate_voiceover(ai_draft_path)

    if args.ai_voiceover_only:
        print(f"\n✅ AI voiceover only mode — done.")
        return

    # Measure voiceover duration
    vo_duration = get_duration(voiceover_path)
    print(f"⏱️  Voiceover duration: {vo_duration:.1f}s")

    # ── Step 2: Trim clips ─────────────────────────────────────────────────────
    print(f"\n✂️   Trimming {len(CLIP_SEGMENTS)} clips…")
    trimmed = []
    total_clip_dur = 0.0
    for i, (rel_path, start, duration, label) in enumerate(CLIP_SEGMENTS):
        src = CAPTURES_DIR / rel_path
        if not src.exists():
            print(f"  ⚠️  Missing clip: {src} — skipping")
            continue
        dst = tmp / f"clip_{i:02d}_{label}.mp4"
        print(f"\n  [{i+1}/{len(CLIP_SEGMENTS)}] {label} ({src.name})")
        trim_clip(src, start, duration, dst)
        trimmed.append(dst)
        total_clip_dur += duration

    if not trimmed:
        print("❌ No clips available — aborting")
        sys.exit(1)

    print(f"\n✅ {len(trimmed)} clips trimmed — total {total_clip_dur:.0f}s")

    # ── Step 3: Concatenate clips ──────────────────────────────────────────────
    print(f"\n🔗  Concatenating clips…")
    combined_video = tmp / "combined.mp4"
    concat_clips(trimmed, combined_video)
    actual_video_dur = get_duration(combined_video)
    print(f"✅ Combined video: {actual_video_dur:.1f}s")

    # ── Step 4: Background music ───────────────────────────────────────────────
    if args.no_music:
        # Just use voiceover as audio (padded/trimmed to video length)
        print("\n🔇  Music disabled — using voiceover only")
        audio_path = tmp / "audio_only.aac"
        cmd = [
            FFMPEG, "-y",
            "-i", str(voiceover_path),
            "-af", f"apad=pad_dur={actual_video_dur},atrim=0:{actual_video_dur}",
            "-c:a", "aac", "-b:a", "192k",
            str(audio_path)
        ]
        run(cmd)
    else:
        music_path = tmp / "ambient.wav"
        generate_ambient_music(music_path, actual_video_dur)
        audio_path = tmp / "mixed_audio.aac"
        mix_audio(voiceover_path, music_path, actual_video_dur,
                  args.music_volume, audio_path)

    # ── Step 5: Compose final video ────────────────────────────────────────────
    print(f"\n🎥  Composing final video…")
    compose_final(combined_video, audio_path, args.output, draft=args.draft)

    size_mb = args.output.stat().st_size / (1024 * 1024)
    print(f"\n✅  Output: {args.output}")
    print(f"   Size   : {size_mb:.1f} MB")
    print(f"   Duration: {actual_video_dur:.0f}s (~{actual_video_dur/60:.1f} min)")

    print(f"\n💡  To use Nissan's own voiceover recording:")
    print(f"    python3 {SCRIPTS_DIR}/compose-final.py --voiceover /path/to/recording.wav \\")
    print(f"      --output {DEMO_VIDEO_DIR}/sandsync-demo-FINAL.mp4")


if __name__ == "__main__":
    main()

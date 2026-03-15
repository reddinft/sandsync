#!/usr/bin/env python3
"""
SandSync Asset Verification
============================
Run BEFORE any ffmpeg stitching. Checks every video and audio take for
corruption, blank files, wrong resolution, silence, and codec errors.

Usage:
  python3 verify-assets.py                   # checks all expected assets
  python3 verify-assets.py --dir /path       # custom takes dir
  python3 verify-assets.py --strict          # non-zero exit on any failure
  python3 verify-assets.py --json            # emit JSON manifest to stdout

Exit codes:
  0 = all passed
  1 = one or more failures (use --strict to enforce this in pipelines)
"""

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional

FFPROBE = "ffprobe"
FFMPEG  = "ffmpeg"

SANDSYNC_DIR = Path.home() / "projects" / "sandsync"
DEFAULT_TAKES = SANDSYNC_DIR / "demo-video" / "takes"

# ── Expected assets ─────────────────────────────────────────────────────────────
# Each entry: (filename, kind, min_duration_s, notes)
EXPECTED_ASSETS = [
    # Video takes
    ("scene-01-hook.mp4",           "video", 4.0,  "hook — idle pipeline"),
    ("scene-02-request.mp4",        "video", 8.0,  "user types request"),
    ("scene-03-pipeline-start.mp4", "video", 15.0, "pipeline activates"),
    ("scene-04-agents-working.mp4", "video", 15.0, "agents active"),
    ("scene-05-sync-publish.mp4",   "video", 10.0, "sync & publish"),
    ("scene-06-result.mp4",         "video", 8.0,  "final story result"),
    # Voiceover takes
    ("vo-scene-01-papa-bois.mp3",          "audio", 4.0,  "Papa Bois — Scene 1"),
    ("vo-scene-02-papa-bois.mp3",          "audio", 5.0,  "Papa Bois — Scene 2"),
    ("vo-scene-02-nissan-PLACEHOLDER.mp3", "audio", 2.0,  "Devi placeholder — Scene 2"),
    ("vo-scene-03-anansi.mp3",             "audio", 8.0,  "Anansi — Scene 3"),
    ("vo-scene-04-anansi.mp3",             "audio", 8.0,  "Anansi — Scene 4"),
    ("vo-scene-05-nissan-PLACEHOLDER.mp3", "audio", 2.0,  "Devi placeholder — Scene 5"),
    ("vo-scene-06-papa-bois.mp3",          "audio", 4.0,  "Papa Bois — Scene 6"),
]

VALID_RESOLUTIONS = {(1280, 720), (1920, 1080)}
VALID_SAMPLE_RATES = {44100, 48000}
SILENCE_THRESHOLD_DB = -60.0   # mean_volume below this = suspicious silence
MIN_FILE_SIZE_VIDEO  = 10_240  # 10 KB
MIN_FILE_SIZE_AUDIO  =  5_120  #  5 KB


# ── Data model ──────────────────────────────────────────────────────────────────
@dataclass
class AssetResult:
    filename: str
    kind: str          # "video" or "audio"
    notes: str
    exists: bool       = False
    file_size: int     = 0
    passed: bool       = False
    failures: list     = field(default_factory=list)
    warnings: list     = field(default_factory=list)
    # Probed fields
    codec: str         = ""
    duration: float    = 0.0
    width: int         = 0
    height: int        = 0
    sample_rate: int   = 0
    mean_volume_db: Optional[float] = None

    def summary_line(self) -> str:
        tick = "✅" if self.passed else "❌"
        if not self.exists:
            return f"{tick} {self.filename:<45} MISSING"

        if self.kind == "video":
            res = f"{self.width}x{self.height}" if self.width else "???x???"
            detail = f"{res}  {self.duration:.1f}s  {self.codec}"
        else:
            sr = f"{self.sample_rate}Hz" if self.sample_rate else "???Hz"
            vol = f"  mean_vol:{self.mean_volume_db:.0f}dB" if self.mean_volume_db is not None else ""
            detail = f"{sr}  {self.duration:.1f}s  {self.codec}{vol}"

        status = "OK" if self.passed else "FAILED: " + "; ".join(self.failures)
        warn_str = "  ⚠️ " + "; ".join(self.warnings) if self.warnings else ""
        return f"{tick} {self.filename:<45}  {detail}  {status}{warn_str}"


# ── ffprobe helpers ─────────────────────────────────────────────────────────────
def ffprobe_json(path: Path) -> tuple[dict, str, int]:
    """Run ffprobe and return (parsed_json, raw_stderr, returncode)."""
    cmd = [
        FFPROBE, "-v", "error",
        "-show_streams", "-show_format",
        "-of", "json",
        str(path)
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    try:
        data = json.loads(r.stdout) if r.stdout.strip() else {}
    except json.JSONDecodeError:
        data = {}
    return data, r.stderr, r.returncode


def check_ffprobe_errors(stderr: str) -> list[str]:
    """Scan stderr for known fatal error patterns."""
    fatal_patterns = [
        "moov atom not found",
        "Invalid data found when processing input",
        "no such file or directory",
        "invalid argument",
        "end of file",
        "corrupt",
        "broken",
        "no streams",
    ]
    found = []
    lower = stderr.lower()
    for pat in fatal_patterns:
        if pat in lower:
            found.append(pat)
    return found


def measure_volume(path: Path) -> Optional[float]:
    """Run ffmpeg volumedetect filter and return mean_volume in dB."""
    cmd = [
        FFMPEG, "-i", str(path),
        "-af", "volumedetect",
        "-f", "null", "-",
        "-hide_banner"
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    # volumedetect outputs to stderr
    combined = r.stdout + r.stderr
    m = re.search(r"mean_volume:\s*([-\d.]+)\s*dB", combined)
    if m:
        return float(m.group(1))
    return None


# ── Checkers ─────────────────────────────────────────────────────────────────────
def check_video(path: Path, min_dur: float, result: AssetResult):
    # Size
    result.file_size = path.stat().st_size
    if result.file_size < MIN_FILE_SIZE_VIDEO:
        result.failures.append(f"File too small ({result.file_size} bytes — likely blank)")
        return

    data, stderr, rc = ffprobe_json(path)

    # ffprobe exit code
    if rc != 0:
        result.failures.append(f"ffprobe exited {rc}")

    # Fatal error patterns
    errs = check_ffprobe_errors(stderr)
    if errs:
        result.failures.append("ffprobe errors: " + ", ".join(errs))

    # Find video stream
    streams = data.get("streams", [])
    vid_streams = [s for s in streams if s.get("codec_type") == "video"]
    if not vid_streams:
        result.failures.append("No video stream found")
        return

    vs = vid_streams[0]
    result.codec  = vs.get("codec_name", "?")
    result.width  = vs.get("width", 0)
    result.height = vs.get("height", 0)

    # Duration
    dur_str = vs.get("duration") or data.get("format", {}).get("duration", "0")
    try:
        result.duration = float(dur_str)
    except (ValueError, TypeError):
        result.duration = 0.0

    if result.duration <= 0:
        result.failures.append(f"Duration {result.duration:.1f}s — blank/corrupt file")
    elif result.duration < min_dur:
        result.failures.append(f"Duration {result.duration:.1f}s < minimum {min_dur:.1f}s")

    # Resolution
    res = (result.width, result.height)
    if res not in VALID_RESOLUTIONS:
        if result.width == 0:
            result.failures.append("Could not determine resolution")
        else:
            result.warnings.append(f"Unexpected resolution {result.width}x{result.height}")

    # Codec sanity
    if result.codec in ("", "?", "none"):
        result.failures.append("Unknown/missing video codec")


def check_audio(path: Path, min_dur: float, result: AssetResult):
    result.file_size = path.stat().st_size
    if result.file_size < MIN_FILE_SIZE_AUDIO:
        result.failures.append(f"File too small ({result.file_size} bytes — likely blank)")
        return

    data, stderr, rc = ffprobe_json(path)

    if rc != 0:
        result.failures.append(f"ffprobe exited {rc}")

    errs = check_ffprobe_errors(stderr)
    if errs:
        result.failures.append("ffprobe errors: " + ", ".join(errs))

    streams = data.get("streams", [])
    aud_streams = [s for s in streams if s.get("codec_type") == "audio"]
    if not aud_streams:
        result.failures.append("No audio stream found")
        return

    as_ = aud_streams[0]
    result.codec = as_.get("codec_name", "?")

    # Duration
    dur_str = as_.get("duration") or data.get("format", {}).get("duration", "0")
    try:
        result.duration = float(dur_str)
    except (ValueError, TypeError):
        result.duration = 0.0

    if result.duration <= 0:
        result.failures.append(f"Duration {result.duration:.1f}s — blank/corrupt")
    elif result.duration < min_dur:
        result.failures.append(f"Duration {result.duration:.1f}s < minimum {min_dur:.1f}s")

    # Sample rate
    try:
        result.sample_rate = int(as_.get("sample_rate", 0))
    except (ValueError, TypeError):
        result.sample_rate = 0

    if result.sample_rate not in VALID_SAMPLE_RATES:
        if result.sample_rate == 0:
            result.warnings.append("Could not determine sample rate")
        else:
            result.warnings.append(f"Unexpected sample rate {result.sample_rate}Hz")

    # Volume check
    try:
        vol = measure_volume(path)
        result.mean_volume_db = vol
        if vol is not None and vol < SILENCE_THRESHOLD_DB:
            result.failures.append(f"Audio appears silent (mean_volume {vol:.1f}dB < {SILENCE_THRESHOLD_DB}dB)")
    except Exception as e:
        result.warnings.append(f"Volume check failed: {e}")


# ── Main verifier ─────────────────────────────────────────────────────────────────
def verify_all(takes_dir: Path, extra_files: list[str] = None) -> list[AssetResult]:
    """Verify all expected assets + any extra files specified."""
    assets = list(EXPECTED_ASSETS)
    if extra_files:
        for f in extra_files:
            p = Path(f)
            kind = "audio" if p.suffix in (".mp3", ".wav", ".aac", ".m4a") else "video"
            assets.append((p.name, kind, 2.0, "extra"))

    results = []
    for filename, kind, min_dur, notes in assets:
        path = takes_dir / filename
        result = AssetResult(filename=filename, kind=kind, notes=notes)
        result.exists = path.exists()

        if not result.exists:
            result.failures.append("File not found")
        else:
            if kind == "video":
                check_video(path, min_dur, result)
            else:
                check_audio(path, min_dur, result)

        result.passed = result.exists and len(result.failures) == 0
        results.append(result)

    return results


def print_manifest(results: list[AssetResult], takes_dir: Path):
    total   = len(results)
    passed  = sum(1 for r in results if r.passed)
    failed  = total - passed

    print()
    print("ASSET VERIFICATION MANIFEST")
    print("=" * 70)
    print(f"📁 Takes dir: {takes_dir}")
    print()

    # Group by kind
    videos = [r for r in results if r.kind == "video"]
    audios = [r for r in results if r.kind == "audio"]

    if videos:
        print("── VIDEO TAKES ──")
        for r in videos:
            print("  " + r.summary_line())

    if audios:
        print()
        print("── AUDIO TAKES ──")
        for r in audios:
            print("  " + r.summary_line())

    print()
    print("=" * 70)
    if failed == 0:
        print(f"SUMMARY: {passed}/{total} passed ✅  |  0 failed  |  Ready to stitch 🎬")
    else:
        print(f"SUMMARY: {passed}/{total} passed  |  {failed} FAILED ❌  |  Fix before stitching")
        print()
        print("❌ FAILURES:")
        for r in results:
            if not r.passed:
                for f in r.failures:
                    print(f"   {r.filename}: {f}")
    print()
    return failed


def main():
    parser = argparse.ArgumentParser(description="Verify SandSync video/audio assets before stitching")
    parser.add_argument("--dir",    type=Path, default=DEFAULT_TAKES, help="Takes directory")
    parser.add_argument("--strict", action="store_true", help="Exit 1 on any failure")
    parser.add_argument("--json",   action="store_true", help="Also write JSON manifest")
    parser.add_argument("files",    nargs="*", help="Extra files to verify")
    args = parser.parse_args()

    takes_dir = args.dir.expanduser().resolve()
    print(f"🔍 Verifying assets in: {takes_dir}")

    results = verify_all(takes_dir, args.files or None)
    failures = print_manifest(results, takes_dir)

    if args.json:
        manifest_path = takes_dir / "verification-manifest.json"
        with open(manifest_path, "w") as fp:
            json.dump(
                [{"file": r.filename, "kind": r.kind, "passed": r.passed,
                  "duration": r.duration, "codec": r.codec,
                  "width": r.width, "height": r.height,
                  "sample_rate": r.sample_rate, "mean_volume_db": r.mean_volume_db,
                  "failures": r.failures, "warnings": r.warnings}
                 for r in results],
                fp, indent=2
            )
        print(f"📄 JSON manifest → {manifest_path}")

    if args.strict and failures > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
compose.py — Composite video + voiceover per scene, then stitch into demo-final.mp4.
"""

import os
import sys
import json
import subprocess
import argparse

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCENES_DIR = os.path.join(BASE_DIR, "scenes")
VO_DIR = os.path.join(BASE_DIR, "vo")
META_PATH = os.path.join(BASE_DIR, "scenes_meta.json")

FFMPEG = "/opt/homebrew/bin/ffmpeg"
FFPROBE = "/opt/homebrew/bin/ffprobe"

FINAL_OUTPUT = os.path.join(BASE_DIR, "demo-final.mp4")


def run(cmd: list, check=True, capture=False):
    print(f"  $ {' '.join(str(c) for c in cmd)}")
    result = subprocess.run(cmd, capture_output=capture, text=True)
    if check and result.returncode != 0:
        print(f"  STDERR: {result.stderr}")
        raise RuntimeError(f"Command failed: {cmd[0]}")
    return result


def get_duration(path: str) -> float:
    result = subprocess.run(
        [FFPROBE, "-v", "quiet", "-show_entries", "format=duration",
         "-of", "csv=p=0", path],
        capture_output=True, text=True
    )
    try:
        return float(result.stdout.strip())
    except ValueError:
        return 0.0


def webm_to_mp4(webm_path: str, mp4_path: str):
    if os.path.exists(mp4_path):
        print(f"  ⏭  {mp4_path} already exists, skipping conversion")
        return
    run([FFMPEG, "-y", "-i", webm_path, "-c:v", "libx264", "-crf", "18",
         "-preset", "fast", "-an", mp4_path])


def compose_simple_scene(scene_num: int, raw_webm: str, vo_mp3: str, out_mp4: str):
    """Composite a single video + single VO track."""
    if not os.path.exists(raw_webm):
        print(f"  ❌ Missing raw: {raw_webm}")
        return False
    if not os.path.exists(vo_mp3):
        print(f"  ❌ Missing VO: {vo_mp3}")
        return False

    raw_mp4 = raw_webm.replace(".webm", ".mp4")
    webm_to_mp4(raw_webm, raw_mp4)

    run([FFMPEG, "-y",
         "-i", raw_mp4,
         "-i", vo_mp3,
         "-filter_complex",
         "[1:a]adelay=800|800[delayed_a];"
         "[0:v]tpad=stop_mode=clone:stop_duration=2[padded_v]",
         "-map", "[padded_v]",
         "-map", "[delayed_a]",
         "-c:v", "libx264", "-crf", "18", "-preset", "fast",
         "-c:a", "aac", "-b:a", "192k",
         "-shortest",
         out_mp4])
    return True


def compose_scene04(raw_webm: str, out_mp4: str):
    """Composite Scene 4 with 5 timed VO segments."""
    if not os.path.exists(raw_webm):
        print(f"  ❌ Missing raw: {raw_webm}")
        return False

    raw_mp4 = raw_webm.replace(".webm", ".mp4")
    webm_to_mp4(raw_webm, raw_mp4)

    vo_files = {
        "00s": os.path.join(VO_DIR, "scene_04_vo_00s.mp3"),
        "15s": os.path.join(VO_DIR, "scene_04_vo_15s.mp3"),
        "35s": os.path.join(VO_DIR, "scene_04_vo_35s.mp3"),
        "55s": os.path.join(VO_DIR, "scene_04_vo_55s.mp3"),
        "80s": os.path.join(VO_DIR, "scene_04_vo_80s.mp3"),
    }
    delays_ms = {"00s": 800, "15s": 15800, "35s": 35800, "55s": 55800, "80s": 80800}

    for key, path in vo_files.items():
        if not os.path.exists(path):
            print(f"  ❌ Missing VO: {path}")
            return False

    filter_parts = []
    for i, (key, delay_ms) in enumerate(delays_ms.items()):
        filter_parts.append(f"[{i+1}:a]adelay={delay_ms}|{delay_ms}[a{i}]")
    filter_parts.append("[a0][a1][a2][a3][a4]amix=inputs=5:duration=longest[mixed_a]")
    filter_str = ";".join(filter_parts)

    cmd = [FFMPEG, "-y",
           "-i", raw_mp4,
           "-i", vo_files["00s"],
           "-i", vo_files["15s"],
           "-i", vo_files["35s"],
           "-i", vo_files["55s"],
           "-i", vo_files["80s"],
           "-filter_complex", filter_str,
           "-map", "0:v",
           "-map", "[mixed_a]",
           "-c:v", "libx264", "-crf", "18", "-preset", "fast",
           "-c:a", "aac", "-b:a", "192k",
           out_mp4]
    run(cmd)
    return True


def stitch_scenes(composed_files: list, output: str):
    """Concat all composed scenes into final video."""
    concat_list = os.path.join(BASE_DIR, "concat_list.txt")
    with open(concat_list, "w") as f:
        for path in composed_files:
            f.write(f"file '{path}'\n")

    # Calculate total duration for fade-out timing
    total_dur = sum(get_duration(p) for p in composed_files)
    fade_out_start = max(0, total_dur - 0.5)

    # Use concat without complex filter for simplicity (fade is tricky with concat demuxer)
    run([FFMPEG, "-y",
         "-f", "concat",
         "-safe", "0",
         "-i", concat_list,
         "-vf", f"fade=t=in:st=0:d=0.5",
         "-c:v", "libx264", "-crf", "18", "-preset", "fast",
         "-c:a", "aac", "-b:a", "192k",
         output])


def main(scenes_to_compose: list = None):
    print("🎬 SandSync Scene Compositor")
    print("=" * 50)

    composed_files = []
    all_scenes = [1, 2, 3, 4, 5, 6]
    target_scenes = scenes_to_compose if scenes_to_compose else all_scenes

    scene_configs = {
        1: {
            "raw_webm": os.path.join(SCENES_DIR, "scene_01_raw.webm"),
            "vo_mp3": os.path.join(VO_DIR, "scene_01_vo.mp3"),
            "out": os.path.join(BASE_DIR, "scenes", "scene_01_composed.mp4"),
        },
        2: {
            "raw_webm": os.path.join(SCENES_DIR, "scene_02_raw.webm"),
            "vo_mp3": os.path.join(VO_DIR, "scene_02_vo.mp3"),
            "out": os.path.join(BASE_DIR, "scenes", "scene_02_composed.mp4"),
        },
        3: {
            "raw_webm": os.path.join(SCENES_DIR, "scene_03_raw.webm"),
            "vo_mp3": os.path.join(VO_DIR, "scene_03_vo.mp3"),
            "out": os.path.join(BASE_DIR, "scenes", "scene_03_composed.mp4"),
        },
        4: {
            "raw_webm": os.path.join(SCENES_DIR, "scene_04_raw.webm"),
            "out": os.path.join(BASE_DIR, "scenes", "scene_04_composed.mp4"),
        },
        5: {
            "raw_webm": os.path.join(SCENES_DIR, "scene_05_raw.webm"),
            "vo_mp3": os.path.join(VO_DIR, "scene_05_vo.mp3"),
            "out": os.path.join(BASE_DIR, "scenes", "scene_05_composed.mp4"),
        },
        6: {
            "raw_webm": os.path.join(SCENES_DIR, "scene_06_raw.webm"),
            "vo_mp3": os.path.join(VO_DIR, "scene_06_vo.mp3"),
            "out": os.path.join(BASE_DIR, "scenes", "scene_06_composed.mp4"),
        },
    }

    for scene_num in all_scenes:
        cfg = scene_configs[scene_num]
        composed = cfg["out"]

        if scene_num not in target_scenes:
            if os.path.exists(composed):
                print(f"\n⏭  Scene {scene_num}: skipping (not in target), using existing {composed}")
                composed_files.append(composed)
            else:
                print(f"\n⚠️  Scene {scene_num}: skipping but no composed file exists yet")
            continue

        print(f"\n🎞  Compositing Scene {scene_num}...")

        if scene_num == 4:
            ok = compose_scene04(cfg["raw_webm"], composed)
        else:
            ok = compose_simple_scene(scene_num, cfg["raw_webm"], cfg["vo_mp3"], composed)

        if ok and os.path.exists(composed):
            dur = get_duration(composed)
            print(f"  ✅ {composed} ({dur:.1f}s)")
            composed_files.append(composed)
        else:
            print(f"  ❌ Scene {scene_num} composition failed")

    # Only stitch if all 6 scenes are composed
    all_composed = all(os.path.exists(scene_configs[n]["out"]) for n in all_scenes)

    if all_composed:
        all_files = [scene_configs[n]["out"] for n in all_scenes]
        print(f"\n🔗 Stitching {len(all_files)} scenes into {FINAL_OUTPUT}...")
        stitch_scenes(all_files, FINAL_OUTPUT)
        dur = get_duration(FINAL_OUTPUT)
        print(f"\n🎉 demo-final.mp4 created! Duration: {dur:.1f}s ({dur/60:.1f}min)")
    else:
        missing = [n for n in all_scenes if not os.path.exists(scene_configs[n]["out"])]
        print(f"\n⚠️  Cannot stitch — missing composed scenes: {missing}")
        print("   Run compose.py once all scenes are recorded.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--scene", type=int, nargs="+", help="Compose only specific scene(s)")
    args = parser.parse_args()
    main(scenes_to_compose=args.scene)

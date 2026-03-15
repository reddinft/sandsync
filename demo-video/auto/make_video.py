#!/usr/bin/env python3
"""
make_video.py — Master orchestrator for the SandSync demo video pipeline.

Usage:
    python make_video.py                    # Run full pipeline (VO → record → compose)
    python make_video.py --scene 3          # Re-run only scene 3 (record + compose)
    python make_video.py --vo-only          # Just regenerate VO audio
    python make_video.py --compose          # Just recompose (assumes scenes recorded)
    python make_video.py --record-only      # Just record scenes
    python make_video.py --scene 4 5 --vo-only  # Re-generate VO for scenes 4 & 5
"""

import os
import sys
import argparse
import subprocess
import asyncio

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PYTHON = sys.executable


def run_script(script: str, extra_args: list = None):
    cmd = [PYTHON, os.path.join(BASE_DIR, script)]
    if extra_args:
        cmd.extend(extra_args)
    print(f"\n{'='*60}")
    print(f"▶  Running: {' '.join(cmd)}")
    print(f"{'='*60}")
    result = subprocess.run(cmd, cwd=BASE_DIR)
    if result.returncode != 0:
        print(f"❌ {script} failed with exit code {result.returncode}")
        sys.exit(1)
    return result


def run_record(scenes: list = None):
    args = []
    if scenes:
        args = ["--scene"] + [str(s) for s in scenes]
    run_script("record_scenes.py", args)


def run_compose(scenes: list = None):
    args = []
    if scenes:
        args = ["--scene"] + [str(s) for s in scenes]
    run_script("compose.py", args)


def main():
    parser = argparse.ArgumentParser(
        description="SandSync Demo Video Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument("--scene", type=int, nargs="+", metavar="N",
                        help="Only process specific scene number(s)")
    parser.add_argument("--vo-only", action="store_true",
                        help="Only generate VO audio, skip recording and compositing")
    parser.add_argument("--record-only", action="store_true",
                        help="Only record scenes, skip VO generation and compositing")
    parser.add_argument("--compose", action="store_true",
                        help="Only compose/stitch (assumes scenes already recorded)")
    parser.add_argument("--skip-vo", action="store_true",
                        help="Skip VO generation step")
    parser.add_argument("--skip-record", action="store_true",
                        help="Skip scene recording step")

    args = parser.parse_args()

    print("🎬 SandSync Demo Video Pipeline")
    print("=" * 60)

    if args.vo_only:
        print("Mode: VO generation only")
        run_script("generate_vo.py")
        return

    if args.record_only:
        print("Mode: Recording only")
        run_record(args.scene)
        return

    if args.compose:
        print("Mode: Compositing only")
        run_compose(args.scene)
        return

    # Full pipeline
    if args.scene:
        print(f"Mode: Full pipeline for scene(s) {args.scene}")
    else:
        print("Mode: Full pipeline (all scenes)")

    # Step 1: VO generation
    if not args.skip_vo:
        print("\n📣 Step 1/3: Generating voiceover audio...")
        run_script("generate_vo.py")
    else:
        print("\n⏭  Step 1/3: Skipping VO generation")

    # Step 2: Scene recording
    if not args.skip_record:
        print("\n📹 Step 2/3: Recording browser scenes...")
        run_record(args.scene)
    else:
        print("\n⏭  Step 2/3: Skipping scene recording")

    # Step 3: Compose + stitch
    print("\n🎞  Step 3/3: Compositing and stitching...")
    run_compose(args.scene)

    print("\n" + "=" * 60)
    print("✅ Pipeline complete!")
    final = os.path.join(BASE_DIR, "demo-final.mp4")
    if os.path.exists(final):
        size_mb = os.path.getsize(final) / 1024 / 1024
        print(f"📦 Output: {final} ({size_mb:.1f} MB)")
    else:
        print("⚠️  demo-final.mp4 not found — check logs above for errors")


if __name__ == "__main__":
    main()

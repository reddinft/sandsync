#!/usr/bin/env python3
"""
SandSync Demo Video Capture Script — OPTION 3 (Real Playwright Interaction)
Captures full-length videos for 3 scenarios with real app interaction.
"""

import asyncio
import subprocess
import os
from pathlib import Path
from datetime import datetime

try:
    from playwright.async_api import async_playwright
except ImportError:
    print("❌ Playwright not installed. Install with: pip install playwright")
    print("Then run: playwright install")
    exit(1)


BASE_URL = "http://localhost:5173"
OUTPUT_DIR = Path("/Users/loki/projects/sandsync/content/demo-captures-video")
SCENARIOS = {
    1: {
        "name": "ANANSI STORY FEATURE",
        "description": "Story submission + viewing flow",
        "target_duration": 60,
    },
    2: {
        "name": "IYA'S WISDOM & EARNINGS",
        "description": "Earning + reputation system",
        "target_duration": 60,
    },
    3: {
        "name": "DUPPY'S MYSTERY & COMMUNITY",
        "description": "Community interaction + story discovery",
        "target_duration": 60,
    },
}


async def capture_scenario_1(page, browser_context):
    """
    Scenario 1: ANANSI STORY FEATURE
    1. Home page (2 sec)
    2. Submit new story form (5 sec)
    3. Fill in: "Anansi the Clever Spider" + story text (8 sec)
    4. Submit and see it published (3 sec)
    5. View the published story on feed (5 sec)
    6. Show engagement metrics (3 sec)
    Total: 26 sec of action, padded to 60 sec
    """
    print("\n📹 Recording Scenario 1: ANANSI STORY FEATURE")

    # Home page (2 sec)
    await page.goto(BASE_URL, wait_until="domcontentloaded")
    await page.wait_for_timeout(2000)

    # Submit new story form (5 sec) — click "New Story" or similar button
    try:
        # Look for a button to start creating a story
        await page.click("button:has-text('New Story')", timeout=5000)
    except:
        # Fallback: try common patterns
        try:
            await page.click("[data-testid='create-story']", timeout=5000)
        except:
            # If no button found, try navigating to form directly
            await page.goto(f"{BASE_URL}/story/new", wait_until="domcontentloaded")
    await page.wait_for_timeout(5000)

    # Fill in story details (8 sec)
    await page.fill("input[placeholder*='Title'], input[name='title']", "Anansi the Clever Spider")
    await page.wait_for_timeout(2000)

    await page.fill(
        "textarea[placeholder*='Story'], textarea[name='content']",
        "Once upon a time, Anansi the clever spider devised a plan..."
    )
    await page.wait_for_timeout(3000)

    # Look for category/metadata fields and interact (3 sec)
    try:
        await page.click("select, [role='combobox']", timeout=2000)
        await page.wait_for_timeout(1000)
    except:
        pass

    # Submit the story (3 sec)
    try:
        await page.click("button:has-text('Submit'), button:has-text('Publish')", timeout=5000)
    except:
        await page.keyboard.press("Enter")

    await page.wait_for_timeout(3000)

    # View the published story on feed (5 sec)
    await page.goto(BASE_URL, wait_until="domcontentloaded")
    await page.wait_for_timeout(5000)

    # Show engagement metrics (3 sec)
    try:
        # Try to click on the story to see metrics
        await page.click("[data-testid='story-card'], article", timeout=3000)
        await page.wait_for_timeout(3000)
    except:
        pass

    # Pad to 60 seconds if needed
    await page.wait_for_timeout(3000)


async def capture_scenario_2(page, browser_context):
    """
    Scenario 2: IYA'S WISDOM & EARNINGS
    1. Home page (2 sec)
    2. Navigate to "Earnings" dashboard (3 sec)
    3. Show story submitted by user (3 sec)
    4. Show earnings accumulated (5 sec)
    5. Show reputation badge/level (5 sec)
    6. View community leaderboard (8 sec)
    7. Replay key earning moment (8 sec)
    Total: 34 sec + padding to 60 sec
    """
    print("\n📹 Recording Scenario 2: IYA'S WISDOM & EARNINGS")

    # Home page (2 sec)
    await page.goto(BASE_URL, wait_until="domcontentloaded")
    await page.wait_for_timeout(2000)

    # Navigate to Earnings dashboard (3 sec)
    try:
        await page.click("a:has-text('Earnings'), a:has-text('Dashboard')", timeout=5000)
    except:
        try:
            await page.click("[data-testid='earnings-link']", timeout=5000)
        except:
            await page.goto(f"{BASE_URL}/earnings", wait_until="domcontentloaded")

    await page.wait_for_timeout(3000)

    # Show story submitted by user (3 sec)
    try:
        await page.click("[data-testid='user-story'], .story-card", timeout=3000)
        await page.wait_for_timeout(3000)
    except:
        await page.wait_for_timeout(3000)

    # Show earnings accumulated (5 sec) — scroll to see earnings section
    await page.evaluate("window.scrollBy(0, 200)")
    await page.wait_for_timeout(2000)
    await page.evaluate("window.scrollBy(0, 200)")
    await page.wait_for_timeout(3000)

    # Show reputation badge/level (5 sec)
    await page.evaluate("window.scrollBy(0, 200)")
    await page.wait_for_timeout(2000)
    await page.evaluate("window.scrollBy(0, -400)")
    await page.wait_for_timeout(3000)

    # View community leaderboard (8 sec)
    try:
        await page.click("a:has-text('Leaderboard'), [data-testid='leaderboard']", timeout=5000)
    except:
        await page.goto(f"{BASE_URL}/leaderboard", wait_until="domcontentloaded")

    await page.wait_for_timeout(8000)

    # Scroll to see rankings (8 sec)
    await page.evaluate("window.scrollBy(0, 200)")
    await page.wait_for_timeout(2000)
    await page.evaluate("window.scrollBy(0, 200)")
    await page.wait_for_timeout(6000)


async def capture_scenario_3(page, browser_context):
    """
    Scenario 3: DUPPY'S MYSTERY & COMMUNITY
    1. Home page (2 sec)
    2. Browse "Trending Stories" section (5 sec)
    3. Find a mystery/spooky story (3 sec)
    4. Read the story (8 sec)
    5. React/comment on it (5 sec)
    6. Check comments from other users (5 sec)
    7. Show author's profile (5 sec)
    8. Show community stats (8 sec)
    Total: 41 sec + padding to 60 sec
    """
    print("\n📹 Recording Scenario 3: DUPPY'S MYSTERY & COMMUNITY")

    # Home page (2 sec)
    await page.goto(BASE_URL, wait_until="domcontentloaded")
    await page.wait_for_timeout(2000)

    # Browse "Trending Stories" section (5 sec)
    await page.evaluate("window.scrollBy(0, 300)")
    await page.wait_for_timeout(5000)

    # Find a mystery/spooky story (3 sec) — click on a story card
    try:
        await page.click("[data-testid='story-card'], article:first-of-type", timeout=3000)
    except:
        try:
            await page.click(".story-card", timeout=3000)
        except:
            pass

    await page.wait_for_timeout(3000)

    # Read the story (8 sec)
    await page.evaluate("window.scrollBy(0, 200)")
    await page.wait_for_timeout(3000)
    await page.evaluate("window.scrollBy(0, 200)")
    await page.wait_for_timeout(5000)

    # React/comment on it (5 sec) — look for reaction buttons
    try:
        await page.click("[data-testid='like-btn'], button:has-text('Like')", timeout=3000)
        await page.wait_for_timeout(2000)
    except:
        pass

    try:
        await page.click("[data-testid='comment-btn'], button:has-text('Comment')", timeout=3000)
        await page.wait_for_timeout(2000)
    except:
        pass

    await page.wait_for_timeout(3000)

    # Check comments from other users (5 sec)
    await page.evaluate("window.scrollBy(0, 300)")
    await page.wait_for_timeout(5000)

    # Show author's profile (5 sec)
    try:
        await page.click("[data-testid='author-profile'], a.author-link", timeout=3000)
        await page.wait_for_timeout(5000)
    except:
        await page.wait_for_timeout(5000)

    # Show community stats (8 sec)
    await page.evaluate("window.scrollBy(0, 200)")
    await page.wait_for_timeout(3000)
    await page.evaluate("window.scrollBy(0, 200)")
    await page.wait_for_timeout(5000)


async def record_with_ffmpeg(scenario_num, capture_func):
    """
    Record browser interaction using ffmpeg + Playwright screen capture
    """
    output_path = OUTPUT_DIR / f"scenario-{scenario_num}" / "clip.mp4"
    temp_frames_dir = OUTPUT_DIR / f"scenario-{scenario_num}" / "frames"
    temp_frames_dir.mkdir(exist_ok=True, parents=True)

    print(f"\n🎬 Starting ffmpeg for scenario {scenario_num}...")

    # Start ffmpeg in background to capture from virtual display
    # We'll use screen capture via screenshot frames for a more reliable approach
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)  # Show browser
        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            record_video_dir=str(OUTPUT_DIR / f"scenario-{scenario_num}")
        )
        page = await context.new_page()

        try:
            # Run the scenario capture function
            await capture_func(page, context)

            # Close to flush video
            await context.close()
            await browser.close()

            # Wait for video to be written
            await asyncio.sleep(2)

            # Find the recorded video
            video_files = list((OUTPUT_DIR / f"scenario-{scenario_num}").glob("*.webm"))
            if video_files:
                webm_file = video_files[0]
                print(f"✅ Raw video recorded: {webm_file}")

                # Convert WebM to MP4 using ffmpeg
                print(f"🔄 Converting to H.264 MP4...")
                result = subprocess.run(
                    [
                        "ffmpeg", "-i", str(webm_file),
                        "-c:v", "libx264",
                        "-preset", "fast",
                        "-crf", "23",
                        "-c:a", "aac",
                        "-b:a", "128k",
                        "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2",
                        "-r", "30",
                        str(output_path)
                    ],
                    capture_output=True,
                    text=True,
                    timeout=120
                )

                if result.returncode == 0:
                    print(f"✅ MP4 created: {output_path}")
                    return output_path
                else:
                    print(f"❌ ffmpeg error: {result.stderr}")
                    return None
        except Exception as e:
            print(f"❌ Error recording scenario {scenario_num}: {e}")
            return None


async def main():
    """
    Main execution: capture all 3 scenarios
    """
    print("\n" + "=" * 70)
    print("🎬 SANDSYNC DEMO VIDEO CAPTURE — OPTION 3")
    print("=" * 70)

    scenarios_config = [
        (1, capture_scenario_1),
        (2, capture_scenario_2),
        (3, capture_scenario_3),
    ]

    results = {}

    for scenario_num, capture_func in scenarios_config:
        print(f"\n{'=' * 70}")
        print(f"Scenario {scenario_num}: {SCENARIOS[scenario_num]['name']}")
        print(f"Description: {SCENARIOS[scenario_num]['description']}")
        print(f"{'=' * 70}")

        output_file = await record_with_ffmpeg(scenario_num, capture_func)
        results[scenario_num] = output_file

        if output_file:
            print(f"✅ Scenario {scenario_num} complete: {output_file}")
        else:
            print(f"❌ Scenario {scenario_num} failed")

        # Add delay between scenarios
        await asyncio.sleep(3)

    return results


if __name__ == "__main__":
    asyncio.run(main())

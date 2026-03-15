#!/usr/bin/env python3
"""
record_scenes.py — Record all SandSync demo scenes using Playwright.
Each scene: headed Chrome → browser automation → webm recording → rename to scene_XX_raw.webm
"""

import asyncio
import os
import sys
import glob
import json
import argparse
import time
import shutil

from playwright.async_api import async_playwright, Page, BrowserContext

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCENES_DIR = os.path.join(BASE_DIR, "scenes")
META_PATH = os.path.join(BASE_DIR, "scenes_meta.json")

FRONTEND_URL = "https://web-eta-black-15.vercel.app"
VIEWPORT = {"width": 1440, "height": 900}

os.makedirs(SCENES_DIR, exist_ok=True)


def load_meta():
    if os.path.exists(META_PATH):
        with open(META_PATH) as f:
            return json.load(f)
    return {}


def save_meta(meta):
    with open(META_PATH, "w") as f:
        json.dump(meta, f, indent=2)


async def new_context(browser, scene_num: int):
    scene_dir = os.path.join(SCENES_DIR, f"scene_{scene_num:02d}")
    os.makedirs(scene_dir, exist_ok=True)
    ctx = await browser.new_context(
        record_video_dir=scene_dir,
        record_video_size=VIEWPORT,
        viewport=VIEWPORT,
        color_scheme="dark",
    )
    return ctx


async def finalize_scene(ctx: BrowserContext, scene_num: int) -> str:
    """Close context (finalises webm) and rename to scene_XX_raw.webm"""
    await ctx.close()
    scene_dir = os.path.join(SCENES_DIR, f"scene_{scene_num:02d}")
    webms = glob.glob(os.path.join(scene_dir, "*.webm"))
    if not webms:
        print(f"   ⚠️  No webm found in {scene_dir}")
        return None
    src = sorted(webms)[-1]
    dest = os.path.join(BASE_DIR, "scenes", f"scene_{scene_num:02d}_raw.webm")
    shutil.move(src, dest)
    print(f"   📹 Saved: {dest}")
    return dest


async def smooth_scroll(page: Page, delta: int, steps: int = 20, delay: float = 0.05):
    """Scroll smoothly in delta increments."""
    step = delta // steps
    for _ in range(steps):
        await page.mouse.wheel(0, step)
        await asyncio.sleep(delay)


# ─────────────────────────────────────────────
# SCENE 1 — Hook (~20s)
# ─────────────────────────────────────────────
async def scene_01(browser):
    print("\n🎬 Scene 1 — Hook")
    ctx = await new_context(browser, 1)
    page = await ctx.new_page()

    await page.goto(FRONTEND_URL, wait_until="load", timeout=45000)
    await asyncio.sleep(4)

    # Scroll slowly down ~300px
    await smooth_scroll(page, 300, steps=30, delay=0.08)
    await asyncio.sleep(2)

    # Scroll back up
    await smooth_scroll(page, -300, steps=30, delay=0.08)
    await asyncio.sleep(3)

    return await finalize_scene(ctx, 1)


# ─────────────────────────────────────────────
# SCENE 2 — Showcase (~25s)
# ─────────────────────────────────────────────
async def scene_02(browser):
    print("\n🎬 Scene 2 — Showcase")
    ctx = await new_context(browser, 2)
    page = await ctx.new_page()

    await page.goto(f"{FRONTEND_URL}/showcase", wait_until="load", timeout=30000)
    await asyncio.sleep(3)

    # Wait for story cards to load
    try:
        await page.wait_for_selector("[data-testid='story-card'], .story-card, article, .card", timeout=10000)
    except Exception:
        print("   ⚠️  Could not find story cards, continuing anyway")

    await asyncio.sleep(2)

    # Hover over first card for 2s
    try:
        # Try various card selectors
        card = (
            await page.query_selector("[data-testid='story-card']") or
            await page.query_selector(".story-card") or
            await page.query_selector("article") or
            await page.query_selector(".card")
        )
        if card:
            await card.hover()
            await asyncio.sleep(2)
    except Exception as e:
        print(f"   ⚠️  Hover failed: {e}")

    # Click the first "Read" link
    try:
        read_link = (
            await page.query_selector("a:has-text('Read')") or
            await page.query_selector("a:has-text('View')") or
            await page.query_selector("a[href*='/stories/']")
        )
        if read_link:
            await read_link.click()
            await asyncio.sleep(4)
        else:
            print("   ⚠️  No Read link found")
    except Exception as e:
        print(f"   ⚠️  Click Read failed: {e}")

    await asyncio.sleep(3)
    return await finalize_scene(ctx, 2)


# ─────────────────────────────────────────────
# SCENE 3 — Story Reader + PowerSync Offline (~40s)
# ─────────────────────────────────────────────
async def scene_03(browser):
    print("\n🎬 Scene 3 — Story Reader + Offline")
    ctx = await new_context(browser, 3)
    page = await ctx.new_page()

    # Navigate to showcase then click read on first story
    await page.goto(f"{FRONTEND_URL}/showcase", wait_until="load", timeout=30000)
    await asyncio.sleep(2)

    try:
        read_link = (
            await page.query_selector("a:has-text('Read')") or
            await page.query_selector("a[href*='/stories/']")
        )
        if read_link:
            await read_link.click()
            await page.wait_for_load_state("networkidle", timeout=15000)
        else:
            # Fall back: navigate directly to stories list
            await page.goto(f"{FRONTEND_URL}/stories", wait_until="load", timeout=15000)
    except Exception as e:
        print(f"   ⚠️  Navigation to story: {e}")

    await asyncio.sleep(3)

    # Scroll slowly to show image + audio player
    await smooth_scroll(page, 400, steps=40, delay=0.1)
    await asyncio.sleep(2)

    # Go offline via CDP
    print("   📴 Going offline...")
    await ctx.set_offline(True)
    await asyncio.sleep(1)
    try:
        await page.reload(wait_until="domcontentloaded", timeout=10000)
    except Exception as e:
        print(f"   ⚠️  Offline reload (expected error): {type(e).__name__}")
    await asyncio.sleep(4)  # Show story still loads offline (from PWA/cache)

    print("   📶 Back online...")
    await ctx.set_offline(False)
    await asyncio.sleep(2)

    return await finalize_scene(ctx, 3)


# ─────────────────────────────────────────────
# SCENE 4 — Live Pipeline Generation (~95s)
# ─────────────────────────────────────────────
async def scene_04(browser, meta: dict):
    print("\n🎬 Scene 4 — Live Pipeline Generation")
    ctx = await new_context(browser, 4)
    page = await ctx.new_page()

    # Capture story ID from POST /api/pipeline or /api/stories
    story_id = None
    new_story_url = None

    async def handle_response(response):
        nonlocal story_id, new_story_url
        try:
            if response.status == 200 or response.status == 201:
                url = response.url
                if "/api/pipeline" in url or "/api/stories" in url or "pipeline" in url:
                    try:
                        body = await response.json()
                        if isinstance(body, dict):
                            sid = (body.get("id") or body.get("storyId") or
                                   body.get("story_id") or
                                   (body.get("story") or {}).get("id"))
                            if sid:
                                story_id = sid
                                print(f"   🆔 Story ID captured: {story_id}")
                    except Exception:
                        pass
        except Exception:
            pass

    page.on("response", handle_response)

    await page.goto(f"{FRONTEND_URL}/pipeline-demo", wait_until="load", timeout=30000)
    await asyncio.sleep(3)

    # Type story prompt
    PROMPT = ("A fisherman on the coast of Trinidad makes a deal with Mama Dlo, the river spirit, "
              "to find his missing daughter. She warns him: the price is always higher than you think.")

    try:
        textarea = (
            await page.query_selector("textarea") or
            await page.query_selector("[placeholder*='prompt']") or
            await page.query_selector("[placeholder*='story']") or
            await page.query_selector("input[type='text']")
        )
        if textarea:
            await textarea.click()
            await textarea.fill("")
            await asyncio.sleep(0.3)
            # Type slowly for visual effect
            await textarea.type(PROMPT, delay=18)
            await asyncio.sleep(1)
        else:
            print("   ⚠️  No textarea found")
    except Exception as e:
        print(f"   ⚠️  Textarea fill failed: {e}")

    # Check "Quick demo" checkbox
    try:
        checkbox = (
            await page.query_selector("input[type='checkbox']") or
            await page.query_selector("[role='checkbox']")
        )
        if checkbox:
            checked = await checkbox.get_attribute("checked")
            aria_checked = await checkbox.get_attribute("aria-checked")
            is_checked = checked is not None or aria_checked == "true"
            if not is_checked:
                await checkbox.click()
                await asyncio.sleep(0.5)
                print("   ✅ Checked 'Quick demo'")
            else:
                print("   ✅ 'Quick demo' already checked")
    except Exception as e:
        print(f"   ⚠️  Checkbox: {e}")

    # Click Run Pipeline button
    try:
        run_btn = (
            await page.query_selector("button:has-text('Run Pipeline')") or
            await page.query_selector("button:has-text('Run')") or
            await page.query_selector("button:has-text('Generate')") or
            await page.query_selector("button[type='submit']")
        )
        if run_btn:
            await run_btn.click()
            print("   🚀 Pipeline started!")
        else:
            print("   ⚠️  No run button found")
    except Exception as e:
        print(f"   ⚠️  Run button click failed: {e}")

    pipeline_start = time.time()

    # Poll for completion (up to 120s)
    print("   ⏳ Polling for pipeline completion...")
    COMPLETION_SELECTORS = [
        "text=Pipeline Complete",
        "text=Story complete",
        "text=Complete",
        "text=Done",
        "[data-status='complete']",
        "[data-state='done']",
        ".pipeline-complete",
        "a:has-text('Read Story')",
        "a:has-text('View Story')",
        "button:has-text('Read Story')",
    ]

    completed = False
    for _ in range(40):  # 40 * 3s = 120s
        await asyncio.sleep(3)
        for sel in COMPLETION_SELECTORS:
            try:
                el = await page.query_selector(sel)
                if el:
                    elapsed = time.time() - pipeline_start
                    print(f"   ✅ Pipeline complete after {elapsed:.0f}s! (found: {sel})")
                    completed = True
                    break
            except Exception:
                pass
        if completed:
            break

    if not completed:
        print("   ⚠️  Pipeline did not complete in 120s — continuing anyway")

    # Try to capture story URL from read story link
    try:
        read_link = (
            await page.query_selector("a:has-text('Read Story')") or
            await page.query_selector("a:has-text('View Story')") or
            await page.query_selector("a[href*='/stories/']")
        )
        if read_link:
            href = await read_link.get_attribute("href")
            if href:
                new_story_url = href if href.startswith("http") else f"{FRONTEND_URL}{href}"
                print(f"   🔗 New story URL: {new_story_url}")
    except Exception:
        pass

    await asyncio.sleep(3)

    # Save the new story URL for scene 5
    if new_story_url:
        meta["new_story_url"] = new_story_url
    if story_id:
        meta["new_story_id"] = story_id
    save_meta(meta)

    return await finalize_scene(ctx, 4)


# ─────────────────────────────────────────────
# SCENE 5 — Result (~40s)
# ─────────────────────────────────────────────
async def scene_05(browser, meta: dict):
    print("\n🎬 Scene 5 — Result")
    ctx = await new_context(browser, 5)
    page = await ctx.new_page()

    # Navigate to the new story if we have its URL
    new_story_url = meta.get("new_story_url")
    if new_story_url:
        print(f"   🔗 Opening: {new_story_url}")
        await page.goto(new_story_url, wait_until="load", timeout=30000)
    else:
        # Re-run pipeline page and click Read Story
        await page.goto(f"{FRONTEND_URL}/pipeline-demo", wait_until="load", timeout=30000)
        await asyncio.sleep(2)
        try:
            read_link = await page.query_selector("a:has-text('Read Story')")
            if read_link:
                await read_link.click()
                await page.wait_for_load_state("networkidle", timeout=15000)
            else:
                # Fall back to showcase
                await page.goto(f"{FRONTEND_URL}/showcase", wait_until="load", timeout=15000)
        except Exception as e:
            print(f"   ⚠️  Navigation: {e}")

    await asyncio.sleep(4)

    # Scroll to image
    await smooth_scroll(page, 400, steps=40, delay=0.1)
    await asyncio.sleep(2)

    # Click play on audio
    try:
        audio_btn = (
            await page.query_selector("button[aria-label='Play']") or
            await page.query_selector("button:has-text('Play')") or
            await page.query_selector("audio") or
            await page.query_selector("[data-testid='audio-player'] button")
        )
        if audio_btn:
            await audio_btn.click()
            print("   ▶️  Audio playing")
            await asyncio.sleep(6)
        else:
            print("   ⚠️  No audio control found — waiting")
            await asyncio.sleep(6)
    except Exception as e:
        print(f"   ⚠️  Audio play: {e}")
        await asyncio.sleep(6)

    await asyncio.sleep(4)
    return await finalize_scene(ctx, 5)


# ─────────────────────────────────────────────
# SCENE 6 — Sponsor Close (~30s)
# ─────────────────────────────────────────────
async def scene_06(browser):
    print("\n🎬 Scene 6 — Sponsor Close")
    ctx = await new_context(browser, 6)
    page = await ctx.new_page()

    await page.goto(f"{FRONTEND_URL}/pipeline-demo", wait_until="load", timeout=30000)
    await asyncio.sleep(3)

    # Scroll to bottom to show sponsor badge strip
    await page.evaluate("window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'})")
    await asyncio.sleep(3)

    # Navigate back to homepage
    await page.goto(FRONTEND_URL, wait_until="load", timeout=30000)
    await asyncio.sleep(3)

    return await finalize_scene(ctx, 6)


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────
async def record_all(scenes_to_run: list = None):
    meta = load_meta()

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=[
                "--disable-notifications",
                "--disable-infobars",
                "--no-default-browser-check",
                "--hide-crash-restore-bubble",
                "--disable-session-crashed-bubble",
            ]
        )

        try:
            if scenes_to_run is None or 1 in scenes_to_run:
                path = await scene_01(browser)
                if path:
                    meta["scene_01_raw"] = path

            if scenes_to_run is None or 2 in scenes_to_run:
                path = await scene_02(browser)
                if path:
                    meta["scene_02_raw"] = path

            if scenes_to_run is None or 3 in scenes_to_run:
                path = await scene_03(browser)
                if path:
                    meta["scene_03_raw"] = path

            if scenes_to_run is None or 4 in scenes_to_run:
                path = await scene_04(browser, meta)
                if path:
                    meta["scene_04_raw"] = path

            if scenes_to_run is None or 5 in scenes_to_run:
                path = await scene_05(browser, meta)
                if path:
                    meta["scene_05_raw"] = path

            if scenes_to_run is None or 6 in scenes_to_run:
                path = await scene_06(browser)
                if path:
                    meta["scene_06_raw"] = path

        finally:
            await browser.close()

    save_meta(meta)
    print("\n✅ All scenes recorded. scenes_meta.json updated.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--scene", type=int, nargs="+", help="Which scene(s) to record (e.g. --scene 3 4)")
    args = parser.parse_args()

    asyncio.run(record_all(scenes_to_run=args.scene))

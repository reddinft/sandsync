/**
 * SandSync Pipeline Demo Screencasts — New Split-Screen Pipeline Page
 *
 * Records 3 scenario clips:
 *   1. scenario-pipeline-full.mp4   — 120s full pipeline run on /pipeline-demo
 *   2. scenario-offline-sync.mp4    — 60s offline/sync toggle demo
 *   3. scenario-agents-debug.mp4    — 45s agent timeline debug view
 *
 * Run:
 *   cd apps/web
 *   npx playwright test e2e/pipeline-demo-screencasts.spec.ts --project chromium
 *
 * Convert WebM → MP4:
 *   ffmpeg -i <webm> -c:v libx264 -crf 20 -preset slow -r 30 -s 1920x1080 -an output.mp4
 */

import { test, expect, Page, BrowserContext } from "@playwright/test";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = "http://localhost:5173";
const OUTPUT_DIR = path.resolve(
  __dirname,
  "../../../content/demo-captures-video"
);



// ── Helpers ────────────────────────────────────────────────────────────────────

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function smoothScroll(
  page: Page,
  pixels: number,
  durationMs: number = 1500
) {
  try {
    await page.evaluate(
      ({ px, dur }: { px: number; dur: number }) => {
        return new Promise<void>((resolve) => {
          const start = window.scrollY;
          const startTime = performance.now();
          function step(ts: number) {
            const t = Math.min((ts - startTime) / dur, 1);
            const ease =
              t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            window.scrollTo(0, start + px * ease);
            if (t < 1) requestAnimationFrame(step);
            else resolve();
          }
          requestAnimationFrame(step);
        });
      },
      { px: pixels, dur: durationMs }
    );
  } catch {
    // Navigation or context destruction — skip scroll gracefully
    await sleep(durationMs);
  }
}

async function scrollToTop(page: Page, durationMs: number = 1200) {
  const currentY = await page.evaluate(() => window.scrollY);
  if (currentY > 0) await smoothScroll(page, -currentY, durationMs);
}

async function hoverCenter(
  page: Page,
  locator: ReturnType<Page["locator"]>,
  steps = 25
) {
  try {
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    if (box) {
      await page.mouse.move(
        box.x + box.width / 2,
        box.y + box.height / 2,
        { steps }
      );
    }
  } catch {
    /* element may have moved — continue */
  }
}

async function typeRealistic(
  page: Page,
  locator: ReturnType<Page["locator"]>,
  text: string,
  avgDelay = 65
) {
  await locator.click();
  await sleep(300);
  for (const char of text) {
    await locator.pressSequentially(char, { delay: 0 });
    await sleep(avgDelay * (0.7 + Math.random() * 0.6));
  }
}

async function makeContext(browser: any, dir: string): Promise<BrowserContext> {
  fs.mkdirSync(dir, { recursive: true });
  return browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir, size: { width: 1920, height: 1080 } },
    colorScheme: "dark",
    deviceScaleFactor: 1,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAKE 1: Pipeline Demo Full Run (~120 sec)
// /pipeline-demo?demo=1 — split-screen layout, genre pill, type theme,
//                          Run Pipeline → nodes light amber→green → View Story
// ═══════════════════════════════════════════════════════════════════════════════
test("Take 1 — Pipeline Demo Full Run", async ({ browser }) => {
  test.setTimeout(200_000);
  const dir = path.join(OUTPUT_DIR, "take-1-pipeline-full");
  const ctx = await makeContext(browser, dir);
  const page = await ctx.newPage();

  try {
    // [0:00–0:03] Navigate to pipeline-demo — show clean split-screen layout
    await page.goto(`${BASE_URL}/pipeline-demo?demo=1`);
    await expect(
      page.getByText("SandSync Pipeline")
    ).toBeVisible({ timeout: 10000 });
    // Pause to let the page render fully
    await sleep(3000);

    // [0:03–0:07] Slowly pan mouse over the right panel (pipeline nodes)
    // — shows the layout before any action
    const rightPanel = page.locator(".lg\\:col-span-3").first();
    try {
      const box = await rightPanel.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width * 0.5, box.y + 60, { steps: 40 });
        await sleep(1000);
        await page.mouse.move(box.x + box.width * 0.5, box.y + 200, { steps: 40 });
        await sleep(1000);
      }
    } catch {}

    // [0:07–0:10] Select Anansi genre pill (already pre-selected in demo form)
    const anansiPill = page
      .getByRole("button", { name: /Anansi trickster/ })
      .first();
    await hoverCenter(page, anansiPill);
    await sleep(800);
    await anansiPill.click();
    await sleep(1500);

    // [0:10–0:22] Type theme slowly — realistic keystrokes
    const textarea = page.locator("textarea").first();
    await hoverCenter(page, textarea);
    await sleep(500);
    await typeRealistic(
      page,
      textarea,
      "A spider who tricks the sky god to bring stories to the world",
      70
    );
    await sleep(2000);

    // [0:22–0:24] Hover over Run Pipeline button
    const runBtn = page.getByRole("button", { name: /Run Pipeline/ });
    await hoverCenter(page, runBtn);
    await sleep(1200);

    // [0:24–0:25] Click Run Pipeline
    await runBtn.click();

    // [0:25–0:27] User Input node lights up → complete
    await sleep(2000);

    // [0:27–0:55] Watch pipeline nodes light up one by one
    // (demo=1 mode uses standalone simulation, ~18-19s total)
    // We record ~30s here to capture all transitions
    await sleep(30000);

    // [0:55–0:58] Scroll down to show the progress footer / status message
    await smoothScroll(page, 200, 1200);
    await sleep(1500);
    await scrollToTop(page, 1000);
    await sleep(1500);

    // [0:58–1:02] Wait for complete state + View Story button
    // The standalone sim completes at ~18.8s so by now it should be done
    const viewStoryBtn = page.getByRole("link", { name: /View Story/ });
    try {
      await viewStoryBtn.waitFor({ state: "visible", timeout: 5000 });
      await hoverCenter(page, viewStoryBtn);
      await sleep(1500);

      // [1:02–1:05] Click View Story (demo sim uses fake id so page will be blank)
      await viewStoryBtn.click();
      await sleep(3000);
    } catch {
      // Not available (demo sim id isn't real) — just show the complete state
      await sleep(5000);
    }

    // [1:05–1:20] Navigate to real home and scroll the feed
    await page.goto(BASE_URL);
    await sleep(3000);
    await smoothScroll(page, 600, 3000);
    await sleep(4000);
    await smoothScroll(page, 400, 2500);
    await sleep(4000);

    // Hold on home page for remaining time
    await sleep(5000);
  } finally {
    await page.close();
    await ctx.close();
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// TAKE 2: Offline + Sync Demo (~60 sec)
// App home → go offline → browse cached stories → come back online → sync
// ═══════════════════════════════════════════════════════════════════════════════
test("Take 2 — Offline + Sync Demo", async ({ browser }) => {
  test.setTimeout(120_000);
  const dir = path.join(OUTPUT_DIR, "take-2-offline-sync");
  const ctx = await makeContext(browser, dir);
  const page = await ctx.newPage();

  try {
    // [0:00–0:04] Load home page — let PowerSync connect + show stories
    await page.goto(BASE_URL);
    await sleep(4000);

    // [0:04–0:08] Scroll down feed — show existing stories loading
    await smoothScroll(page, 400, 2000);
    await sleep(2500);

    // [0:08–0:10] Pan mouse to header to show sync pill / connection status
    await scrollToTop(page, 1000);
    await sleep(1500);
    await page.mouse.move(960, 40, { steps: 30 });
    await sleep(1500);

    // [0:10–0:13] GO OFFLINE — PowerSync status pill should change
    await ctx.setOffline(true);
    await sleep(3000);

    // [0:13–0:28] Browse as offline user — scroll feed, open a story
    await smoothScroll(page, 600, 2500);
    await sleep(4000);

    // Try to open first story card
    const storyCard = page.locator("a[href*='/stories/']").first();
    try {
      await storyCard.waitFor({ state: "visible", timeout: 3000 });
      await hoverCenter(page, storyCard);
      await sleep(800);
      await storyCard.click();
      await sleep(5000);
      // Show the story still loads from local PowerSync cache
      await smoothScroll(page, 400, 2000);
      await sleep(3000);
    } catch {
      // No story cards — just scroll the feed
      await smoothScroll(page, 400, 2000);
      await sleep(5000);
      await smoothScroll(page, 300, 2000);
      await sleep(3000);
    }

    // [0:28–0:31] Still offline — hover header to show offline status
    await scrollToTop(page, 1000);
    await page.mouse.move(960, 40, { steps: 20 });
    await sleep(2000);

    // [0:31–0:35] COME BACK ONLINE — watch sync pill go green
    await ctx.setOffline(false);
    await sleep(2000);

    // Now safe to navigate
    await page.goto(BASE_URL);
    await sleep(2000);

    // [0:40–0:48] Watch sync resume — scroll to see new content
    await page.mouse.move(960, 40, { steps: 20 });
    await sleep(2000);
    await smoothScroll(page, 500, 2500);
    await sleep(3500);

    // [0:48–0:55] Scroll to show any new stories that synced
    await smoothScroll(page, 400, 2000);
    await sleep(4000);

    // [0:55–0:60] Final scroll up
    await scrollToTop(page, 1500);
    await sleep(3000);
  } finally {
    await page.close();
    await ctx.close();
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// TAKE 3: Agent Debug View (~45 sec)
// Navigate to /agents-demo — static rich timeline page, no auth required
// Shows Papa Bois → Anansi → Ogma review (REJECT → revise → APPROVE at 8.7)
// ═══════════════════════════════════════════════════════════════════════════════
test("Take 3 — Agent Debug View", async ({ browser }) => {
  test.setTimeout(90_000);
  const dir = path.join(OUTPUT_DIR, "take-3-agents-debug");
  const ctx = await makeContext(browser, dir);
  const page = await ctx.newPage();

  try {
    // [0:00–0:04] Navigate to agents-demo — show rich timeline
    await page.goto(`${BASE_URL}/agents-demo`);
    // Wait for JS to hydrate and HMR to settle before interacting
    await page.waitForLoadState("domcontentloaded");
    await sleep(2000);
    await expect(page.getByText("Anansi and the Silk Cotton")).toBeVisible({ timeout: 10000 });
    await sleep(3000);

    // [0:04–0:07] Pan mouse over stats bar
    await page.mouse.move(960, 300, { steps: 30 });
    await sleep(1500);
    await page.mouse.move(960, 380, { steps: 20 });
    await sleep(1500);

    // [0:07–0:12] Scroll down to Ogma Quality Gate callout — highlight
    await smoothScroll(page, 280, 1800);
    await sleep(3000);

    // [0:12–0:16] Hover over quality gate box
    const qualityGate = page.getByText("Ogma Quality Gate").first();
    await hoverCenter(page, qualityGate);
    await sleep(2500);

    // [0:16–0:20] Continue scrolling to event timeline
    await smoothScroll(page, 250, 1500);
    await sleep(2000);

    // [0:20–0:26] Hover over first 3 event cards (Papa Bois, Anansi, Ogma start)
    try {
      const cards = await page.locator("[class*='rounded-xl border']").all();
      for (const card of cards.slice(0, 3)) {
        try {
          await hoverCenter(page, card);
          await sleep(1000);
        } catch {}
      }
    } catch {}

    // [0:26–0:32] Scroll to Ogma rejection card (ch1, quality 6.2)
    await smoothScroll(page, 300, 2000);
    await sleep(2500);

    // [0:32–0:38] Hover over the rejection card — show 6.2 score + REJECT
    try {
      const rejectCard = page.getByText("REJECTED").first();
      await rejectCard.scrollIntoViewIfNeeded();
      await hoverCenter(page, rejectCard);
      await sleep(3500);
    } catch {
      await smoothScroll(page, 200, 1500);
      await sleep(3000);
    }

    // [0:38–0:43] Scroll a bit more — show the APPROVED card (8.7 score)
    await smoothScroll(page, 250, 1500);
    await sleep(2000);
    try {
      const approveCard = page.getByText("APPROVED").first();
      await approveCard.scrollIntoViewIfNeeded();
      await hoverCenter(page, approveCard);
      await sleep(3000);
    } catch {
      await smoothScroll(page, 200, 1500);
      await sleep(2500);
    }

    // [0:43–0:45] Final scroll up to header and pause
    await scrollToTop(page, 1200);
    await sleep(3000);
  } finally {
    await page.close();
    await ctx.close();
  }
});

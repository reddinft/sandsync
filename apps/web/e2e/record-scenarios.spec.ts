/**
 * SandSync Screencast Recorder — Clean Re-record
 * 
 * Records 3 × 60-second scenarios against the live app at localhost:5173.
 * Uses real API (localhost:3002) for story generation.
 * Silent video only (voiceover + music added in composition).
 * 
 * Run: cd apps/web && npx playwright test e2e/record-scenarios.spec.ts --project chromium
 * Convert: ffmpeg -i <webm> -c:v libx264 -crf 23 -preset slow -r 30 -s 1920x1080 -an <mp4>
 */

import { test, expect, Page, BrowserContext } from "@playwright/test";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = "http://localhost:5173";
const OUTPUT_DIR = path.resolve(__dirname, "../../../content/demo-captures-video");

// 120s timeout per test (60s recording + buffer)
test.setTimeout(180_000);

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function smoothScroll(page: Page, pixels: number, durationMs: number = 1500) {
  await page.evaluate(({ px, dur }) => {
    return new Promise<void>((resolve) => {
      const start = window.scrollY;
      const startTime = performance.now();
      function step(ts: number) {
        const t = Math.min((ts - startTime) / dur, 1);
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        window.scrollTo(0, start + px * ease);
        if (t < 1) requestAnimationFrame(step); else resolve();
      }
      requestAnimationFrame(step);
    });
  }, { px: pixels, dur: durationMs });
}

async function scrollToTop(page: Page, durationMs: number = 1500) {
  const currentY = await page.evaluate(() => window.scrollY);
  if (currentY > 0) await smoothScroll(page, -currentY, durationMs);
}

async function hoverElement(page: Page, locator: ReturnType<Page["locator"]>, steps: number = 25) {
  try {
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps });
    }
  } catch {
    // Element may not exist — continue silently
  }
}

async function typeRealistic(page: Page, locator: ReturnType<Page["locator"]>, text: string, avgDelay: number = 60) {
  await locator.click();
  await sleep(200);
  for (const char of text) {
    await locator.pressSequentially(char, { delay: 0 });
    const jitter = avgDelay * (0.7 + Math.random() * 0.6);
    await sleep(jitter);
  }
}

async function createRecordingContext(browser: any, scenarioDir: string): Promise<BrowserContext> {
  fs.mkdirSync(scenarioDir, { recursive: true });
  return browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: scenarioDir,
      size: { width: 1920, height: 1080 },
    },
    colorScheme: "dark",
    deviceScaleFactor: 1,
  });
}


// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO 1: ANANSI — Story Creation Flow (~60 sec)
// Home → genre selection → theme → submit → pipeline → chapters
// ═══════════════════════════════════════════════════════════════════════════════
test("Scenario 1 — Anansi Story Creation", async ({ browser }) => {
  const scenarioDir = path.join(OUTPUT_DIR, "scenario-1-new");
  const context = await createRecordingContext(browser, scenarioDir);
  const page = await context.newPage();

  try {
    // [0:00–0:04] Beautiful home page
    await page.goto(BASE_URL);
    await expect(page.getByText("Summon a Story")).toBeVisible({ timeout: 10000 });
    await sleep(4000);

    // [0:04–0:08] Browse genre pills
    const genres = ["🕷️", "🌳", "🔥", "👠"];
    for (const emoji of genres) {
      const btn = page.getByRole("button", { name: new RegExp(emoji) }).first();
      try { await hoverElement(page, btn); } catch {}
      await sleep(800);
    }

    // [0:08–0:11] Select Anansi genre
    const anansiBtn = page.getByRole("button", { name: /🕷️.*Anansi/ });
    await hoverElement(page, anansiBtn);
    await sleep(500);
    await anansiBtn.click();
    await sleep(1500);

    // [0:11–0:14] Scroll to textarea
    await smoothScroll(page, 250, 1200);
    await sleep(500);

    // [0:14–0:24] Type theme
    const textarea = page.locator("textarea").first();
    await hoverElement(page, textarea);
    await sleep(300);
    await typeRealistic(page, textarea, "A clever spider outwits the sky god to steal all the stories of the world", 55);
    await sleep(2000);

    // [0:24–0:26] Scroll to submit
    await smoothScroll(page, 150, 800);
    await sleep(500);

    // [0:26–0:29] Click submit
    const submitBtn = page.getByRole("button", { name: /Summon the Story/ });
    await hoverElement(page, submitBtn);
    await sleep(1000);
    await submitBtn.click();

    // [0:29–0:38] Watch summoning animation + navigation
    await sleep(9000);

    // [0:38–0:52] Story page — scroll through content as it appears
    await smoothScroll(page, 400, 2500);
    await sleep(5000);
    await smoothScroll(page, 300, 2000);
    await sleep(4000);

    // [0:52–0:60] More content / chapters
    await smoothScroll(page, 300, 2000);
    await sleep(3000);
    await smoothScroll(page, 200, 1500);
    await sleep(2500);

  } finally {
    await page.close();
    await context.close();
  }
});


// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO 2: IYA — Papa Bois Wisdom Story + Pipeline (~60 sec)
// Home → Papa Bois genre → theme → submit → pipeline → chapters + audio
// ═══════════════════════════════════════════════════════════════════════════════
test("Scenario 2 — Iya Wisdom & Pipeline", async ({ browser }) => {
  const scenarioDir = path.join(OUTPUT_DIR, "scenario-2-new");
  const context = await createRecordingContext(browser, scenarioDir);
  const page = await context.newPage();

  try {
    // [0:00–0:03] Home page
    await page.goto(BASE_URL);
    await expect(page.getByText("Summon a Story")).toBeVisible({ timeout: 10000 });
    await sleep(3000);

    // [0:03–0:06] Select Papa Bois (elder wisdom)
    const papaBoisBtn = page.getByRole("button", { name: /🌳.*Papa Bois/ });
    await hoverElement(page, papaBoisBtn);
    await sleep(600);
    await papaBoisBtn.click();
    await sleep(1500);

    // [0:06–0:09] Scroll to textarea
    await smoothScroll(page, 250, 1000);
    await sleep(500);

    // [0:09–0:18] Type wisdom theme
    const textarea = page.locator("textarea").first();
    await typeRealistic(page, textarea, "An ancient forest guardian shares wisdom with a young girl who wandered too far from the village", 50);
    await sleep(2000);

    // [0:18–0:22] Submit
    await smoothScroll(page, 150, 600);
    const submitBtn = page.getByRole("button", { name: /Summon the Story/ });
    await hoverElement(page, submitBtn);
    await sleep(800);
    await submitBtn.click();
    await sleep(3000);

    // [0:22–0:30] Watch pipeline progress
    await sleep(8000);

    // [0:30–0:38] Scroll through first chapter
    await smoothScroll(page, 500, 3000);
    await sleep(5000);

    // [0:38–0:46] Continue reading — illustrations
    await smoothScroll(page, 400, 2500);
    await sleep(5500);

    // [0:46–0:52] Audio player section
    await smoothScroll(page, 300, 2000);
    await sleep(4000);

    // [0:52–0:60] Agent trace link / footer
    await smoothScroll(page, 200, 1500);
    await sleep(4500);

  } finally {
    await page.close();
    await context.close();
  }
});


// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO 3: DUPPY — Offline Mode & Real-Time Sync (~60 sec)
// Home → Soucouyant genre → theme → submit → offline toggle → sync
// ═══════════════════════════════════════════════════════════════════════════════
test("Scenario 3 — Duppy Offline & Sync", async ({ browser }) => {
  const scenarioDir = path.join(OUTPUT_DIR, "scenario-3-new");
  const context = await createRecordingContext(browser, scenarioDir);
  const page = await context.newPage();

  try {
    // [0:00–0:03] Home page
    await page.goto(BASE_URL);
    await expect(page.getByText("Summon a Story")).toBeVisible({ timeout: 10000 });
    await sleep(3000);

    // [0:03–0:07] Select Soucouyant (mystery/supernatural)
    const soucouyantBtn = page.getByRole("button", { name: /🔥.*Soucouyant/ });
    await hoverElement(page, soucouyantBtn);
    await sleep(600);
    await soucouyantBtn.click();
    await sleep(1500);

    // [0:07–0:10] Scroll to textarea
    await smoothScroll(page, 250, 1000);
    await sleep(500);

    // [0:10–0:18] Type mysterious theme
    const textarea = page.locator("textarea").first();
    await typeRealistic(page, textarea, "The Duppy's midnight dance under the silk cotton tree, where spirits whisper", 50);
    await sleep(2000);

    // [0:18–0:21] Submit
    const submitBtn = page.getByRole("button", { name: /Summon the Story/ });
    await hoverElement(page, submitBtn);
    await sleep(500);
    await submitBtn.click();
    await sleep(3000);

    // [0:21–0:30] Watch generation begin on story page
    await sleep(5000);
    await smoothScroll(page, 300, 2000);
    await sleep(2000);

    // [0:30–0:35] GO OFFLINE
    await sleep(2000);
    await context.setOffline(true);
    await sleep(3000);

    // [0:35–0:42] Browse content while offline (PowerSync local cache)
    await smoothScroll(page, 300, 2000);
    await sleep(5000);

    // [0:42–0:45] Scroll back up to see offline badge
    await scrollToTop(page, 1500);
    await sleep(2000);

    // [0:45–0:50] COME BACK ONLINE — sync resumes
    await context.setOffline(false);
    await sleep(5000);

    // [0:50–0:55] Scroll to show synced content
    await smoothScroll(page, 500, 2500);
    await sleep(2500);

    // [0:55–0:60] Final scroll
    await smoothScroll(page, 300, 2000);
    await sleep(3000);

  } finally {
    await page.close();
    await context.close();
  }
});

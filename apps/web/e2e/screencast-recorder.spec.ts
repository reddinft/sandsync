/**
 * SandSync Screencast Recorder — Final Quality with API Mocking
 * 
 * Records 3 × 60-second scenarios showing real app workflows,
 * with mocked API responses to ensure success and speed.
 * Silent video only (voiceover + music added in composition).
 * 
 * Run: cd apps/web && npx playwright test e2e/screencast-recorder.spec.ts --project chromium
 * Then convert: ffmpeg -i <webm> -c:v libx264 -crf 18 -r 30 -s 1920x1080 -an <mp4>
 */

import { test, expect, Page, BrowserContext } from "@playwright/test";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = "http://localhost:5173";
const API_URL = "http://localhost:3002";
const OUTPUT_DIR = path.resolve(__dirname, "../../content/demo-captures-video");

// Increase test timeout for 60-second recordings
test.setTimeout(120_000);

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Smooth eased scroll */
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

/** Smooth scroll to top */
async function scrollToTop(page: Page, durationMs: number = 1500) {
  const currentY = await page.evaluate(() => window.scrollY);
  if (currentY > 0) await smoothScroll(page, -currentY, durationMs);
}

/** Move mouse cursor smoothly to element center */
async function hoverElement(page: Page, locator: ReturnType<Page["locator"]>, steps: number = 25) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps });
  }
}

/** Type text character-by-character with realistic delay */
async function typeRealistic(page: Page, locator: ReturnType<Page["locator"]>, text: string, avgDelay: number = 65) {
  await locator.click();
  await sleep(200);
  for (const char of text) {
    await locator.pressSequentially(char, { delay: 0 });
    // Variable delay for realism (±30%)
    const jitter = avgDelay * (0.7 + Math.random() * 0.6);
    await sleep(jitter);
  }
}

/** Create a recording context with proper viewport */
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
// MOCK DATA 
// ═══════════════════════════════════════════════════════════════════════════════

const MOCK_STORY_ID_ANANSI = uuidv4();
const MOCK_STORY_ID_IYA = uuidv4();
const MOCK_STORY_ID_DUPPY = uuidv4();

const MOCK_STORIES_DATA = [
  {
    id: MOCK_STORY_ID_ANANSI,
    user_id: "mock-user",
    title: "Anansi and the Whispering Web",
    genre: "anansi",
    status: "complete",
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3500000).toISOString(),
    chapters: [
      {
        id: uuidv4(), story_id: MOCK_STORY_ID_ANANSI, chapter_number: 1,
        title: "The Cunning Weaver",
        content: "Anansi, the clever spider, once found himself entangled in a web of his own making, a predicament that required all his wit to unravel. He planned to outsmart the Sky God, Nyame, to bring stories to humanity.",
        audio_url: `${API_URL}/mock-audio/anansi_ch1.mp3`,
        image_url: `https://picsum.photos/seed/${uuidv4()}/800/450`,
        created_at: new Date(Date.now() - 3500000).toISOString(),
        agent_trace: { papa_bois: { latency_ms: 500 }, anansi: { latency_ms: 1200 }, ogma: { latency_ms: 800 }, devi: { latency_ms: 1500 } }
      },
      {
        id: uuidv4(), story_id: MOCK_STORY_ID_ANANSI, chapter_number: 2,
        title: "Nyame's Impossible Tasks",
        content: "To win the stories, Anansi had to complete three impossible tasks: capture Mmoboro the hornets, Onini the python, and Osebo the leopard. With clever tricks and a humble demeanor, Anansi set out to achieve the impossible.",
        audio_url: `${API_URL}/mock-audio/anansi_ch2.mp3`,
        image_url: `https://picsum.photos/seed/${uuidv4()}/800/450`,
        created_at: new Date(Date.now() - 3400000).toISOString(),
        agent_trace: { papa_bois: { latency_ms: 300 }, anansi: { latency_ms: 1000 }, ogma: { latency_ms: 700 }, devi: { latency_ms: 1300 } }
      }
    ]
  },
  {
    id: MOCK_STORY_ID_IYA,
    user_id: "mock-user",
    title: "Iya's Journey to the Spirit Tree",
    genre: "papa-bois",
    status: "complete",
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 7100000).toISOString(),
    chapters: [
      {
        id: uuidv4(), story_id: MOCK_STORY_ID_IYA, chapter_number: 1,
        title: "The Elder's Calling",
        content: "Iya, the village elder, felt the call of the ancient silk cotton tree deep in her bones. It was a place of power, where ancestors whispered. She embarked on her journey, staff in hand.",
        audio_url: `${API_URL}/mock-audio/iya_ch1.mp3`,
        image_url: `https://picsum.photos/seed/${uuidv4()}/800/450`,
        created_at: new Date(Date.now() - 7100000).toISOString(),
        agent_trace: { papa_bois: { latency_ms: 600 }, anansi: { latency_ms: 1500 }, ogma: { latency_ms: 900 }, devi: { latency_ms: 1800 } }
      },
      {
        id: uuidv4(), story_id: MOCK_STORY_ID_IYA, chapter_number: 2,
        title: "Whispers of the Ancestors",
        content: "Reaching the colossal tree, Iya sat beneath its sprawling branches. The air hummed with forgotten melodies, and images of her lineage danced before her eyes.",
        audio_url: `${API_URL}/mock-audio/iya_ch2.mp3`,
        image_url: `https://picsum.photos/seed/${uuidv4()}/800/450`,
        created_at: new Date(Date.now() - 7000000).toISOString(),
        agent_trace: { papa_bois: { latency_ms: 400 }, anansi: { latency_ms: 1300 }, ogma: { latency_ms: 850 }, devi: { latency_ms: 1600 } }
      }
    ]
  },
  {
    id: MOCK_STORY_ID_DUPPY,
    user_id: "mock-user",
    title: "The Duppy's Midnight Dance",
    genre: "soucouyant",
    status: "complete",
    created_at: new Date(Date.now() - 10800000).toISOString(),
    updated_at: new Date(Date.now() - 10700000).toISOString(),
    chapters: [
      {
        id: uuidv4(), story_id: MOCK_STORY_ID_DUPPY, chapter_number: 1,
        title: "The Haunted Plantation",
        content: "Under the cloak of the new moon, a lone traveler found himself lost near an abandoned plantation. Whispers of duppies, restless spirits, filled the humid air. He clutched his crucifix, his heart pounding a frantic rhythm.",
        audio_url: `${API_URL}/mock-audio/duppy_ch1.mp3`,
        image_url: `https://picsum.photos/seed/${uuidv4()}/800/450`,
        created_at: new Date(Date.now() - 10700000).toISOString(),
        agent_trace: { papa_bois: { latency_ms: 700 }, anansi: { latency_ms: 1600 }, ogma: { latency_ms: 1000 }, devi: { latency_ms: 1900 } }
      },
      {
        id: uuidv4(), story_id: MOCK_STORY_ID_DUPPY, chapter_number: 2,
        title: "The Soucouyant's Lure",
        content: "From the shadows, a beautiful woman emerged, her eyes glowing with an unnatural fire. It was a Soucouyant, luring him with a hypnotic dance. He knew he should flee, but her movements were mesmerizing.",
        audio_url: `${API_URL}/mock-audio/duppy_ch2.mp3`,
        image_url: `https://picsum.photos/seed/${uuidv4()}/800/450`,
        created_at: new Date(Date.now() - 10600000).toISOString(),
        agent_trace: { papa_bois: { latency_ms: 500 }, anansi: { latency_ms: 1400 }, ogma: { latency_ms: 950 }, devi: { latency_ms: 1700 } }
      }
    ]
  }
];

function getMockStory(id: string) {
  return MOCK_STORIES_DATA.find(s => s.id === id);
}

function getMockChapters(storyId: string) {
  return MOCK_STORIES_DATA.find(s => s.id === storyId)?.chapters || [];
}

function getMockAgentEvents(storyId: string) {
  const story = getMockStory(storyId);
  if (!story || !story.chapters || story.chapters.length === 0) return [];

  const events: any[] = [];
  // For each chapter, create mock agent events
  story.chapters.forEach(chapter => {
    if (chapter.agent_trace) {
      Object.entries(chapter.agent_trace).forEach(([agent, payload]) => {
        events.push({
          id: uuidv4(),
          story_id: storyId,
          agent,
          event_type: "completed",
          payload: JSON.stringify(payload),
          created_at: chapter.created_at
        });
      });
    }
  });
  return events;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO 1: ANANSI — Story Creation Flow (60 sec)
// Narrative: "The clever spider submits a tale, and the world sees it."
// Shows: Home page → genre selection → theme → submit → pipeline → chapters
// ═══════════════════════════════════════════════════════════════════════════════
test("Scenario 1 — Anansi Story Creation (Mocked)", async ({ browser }) => {
  const scenarioDir = path.join(OUTPUT_DIR, "scenario-1-new");
  const context = await createRecordingContext(browser, scenarioDir);
  const page = await context.newPage();

  // ── Route Interception for Mocking ──
  await page.route(`${API_URL}/stories`, async route => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ storyId: MOCK_STORY_ID_ANANSI }),
    });
  });

  await page.route(`${API_URL}/stories/${MOCK_STORY_ID_ANANSI}`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(getMockStory(MOCK_STORY_ID_ANANSI)),
    });
  });

  await page.route(`${API_URL}/stories/${MOCK_STORY_ID_ANANSI}/chapters`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(getMockChapters(MOCK_STORY_ID_ANANSI)),
    });
  });

  await page.route(`${API_URL}/stories/${MOCK_STORY_ID_ANANSI}/status`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: "complete", chapters_complete: 2, total_chapters: 2 }),
    });
  });

  // Mock audio files if needed
  await page.route(`${API_URL}/mock-audio/*.mp3`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'audio/mpeg',
      path: path.resolve(__dirname, '../../../../content/hackathon-voices/01_doc_intro.mp3'), // Use a real but generic MP3
    });
  });

  try {
    // ── [0:00–0:04] Establish: Beautiful home page ──
    await page.goto(BASE_URL);
    await expect(page.getByText("Summon a Story")).toBeVisible({ timeout: 10000 });
    await sleep(4000);

    // ── [0:04–0:08] Browse genre pills — hover across them ──
    const genres = ["🕷️", "🌳", "🔥", "👠"];
    for (const emoji of genres) {
      const btn = page.getByRole("button", { name: new RegExp(emoji) }).first();
      await hoverElement(page, btn);
      await sleep(800);
    }

    // ── [0:08–0:11] Select Anansi genre with deliberate click ──
    const anansiBtn = page.getByRole("button", { name: /🕷️.*Anansi/ });
    await hoverElement(page, anansiBtn);
    await sleep(500);
    await anansiBtn.click();
    await sleep(1500);

    // ── [0:11–0:14] Scroll to theme textarea ──
    await smoothScroll(page, 250, 1200);
    await sleep(500);

    // ── [0:14–0:24] Type theme slowly — cinematic ──
    const textarea = page.locator("textarea").first();
    await hoverElement(page, textarea);
    await sleep(300);
    await typeRealistic(page, textarea, "A clever spider outwits the sky god to steal all the stories of the world", 55);
    await sleep(2000);

    // ── [0:24–0:26] Scroll to submit button ──
    await smoothScroll(page, 150, 800);
    await sleep(500);

    // ── [0:26–0:29] Hover + click "Summon the Story" ──
    const submitBtn = page.getByRole("button", { name: /Summon the Story/ });
    await hoverElement(page, submitBtn);
    await sleep(1000);
    await submitBtn.click();

    // ── [0:29–0:38] Watch summoning animation + navigation to story page ──
    await sleep(3000);
    await page.waitForURL(`**/stories/${MOCK_STORY_ID_ANANSI}`);
    await sleep(6000);

    // ── [0:38–0:45] Story reader: pipeline progress bar (should be complete quickly) ──
    await expect(page.getByText("✓ Complete")).toBeVisible({ timeout: 5000 });
    await sleep(4000);

    // ── [0:45–0:52] Scroll to see chapters appearing (with images/audio) ──
    await smoothScroll(page, 400, 2500);
    await sleep(4500);

    // ── [0:52–0:60] Scroll through chapter content + show audio player ──
    await smoothScroll(page, 300, 2000);
    await sleep(3000);
    await expect(page.locator('audio')).toBeVisible();
    await smoothScroll(page, 200, 1500);
    await sleep(2500);

  } finally {
    await page.close();
    await context.close();
  }
});


// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO 2: IYA — Deep Story Reading + Agent Pipeline (60 sec)
// Narrative: "But wisdom doesn't always wear a trickster's mask..."
// Shows: Direct navigation to a complete story → watch full pipeline → read chapters → audio player
// ═══════════════════════════════════════════════════════════════════════════════
test("Scenario 2 — Iya's Wisdom & Pipeline (Mocked)", async ({ browser }) => {
  const scenarioDir = path.join(OUTPUT_DIR, "scenario-2-new");
  const context = await createRecordingContext(browser, scenarioDir);
  const page = await context.newPage();

  // ── Route Interception for Mocking ──
  await page.route(`${API_URL}/stories/${MOCK_STORY_ID_IYA}`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(getMockStory(MOCK_STORY_ID_IYA)),
    });
  });

  await page.route(`${API_URL}/stories/${MOCK_STORY_ID_IYA}/chapters`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(getMockChapters(MOCK_STORY_ID_IYA)),
    });
  });

  await page.route(`${API_URL}/stories/${MOCK_STORY_ID_IYA}/status`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: "complete", chapters_complete: 2, total_chapters: 2 }),
    });
  });

  // Mock audio files if needed
  await page.route(`${API_URL}/mock-audio/*.mp3`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'audio/mpeg',
      path: path.resolve(__dirname, '../../../../content/hackathon-voices/02_pathfinder_intro.mp3'), // Generic MP3
    });
  });

  try {
    // ── [0:00–0:10] Direct navigation to an existing story with complete data ──
    await page.goto(`${BASE_URL}/stories/${MOCK_STORY_ID_IYA}`);
    await expect(page.getByText(getMockStory(MOCK_STORY_ID_IYA)!.title)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("✓ Complete")).toBeVisible();
    await sleep(5000);

    // ── [0:10–0:25] Scroll through the agent pipeline status (should be complete) ──
    await smoothScroll(page, 200, 1500); // Scroll to pipeline
    await sleep(8000);

    // ── [0:25–0:40] Read through chapters with illustrations ──
    await smoothScroll(page, 500, 3000);
    await sleep(7000);

    // ── [0:40–0:55] Continue reading, highlight audio player ──
    await smoothScroll(page, 400, 2500);
    await sleep(7000);
    await expect(page.locator('audio')).toBeVisible();

    // ── [0:55–0:60] Scroll to footer / agent trace link ──
    await smoothScroll(page, 200, 1500);
    await sleep(3500);

  } finally {
    await page.close();
    await context.close();
  }
});


// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO 3: DUPPY — Offline Mode & Real-Time Sync (60 sec)
// Narrative: "And then there are the mysteries..."
// Shows: Direct navigation to a complete story → go offline → content persists → come back online → sync
// ═══════════════════════════════════════════════════════════════════════════════
test("Scenario 3 — Duppy: Offline & Sync (Mocked)", async ({ browser }) => {
  const scenarioDir = path.join(OUTPUT_DIR, "scenario-3-new");
  const context = await createRecordingContext(browser, scenarioDir);
  const page = await context.newPage();

  // ── Route Interception for Mocking ──
  await page.route(`${API_URL}/stories/${MOCK_STORY_ID_DUPPY}`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(getMockStory(MOCK_STORY_ID_DUPPY)),
    });
  });

  await page.route(`${API_URL}/stories/${MOCK_STORY_ID_DUPPY}/chapters`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(getMockChapters(MOCK_STORY_ID_DUPPY)),
    });
  });

  await page.route(`${API_URL}/stories/${MOCK_STORY_ID_DUPPY}/status`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: "complete", chapters_complete: 2, total_chapters: 2 }),
    });
  });

  // Mock audio files if needed
  await page.route(`${API_URL}/mock-audio/*.mp3`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'audio/mpeg',
      path: path.resolve(__dirname, '../../../../content/hackathon-voices/05_doc_outro.mp3'), // Generic MP3
    });
  });

  try {
    // ── [0:00–0:10] Direct navigation to an existing story with complete data ──
    await page.goto(`${BASE_URL}/stories/${MOCK_STORY_ID_DUPPY}`);
    await expect(page.getByText(getMockStory(MOCK_STORY_ID_DUPPY)!.title)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("✓ Complete")).toBeVisible();
    await sleep(5000);

    // ── [0:10–0:20] Scroll to pipeline / content ──
    await smoothScroll(page, 300, 2000);
    await sleep(5000);

    // ── [0:20–0:30] GO OFFLINE — show the transition ──
    await context.setOffline(true);
    await sleep(5000);  // Show offline badge appearing
    await expect(page.getByText(/Offline|offline/i)).toBeVisible();
    await sleep(5000);

    // ── [0:30–0:40] Browse content while offline ──
    await smoothScroll(page, 300, 2000);
    await sleep(5000);
    await smoothScroll(page, 200, 1500);
    await sleep(5000);

    // ── [0:40–0:50] COME BACK ONLINE — sync resumes ──
    await context.setOffline(false);
    await sleep(5000);  // "Live" badge reappears, sync reconnects
    await expect(page.getByText(/Live|live/i)).toBeVisible();
    await sleep(5000);

    // ── [0:50–0:60] Final scroll showing complete story ──
    await smoothScroll(page, 500, 2500);
    await sleep(5000);

  } finally {
    await page.close();
    await context.close();
  }
});

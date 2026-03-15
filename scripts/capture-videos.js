#!/usr/bin/env bun
/*
SandSync Demo Video Capture — Using Playwright + ffmpeg
Captures real browser interactions and encodes to H.264 MP4
*/

import { chromium } from 'playwright';
import { execSync } from 'child_process';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5173';
const OUTPUT_DIR = '/Users/loki/projects/sandsync/content/demo-captures-video';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scenario1(page) {
  console.log('\n📹 Scenario 1: ANANSI STORY FEATURE');

  // Home page (2 sec)
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await delay(2000);

  // Navigate to create story form (5 sec)
  try {
    await page.click('button:has-text("New Story")', { timeout: 3000 });
  } catch {
    try {
      await page.click('[data-testid="create-story"]', { timeout: 3000 });
    } catch {
      // Try direct navigation
      await page.goto(`${BASE_URL}/story/new`, { waitUntil: 'domcontentloaded' });
    }
  }
  await delay(5000);

  // Fill title (4 sec)
  try {
    const titleSelector = 'input[placeholder*="Title"], input[name="title"], input:visible';
    const titleInput = await page.locator(titleSelector).first();
    await titleInput.fill('Anansi the Clever Spider');
  } catch (e) {
    console.log('  ⚠️  Could not fill title:', e.message);
  }
  await delay(4000);

  // Fill content (4 sec)
  try {
    const contentSelector = 'textarea[placeholder*="Story"], textarea[name="content"], textarea:visible';
    const contentInput = await page.locator(contentSelector).first();
    await contentInput.fill('Once upon a time, Anansi the clever spider devised a cunning plan to gather all the wisdom of the world...');
  } catch (e) {
    console.log('  ⚠️  Could not fill content:', e.message);
  }
  await delay(4000);

  // Submit story (5 sec)
  try {
    await page.click('button:has-text("Submit"), button:has-text("Publish"), button:has-text("Post")', { timeout: 3000 });
  } catch {
    try {
      await page.keyboard.press('Enter');
    } catch (e) {
      console.log('  ⚠️  Could not submit:', e.message);
    }
  }
  await delay(5000);

  // View on feed (5 sec)
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await delay(5000);

  // Scroll to show engagement (5 sec)
  await page.evaluate(() => window.scrollBy(0, 300));
  await delay(5000);

  console.log('  ✅ Scenario 1 recorded');
}

async function scenario2(page) {
  console.log('\n📹 Scenario 2: IYA\'S WISDOM & EARNINGS');

  // Home page (2 sec)
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await delay(2000);

  // Navigate to Earnings (3 sec)
  try {
    await page.click('a:has-text("Earnings"), a:has-text("Dashboard"), [data-testid="earnings"]', { timeout: 3000 });
  } catch {
    try {
      await page.goto(`${BASE_URL}/earnings`, { waitUntil: 'domcontentloaded' });
    } catch (e) {
      console.log('  ⚠️  Could not navigate to earnings:', e.message);
    }
  }
  await delay(3000);

  // Show user story (3 sec)
  try {
    await page.click('article, [data-testid="story-card"], .story-item', { timeout: 2000 });
  } catch {
    console.log('  ⚠️  No story found');
  }
  await delay(3000);

  // Scroll to see earnings (5 sec)
  await page.evaluate(() => window.scrollBy(0, 200));
  await delay(2000);
  await page.evaluate(() => window.scrollBy(0, 200));
  await delay(3000);

  // Show reputation (5 sec)
  await page.evaluate(() => window.scrollBy(0, 200));
  await delay(3000);
  await page.evaluate(() => window.scrollBy(0, -400));
  await delay(2000);

  // Leaderboard (8 sec)
  try {
    await page.click('a:has-text("Leaderboard"), [data-testid="leaderboard"]', { timeout: 3000 });
  } catch {
    try {
      await page.goto(`${BASE_URL}/leaderboard`, { waitUntil: 'domcontentloaded' });
    } catch (e) {
      console.log('  ⚠️  Could not navigate to leaderboard:', e.message);
    }
  }
  await delay(8000);

  // Scroll leaderboard (8 sec)
  await page.evaluate(() => window.scrollBy(0, 300));
  await delay(5000);
  await page.evaluate(() => window.scrollBy(0, 200));
  await delay(3000);

  console.log('  ✅ Scenario 2 recorded');
}

async function scenario3(page) {
  console.log('\n📹 Scenario 3: DUPPY\'S MYSTERY & COMMUNITY');

  // Home page (2 sec)
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await delay(2000);

  // Browse trending (5 sec)
  await page.evaluate(() => window.scrollBy(0, 300));
  await delay(5000);

  // Find story (3 sec)
  try {
    await page.click('article:first-of-type, [data-testid="story-card"]:first-of-type, .story-item:first-of-type', { timeout: 2000 });
  } catch {
    console.log('  ⚠️  Could not click story');
  }
  await delay(3000);

  // Read story (8 sec)
  await page.evaluate(() => window.scrollBy(0, 200));
  await delay(3000);
  await page.evaluate(() => window.scrollBy(0, 200));
  await delay(5000);

  // React (5 sec)
  try {
    await page.click('button:has-text("Like"), [data-testid="like-btn"]', { timeout: 2000 });
  } catch {
    console.log('  ⚠️  Could not like');
  }
  await delay(2000);
  try {
    await page.click('button:has-text("Comment"), [data-testid="comment-btn"]', { timeout: 2000 });
  } catch {
    console.log('  ⚠️  Could not comment');
  }
  await delay(3000);

  // View comments (5 sec)
  await page.evaluate(() => window.scrollBy(0, 300));
  await delay(5000);

  // Show author profile (5 sec)
  try {
    await page.click('a.author, [data-testid="author-profile"]', { timeout: 2000 });
  } catch {
    console.log('  ⚠️  Could not open profile');
  }
  await delay(5000);

  // Community stats (8 sec)
  await page.evaluate(() => window.scrollBy(0, 200));
  await delay(3000);
  await page.evaluate(() => window.scrollBy(0, 200));
  await delay(5000);

  console.log('  ✅ Scenario 3 recorded');
}

async function convertWebMtoMP4(scenario, webmPath, mp4Path) {
  console.log(`  🔄 Converting scenario ${scenario} to H.264 MP4...`);
  try {
    execSync(`ffmpeg -i "${webmPath}" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" -r 30 "${mp4Path}"`, {
      stdio: 'pipe',
      timeout: 120000,
    });
    console.log(`  ✅ MP4 created: ${mp4Path}`);
    return true;
  } catch (e) {
    console.error(`  ❌ Conversion failed: ${e.message}`);
    return false;
  }
}

async function captureScenario(scenarioNum, scenarioFunc) {
  const browser = await chromium.launch({ headless: false });
  const scenarioDir = path.join(OUTPUT_DIR, `scenario-${scenarioNum}`);
  
  // Create scenario directory
  await mkdir(scenarioDir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: scenarioDir,
      size: { width: 1920, height: 1080 },
    },
  });

  const page = await context.newPage();

  try {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📹 SCENARIO ${scenarioNum}`);
    console.log(`${'='.repeat(70)}`);

    // Run the scenario
    await scenarioFunc(page);

    // Close to flush video
    await context.close();
    await browser.close();

    // Wait for file to be written
    await delay(2000);

    // Find WebM file
    const videoFiles = [];
    const dir = await Bun.file(scenarioDir);
    for await (const file of dir.dirSync()) {
      if (file.endsWith('.webm')) {
        videoFiles.push(path.join(scenarioDir, file));
      }
    }

    if (videoFiles.length === 0) {
      // Try with a direct check
      const files = execSync(`ls "${scenarioDir}"/*.webm 2>/dev/null || echo ""`, { encoding: 'utf8' }).trim().split('\n').filter(f => f);
      if (files.length > 0) {
        videoFiles.push(files[0]);
      }
    }

    if (videoFiles.length > 0) {
      const webmFile = videoFiles[0];
      const mp4File = path.join(scenarioDir, 'clip.mp4');

      console.log(`  📹 Raw video: ${webmFile}`);
      await convertWebMtoMP4(scenarioNum, webmFile, mp4File);

      return mp4File;
    } else {
      console.error(`  ❌ No video file found in ${scenarioDir}`);
      return null;
    }
  } catch (e) {
    console.error(`  ❌ Error: ${e.message}`);
    try {
      await browser.close();
    } catch {}
    return null;
  }
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🎬 SANDSYNC DEMO VIDEO CAPTURE — OPTION 3');
  console.log('='.repeat(70));

  const scenarios = [
    { num: 1, func: scenario1, name: 'ANANSI STORY FEATURE' },
    { num: 2, func: scenario2, name: 'IYA\'S WISDOM & EARNINGS' },
    { num: 3, func: scenario3, name: 'DUPPY\'S MYSTERY & COMMUNITY' },
  ];

  const results = {};

  for (const scenario of scenarios) {
    const outputPath = await captureScenario(scenario.num, scenario.func);
    results[scenario.num] = outputPath;
    await delay(3000);
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 RESULTS');
  console.log('='.repeat(70));
  for (const [num, path] of Object.entries(results)) {
    if (path) {
      console.log(`  ✅ Scenario ${num}: ${path}`);
    } else {
      console.log(`  ❌ Scenario ${num}: FAILED`);
    }
  }
}

main().catch(console.error);

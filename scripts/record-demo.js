#!/usr/bin/env bun
/*
Simple SandSync Demo Video Recording
Uses ffmpeg to record screen + Playwright for automation
*/

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { execSync } from 'child_process';
import path from 'path';
import { mkdir } from 'fs/promises';

const BASE_URL = 'http://localhost:5173';
const OUTPUT_DIR = '/Users/loki/projects/sandsync/content/demo-captures-video';

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function recordWithFFmpeg(scenario, duration) {
  const outputPath = path.join(OUTPUT_DIR, `scenario-${scenario}`, 'capture.mov');
  
  return new Promise((resolve) => {
    console.log(`  🎥 Starting ffmpeg recording for ${duration}s...`);
    
    const ffmpeg = spawn('ffmpeg', [
      '-f', 'avfoundation',
      '-i', '1:0',  // Screen + audio on macOS
      '-t', `${duration}`,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '128k',
      outputPath,
    ]);

    ffmpeg.on('error', (err) => {
      console.error(`  ❌ ffmpeg error: ${err.message}`);
      resolve(false);
    });

    ffmpeg.on('exit', (code) => {
      if (code === 0) {
        console.log(`  ✅ Recording saved: ${outputPath}`);
        resolve(true);
      } else {
        console.error(`  ❌ ffmpeg exited with code ${code}`);
        resolve(false);
      }
    });
  });
}

async function automateScenario1(page) {
  console.log('  ⏱️  Automating Scenario 1...');
  
  // Home page
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 10000 });
  await delay(2000);

  // Look for form
  await page.evaluate(() => {
    // Try to find and click create button
    const btns = Array.from(document.querySelectorAll('button')).filter(b => 
      b.textContent.toLowerCase().includes('story') || 
      b.textContent.toLowerCase().includes('create') ||
      b.textContent.toLowerCase().includes('new')
    );
    if (btns.length > 0) btns[0].click();
  });
  await delay(3000);

  // Fill form
  await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input, textarea'));
    if (inputs[0]) inputs[0].focus();
    if (inputs[0]) inputs[0].value = 'Anansi the Clever Spider';
    if (inputs[0]) inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
  });
  await delay(3000);

  if (await page.locator('textarea').count() > 0) {
    await page.locator('textarea').first().fill('Once upon a time, Anansi the clever spider devised a cunning plan...');
  }
  await delay(3000);

  // Submit
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter(b =>
      b.textContent.toLowerCase().includes('submit') ||
      b.textContent.toLowerCase().includes('publish') ||
      b.textContent.toLowerCase().includes('post')
    );
    if (btns.length > 0) btns[0].click();
  });
  await delay(3000);

  // Back to home
  await page.goto(BASE_URL);
  await delay(5000);
}

async function automateScenario2(page) {
  console.log('  ⏱️  Automating Scenario 2...');

  await page.goto(BASE_URL);
  await delay(2000);

  // Try to navigate to earnings
  await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a, button')).filter(l =>
      l.textContent.toLowerCase().includes('earnings') ||
      l.textContent.toLowerCase().includes('dashboard')
    );
    if (links.length > 0) links[0].click();
  });
  await delay(5000);

  // Scroll
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => window.scrollBy(0, 200));
    await delay(2000);
  }

  // Click on leaderboard if available
  await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a, button')).filter(l =>
      l.textContent.toLowerCase().includes('leaderboard')
    );
    if (links.length > 0) links[0].click();
  });
  await delay(8000);

  // More scrolling
  await page.evaluate(() => window.scrollBy(0, 300));
  await delay(5000);
}

async function automateScenario3(page) {
  console.log('  ⏱️  Automating Scenario 3...');

  await page.goto(BASE_URL);
  await delay(2000);

  // Scroll to trending
  await page.evaluate(() => window.scrollBy(0, 400));
  await delay(5000);

  // Click story
  await page.evaluate(() => {
    const stories = document.querySelectorAll('article, [data-testid*="story"], .story');
    if (stories.length > 0) stories[0].click();
  });
  await delay(5000);

  // Read story (scroll)
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.scrollBy(0, 200));
    await delay(2000);
  }

  // Like
  await page.evaluate(() => {
    const likes = Array.from(document.querySelectorAll('button')).filter(b =>
      b.textContent.toLowerCase().includes('like') ||
      b.innerHTML.includes('❤️')
    );
    if (likes.length > 0) likes[0].click();
  });
  await delay(2000);

  // Comments
  await page.evaluate(() => window.scrollBy(0, 300));
  await delay(5000);

  // Profile
  await page.evaluate(() => {
    const profiles = Array.from(document.querySelectorAll('a, button')).filter(p =>
      p.textContent.toLowerCase().includes('author') ||
      p.textContent.toLowerCase().includes('profile')
    );
    if (profiles.length > 0) profiles[0].click();
  });
  await delay(5000);
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🎬 SANDSYNC DEMO VIDEO CAPTURE');
  console.log('='.repeat(70));

  await mkdir(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: false });

  const scenarios = [
    { num: 1, func: automateScenario1, duration: 60 },
    { num: 2, func: automateScenario2, duration: 60 },
    { num: 3, func: automateScenario3, duration: 60 },
  ];

  for (const scenario of scenarios) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📹 SCENARIO ${scenario.num}`);
    console.log(`${'='.repeat(70)}`);

    const page = await browser.newPage();

    // Start ffmpeg recording
    const recordingPromise = recordWithFFmpeg(scenario.num, scenario.duration + 5);

    // Small delay for ffmpeg to start
    await delay(2000);

    // Run automation
    try {
      await scenario.func(page);
    } catch (e) {
      console.error(`  ⚠️  Automation error: ${e.message}`);
    }

    // Wait for recording to finish
    await recordingPromise;
    await page.close();

    // Convert MOV to MP4
    console.log(`  🔄 Converting to H.264 MP4...`);
    try {
      const movPath = path.join(OUTPUT_DIR, `scenario-${scenario.num}`, 'capture.mov');
      const mp4Path = path.join(OUTPUT_DIR, `scenario-${scenario.num}`, 'clip.mp4');
      execSync(`ffmpeg -i "${movPath}" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -r 30 "${mp4Path}" -y`, {
        stdio: 'pipe',
        timeout: 120000,
      });
      console.log(`  ✅ MP4 created: ${mp4Path}`);
    } catch (e) {
      console.error(`  ❌ Conversion failed: ${e.message}`);
    }

    await delay(2000);
  }

  await browser.close();

  console.log('\n' + '='.repeat(70));
  console.log('✅ All scenarios recorded');
  console.log('='.repeat(70));
}

main().catch(e => {
  console.error('❌ Fatal error:', e);
  process.exit(1);
});

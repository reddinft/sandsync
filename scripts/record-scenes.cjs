#!/usr/bin/env node
/**
 * SandSync Scene Recorder v3
 * Records 6 scenes using Playwright headless + built-in video recording.
 *
 * Run: node scripts/record-scenes.cjs [1,2,3...]
 */

process.env.PLAYWRIGHT_BROWSERS_PATH = require('os').homedir() + '/Library/Caches/ms-playwright';

const { chromium } = require('/Users/loki/projects/sandsync/node_modules/.bun/playwright@1.58.2/node_modules/playwright');
const path   = require('path');
const fs     = require('fs');

const TAKES_DIR = path.join(__dirname, '..', 'demo-video', 'takes');
const BASE_URL  = 'https://web-eta-black-15.vercel.app';

fs.mkdirSync(TAKES_DIR, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Core recorder ────────────────────────────────────────────────────────────
async function recordScene(sceneName, fn) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`🎬 SCENE: ${sceneName}`);
  console.log(`${'─'.repeat(60)}`);

  // Snapshot existing webms so we can find the new one afterwards
  const before = new Set(fs.readdirSync(TAKES_DIR).filter(f => f.endsWith('.webm')));

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: TAKES_DIR, size: { width: 1280, height: 720 } }
  });

  const page = await context.newPage();
  let success = true;

  try {
    await fn(page);
  } catch (err) {
    console.error(`  ❌ Scene error: ${err.message}`);
    success = false;
  }

  // Grab video reference BEFORE closing page
  const video = page.video();
  await page.close();
  await context.close();
  await browser.close();

  // Let ffmpeg finish writing
  await sleep(1500);

  // Find the newly created webm
  const after = fs.readdirSync(TAKES_DIR).filter(f => f.endsWith('.webm'));
  const newFiles = after.filter(f => !before.has(f));

  const targetWebm = path.join(TAKES_DIR, `${sceneName}.webm`);

  if (newFiles.length > 0) {
    const src = path.join(TAKES_DIR, newFiles[0]);
    if (fs.existsSync(targetWebm)) fs.unlinkSync(targetWebm);
    fs.renameSync(src, targetWebm);
    const sizeMB = (fs.statSync(targetWebm).size / 1048576).toFixed(1);
    console.log(`  ✅ Saved: ${sceneName}.webm (${sizeMB} MB)`);
  } else {
    // Try getting path from video object
    try {
      const vp = await video?.path();
      if (vp && fs.existsSync(vp)) {
        if (fs.existsSync(targetWebm)) fs.unlinkSync(targetWebm);
        fs.renameSync(vp, targetWebm);
        console.log(`  ✅ Saved via video.path(): ${sceneName}.webm`);
      } else {
        console.warn(`  ⚠️ No new webm found for ${sceneName}`);
      }
    } catch (e) {
      console.warn(`  ⚠️ video.path() failed: ${e.message}`);
    }
  }

  return { sceneName, success };
}

// ─── Page helpers ──────────────────────────────────────────────────────────────
async function gotoDemo(page) {
  await page.goto(BASE_URL + '/pipeline-demo', { waitUntil: 'load', timeout: 30000 });
  await sleep(2500);
}

async function typeStory(page, text, delay = 35) {
  const ta = await page.$('textarea');
  if (!ta) throw new Error('textarea not found');
  await ta.click();
  await ta.fill('');
  await ta.type(text, { delay });
}

async function clickTheme(page, partial) {
  const btn = await page.$(`button:has-text("${partial}")`);
  if (btn) { await btn.click(); await sleep(300); }
  else console.log(`  ⚠️ Theme button "${partial}" not found`);
}

async function submitPipeline(page) {
  const btn = await page.$('button[type="submit"]') || await page.$('button:has-text("Run Pipeline")');
  if (!btn) throw new Error('submit button not found');
  await btn.click();
  console.log('  ▶ Pipeline submitted');
}

// ─── Scenes ────────────────────────────────────────────────────────────────────

// SCENE 1 — The Hook (~12s): idle pipeline page
async function scene01(page) {
  await gotoDemo(page);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await sleep(2000);
  await page.evaluate(() => window.scrollBy({ top: 280, behavior: 'smooth' }));
  await sleep(2500);
  await page.evaluate(() => window.scrollBy({ top: -140, behavior: 'smooth' }));
  await sleep(4000);
  console.log('  ✓ done');
}

// SCENE 2 — The Request (~18s): select theme, type prompt, hold
async function scene02(page) {
  await gotoDemo(page);
  await clickTheme(page, 'Anansi');
  await sleep(700);
  const prompt = 'Tell me a story about a fisherman who meets Anansi the Spider God at the edge of the sea at midnight';
  await typeStory(page, prompt, 55);
  await sleep(4000); // hold — visible text + idle submit btn
  console.log('  ✓ done');
}

// SCENE 3 — Pipeline Activates (~35s): submit + watch first nodes light up
async function scene03(page) {
  await gotoDemo(page);
  await clickTheme(page, 'Anansi');
  await sleep(400);
  await typeStory(page, 'A fisherman who meets Anansi the Spider God at the edge of the sea', 20);
  await sleep(600);
  await submitPipeline(page);
  console.log('  ⏳ Watching pipeline activate for 32s...');
  await sleep(32000);
  await page.screenshot({ path: path.join(TAKES_DIR, 'scene-03-debug.png') });
  console.log('  ✓ done');
}

// SCENE 4 — AI Agents Working (~38s): new run, wait for mid-pipeline agents
async function scene04(page) {
  await gotoDemo(page);
  await clickTheme(page, 'Anansi');
  await sleep(400);
  await typeStory(page, 'What does Anansi demand of the fisherman at the edge of the midnight sea?', 15);
  await sleep(600);
  await submitPipeline(page);
  console.log('  ⏳ Waiting for agent nodes (fal.ai / Deepgram) to activate...');
  await sleep(38000);
  await page.screenshot({ path: path.join(TAKES_DIR, 'scene-04-debug.png') });
  console.log('  ✓ done');
}

// SCENE 5 — Sync & Publish (~50s): full run, poll for completion
async function scene05(page) {
  await gotoDemo(page);
  await clickTheme(page, 'Papa Bois');
  await sleep(400);
  await typeStory(page, 'Papa Bois guards the ancient mahogany forest. What happens when a logger crosses the boundary?', 15);
  await sleep(600);
  await submitPipeline(page);
  console.log('  ⏳ Polling for pipeline completion (max 90s)...');
  let done = false;
  for (let i = 0; i < 18; i++) {
    await sleep(5000);
    const txt = await page.evaluate(() => document.body.innerText);
    if (/published|✅|complete|story ready|success/i.test(txt)) {
      console.log(`  ✅ Completed at ${(i+1)*5}s`);
      done = true;
      break;
    }
    // Also check for any green/success node styling
    const greenNodes = await page.evaluate(() =>
      [...document.querySelectorAll('[class*="green"],[class*="success"],[class*="complete"]')].length
    );
    if (greenNodes > 0) {
      console.log(`  ✅ Green nodes found at ${(i+1)*5}s`);
      done = true;
      break;
    }
    process.stdout.write(`  ... ${(i+1)*5}s\r`);
  }
  if (!done) console.log('\n  ⚠️ Timed out — showing whatever state we reached');
  await sleep(8000); // hold on final state
  await page.screenshot({ path: path.join(TAKES_DIR, 'scene-05-debug.png') });
  console.log('  ✓ done');
}

// SCENE 6 — The Result (~18s): navigate to home, scroll through story
async function scene06(page) {
  const routes = ['/', '/stories', '/demo'];
  let landed = false;
  for (const r of routes) {
    try {
      await page.goto(BASE_URL + r, { waitUntil: 'load', timeout: 12000 });
      await sleep(2000);
      const txt = await page.evaluate(() => document.body.innerText);
      if (txt.length > 300) { console.log(`  ✓ Content at ${r}`); landed = true; break; }
    } catch (e) { console.log(`  Route ${r}: ${e.message}`); }
  }
  if (!landed) {
    await page.goto(BASE_URL + '/pipeline-demo', { waitUntil: 'load', timeout: 20000 });
    await sleep(2000);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await sleep(2000);
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
  await sleep(3500);
  await page.evaluate(() => window.scrollBy({ top: 250, behavior: 'smooth' }));
  await sleep(4000);
  await page.evaluate(() => window.scrollBy({ top: -100, behavior: 'smooth' }));
  await sleep(3000);
  await page.screenshot({ path: path.join(TAKES_DIR, 'scene-06-debug.png') });
  console.log('  ✓ done');
}

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const scenes = [
    { num: 1, name: 'scene-01-hook',           fn: scene01 },
    { num: 2, name: 'scene-02-request',        fn: scene02 },
    { num: 3, name: 'scene-03-pipeline-start', fn: scene03 },
    { num: 4, name: 'scene-04-agents-working', fn: scene04 },
    { num: 5, name: 'scene-05-sync-publish',   fn: scene05 },
    { num: 6, name: 'scene-06-result',         fn: scene06 },
  ];

  const arg = process.argv[2];
  const selected = (!arg || arg === 'all')
    ? scenes
    : scenes.filter(s => arg.split(',').map(Number).includes(s.num));

  console.log('🎬 SandSync Scene Recorder v3');
  console.log(`📁 ${TAKES_DIR}`);
  console.log(`🎯 Scenes: ${selected.map(s => s.num).join(', ')}\n`);

  const results = [];
  for (const s of selected) {
    const r = await recordScene(s.name, s.fn);
    results.push(r);
    await sleep(1500);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('📊 DONE');
  for (const r of results) console.log(`  ${r.success ? '✅' : '❌'} ${r.sceneName}`);

  console.log('\n📁 takes/:');
  fs.readdirSync(TAKES_DIR).filter(f => /\.(webm|mp4|png)$/.test(f)).sort().forEach(f => {
    const sz = (fs.statSync(path.join(TAKES_DIR, f)).size / 1024).toFixed(0);
    console.log(`   ${f} (${sz}KB)`);
  });
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

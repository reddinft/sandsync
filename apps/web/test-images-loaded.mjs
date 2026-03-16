import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto('https://web-eta-black-15.vercel.app/showcase', { timeout: 30000 });
await page.waitForTimeout(5000);

// Check for images in grid
const imgCount = await page.locator('.grid img').count();
console.log(`Images in grid: ${imgCount}`);

// Get image sources
const srcs = await page.locator('.grid img').evaluateAll(
  (imgs) => imgs.map(img => img.src)
);
console.log(`Image URLs found: ${srcs.length}`);
srcs.slice(0, 3).forEach((src, i) => {
  console.log(`  [${i}] ${src.slice(-80)}`);
});

// Check if any images actually loaded (naturalWidth > 0)
const loadedImgs = await page.locator('.grid img').evaluateAll(
  (imgs) => imgs.filter(img => img.naturalWidth > 0).length
);
console.log(`Images actually loaded (naturalWidth > 0): ${loadedImgs}`);

// Check for broken images
const brokenImgs = await page.locator('.grid img').evaluateAll(
  (imgs) => imgs.filter(img => img.complete && img.naturalWidth === 0).length
);
console.log(`Broken images (complete but zero width): ${brokenImgs}`);

// Check alt text
const alts = await page.locator('.grid img').evaluateAll(
  (imgs) => imgs.map(img => img.alt)
);
console.log(`Alt texts: ${alts.slice(0, 3).join(', ')}`);

await browser.close();

import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage();

// Capture console logs
page.on('console', (msg) => console.log(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', (err) => console.log(`[error] ${err.message}`));

console.log('Loading https://web-eta-black-15.vercel.app/showcase...');
await page.goto('https://web-eta-black-15.vercel.app/showcase', { timeout: 30000 });

console.log('Waiting 5 seconds for content...');
await page.waitForTimeout(5000);

const gridCount = await page.locator('.grid > div').count();
console.log(`Grid items found: ${gridCount}`);

const h1 = await page.locator('h1').textContent();
console.log(`Page heading: ${h1}`);

const errorText = await page.locator('text=/Failed|Error/').count();
console.log(`Error messages visible: ${errorText}`);

await browser.close();

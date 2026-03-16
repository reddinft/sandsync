/**
 * Showcase & Story Reader — Image Verification Tests
 *
 * Checks against the live production site:
 *   1. Showcase displays stories (not empty)
 *   2. At least one story card shows a real cover image (not just gradient)
 *   3. Images return HTTP 200 (not 403/404/blocked)
 *   4. Story reader renders chapter illustrations
 *   5. Stories without images show a gradient placeholder (not blank)
 *
 * Run with:
 *   cd apps/web && bunx playwright test e2e/showcase-images.spec.ts --config=playwright.prod.config.ts
 */

import { test, expect } from "@playwright/test";

const BASE = "https://web-eta-black-15.vercel.app";
const WAIT_MS = 6000; // time for React to fetch + render

test.describe("Showcase page — story cards", () => {
  test("loads and shows at least one story card", async ({ page }) => {
    await page.goto(`${BASE}/showcase`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(WAIT_MS);

    // Cards have cursor-pointer class
    const cards = page.locator('[class*="cursor-pointer"]');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });

    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    console.log(`✅ Showcase: ${count} story cards visible`);
  });

  test("story cards show h3 titles", async ({ page }) => {
    await page.goto(`${BASE}/showcase`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(WAIT_MS);

    const titles = page.locator('h3');
    await expect(titles.first()).toBeVisible({ timeout: 10_000 });

    const count = await titles.count();
    expect(count).toBeGreaterThan(0);
    const firstTitle = await titles.first().textContent();
    console.log(`✅ First story: "${firstTitle}"`);
  });

  test("at least one story card has a visible cover image", async ({ page }) => {
    await page.goto(`${BASE}/showcase`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(WAIT_MS);

    // Wait for images to appear
    const images = page.locator('[class*="grid"] img');
    await expect(images.first()).toBeVisible({ timeout: 10_000 });

    const imgCount = await images.count();
    expect(imgCount).toBeGreaterThan(0);
    console.log(`✅ Showcase: ${imgCount} card image(s) found`);
  });

  test("cover images actually load (naturalWidth > 0)", async ({ page }) => {
    await page.goto(`${BASE}/showcase`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(WAIT_MS);

    // Wait for at least one image to appear
    await page.waitForSelector('[class*="grid"] img', { timeout: 10_000 });
    
    // Give images time to finish loading
    await page.waitForTimeout(3000);

    const loadedCount = await page.locator('[class*="grid"] img').evaluateAll(
      (imgs) => imgs.filter((img) => (img as HTMLImageElement).naturalWidth > 0).length
    );
    
    const totalCount = await page.locator('[class*="grid"] img').count();
    console.log(`✅ Images loaded: ${loadedCount}/${totalCount}`);
    expect(loadedCount).toBeGreaterThan(0);
  });

  test("no broken images (complete but zero naturalWidth)", async ({ page }) => {
    await page.goto(`${BASE}/showcase`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(WAIT_MS);
    await page.waitForSelector('[class*="grid"] img', { timeout: 10_000 });
    await page.waitForTimeout(3000);

    const brokenImgs = await page.locator('[class*="grid"] img').evaluateAll((imgs) =>
      imgs
        .filter((img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth === 0)
        .map((img) => (img as HTMLImageElement).src)
    );

    if (brokenImgs.length > 0) {
      console.warn("⚠️ Broken images:", brokenImgs);
    }
    expect(brokenImgs.length, `Broken images found: ${brokenImgs.join(", ")}`).toBe(0);
  });

  test("cover image URLs return HTTP 200", async ({ page, request }) => {
    await page.goto(`${BASE}/showcase`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(WAIT_MS);
    await page.waitForSelector('[class*="grid"] img', { timeout: 10_000 });

    const imgSrcs = await page.locator('[class*="grid"] img').evaluateAll(
      (imgs) => imgs.slice(0, 3).map((img) => (img as HTMLImageElement).src)
    );

    expect(imgSrcs.length).toBeGreaterThan(0);

    for (const src of imgSrcs) {
      if (!src || src.startsWith("data:")) continue;
      const resp = await request.get(src);
      expect(resp.status(), `Image not accessible: ${src}`).toBe(200);
      console.log(`✅ Image 200 OK: ...${src.slice(-60)}`);
    }
  });
});

test.describe("Story reader — chapter illustrations", () => {
  test("clicking a story card opens the story reader", async ({ page }) => {
    await page.goto(`${BASE}/showcase`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(WAIT_MS);
    await page.waitForSelector('[class*="cursor-pointer"]', { timeout: 10_000 });

    // Click first story card
    await page.locator('[class*="cursor-pointer"]').first().click();
    await page.waitForURL(/\/stories\/.+/, { timeout: 10_000 });

    // Story title should appear
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 15_000 });
    console.log(`✅ Story title: ${await heading.textContent()}`);
  });

  test("completed story shows chapter illustrations or gradient placeholders", async ({ page }) => {
    await page.goto(`${BASE}/showcase`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(WAIT_MS);
    await page.waitForSelector('[class*="cursor-pointer"]', { timeout: 10_000 });

    await page.locator('[class*="cursor-pointer"]').first().click();
    await page.waitForURL(/\/stories\/.+/, { timeout: 10_000 });
    await page.waitForTimeout(WAIT_MS);

    // Wait for chapters
    await page.waitForSelector('article', { timeout: 15_000 });
    const articles = page.locator('article');
    const articleCount = await articles.count();
    expect(articleCount).toBeGreaterThan(0);
    console.log(`✅ Story has ${articleCount} chapters`);

    // Each chapter should have either a <figure> with img OR a gradient placeholder figure
    for (let i = 0; i < Math.min(articleCount, 3); i++) {
      const article = articles.nth(i);
      const hasFigure = (await article.locator('figure').count()) > 0;
      const hasImg = (await article.locator('figure img').count()) > 0;

      expect(hasFigure, `Chapter ${i + 1}: no figure (illustration or placeholder)`).toBe(true);
      console.log(`✅ Chapter ${i + 1}: ${hasImg ? "has image" : "has gradient placeholder"}`);
    }
  });

  test("chapter images in story reader load successfully", async ({ page }) => {
    await page.goto(`${BASE}/showcase`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(WAIT_MS);
    await page.waitForSelector('[class*="cursor-pointer"]', { timeout: 10_000 });

    await page.locator('[class*="cursor-pointer"]').first().click();
    await page.waitForURL(/\/stories\/.+/, { timeout: 10_000 });
    await page.waitForTimeout(WAIT_MS);
    await page.waitForSelector('article', { timeout: 15_000 });
    await page.waitForTimeout(3000);

    const totalImgs = await page.locator('article figure img').count();
    if (totalImgs === 0) {
      console.log("ℹ️  No chapter images — all using gradient placeholders");
      return;
    }

    const loadedImgs = await page.locator('article figure img').evaluateAll(
      (imgs) => imgs.filter((img) => (img as HTMLImageElement).naturalWidth > 0).length
    );
    console.log(`✅ Chapter images loaded: ${loadedImgs}/${totalImgs}`);
    expect(loadedImgs).toBeGreaterThan(0);
  });
});

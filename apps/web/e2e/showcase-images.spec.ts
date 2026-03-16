/**
 * Showcase & Story Reader — Image Verification Tests
 *
 * Checks against the live production site:
 *   1. Showcase displays stories (not empty)
 *   2. At least one story card shows a real cover image (not just gradient)
 *   3. Images return HTTP 200 (not 403/404)
 *   4. Story reader renders chapter illustrations
 *   5. Stories without images show a gradient placeholder (not a blank void)
 *
 * Run with:
 *   cd apps/web && bunx playwright test e2e/showcase-images.spec.ts --config=playwright.prod.config.ts
 */

import { test, expect } from "@playwright/test";

test.describe("Showcase page — story cards", () => {
  test("loads and shows at least one story card", async ({ page }) => {
    await page.goto("/showcase");
    await page.waitForLoadState("networkidle");

    // Grid should have story cards — wait up to 15s for API fetch
    const cards = page.locator(".grid > div");
    await expect(cards.first()).toBeVisible({ timeout: 15_000 });

    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    console.log(`✅ Showcase: ${count} story cards visible`);
  });

  test("at least one story card has a visible cover image", async ({ page }) => {
    await page.goto("/showcase");
    await page.waitForLoadState("networkidle");

    // Wait for cards to render
    await page.waitForSelector(".grid > div", { timeout: 15_000 });

    // Check for actual <img> tags in cards (not just gradient fallbacks)
    const images = page.locator(".grid > div img");
    const imgCount = await images.count();
    expect(imgCount).toBeGreaterThan(0);
    console.log(`✅ Showcase: ${imgCount} card image(s) found`);
  });

  test("cover images return HTTP 200 (not broken)", async ({ page, request }) => {
    await page.goto("/showcase");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector(".grid > div img", { timeout: 15_000 });

    // Collect up to 3 image src URLs from the cards
    const imgSrcs = await page.locator(".grid > div img").evaluateAll(
      (imgs) => imgs.slice(0, 3).map((img) => (img as HTMLImageElement).src)
    );

    expect(imgSrcs.length).toBeGreaterThan(0);

    for (const src of imgSrcs) {
      if (!src || src.startsWith("data:")) continue;
      const resp = await request.get(src);
      expect(resp.status(), `Image not accessible: ${src}`).toBe(200);
      console.log(`✅ Image 200 OK: ${src.slice(-60)}`);
    }
  });

  test("no broken-image icons visible (naturalWidth check)", async ({ page }) => {
    await page.goto("/showcase");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector(".grid > div", { timeout: 15_000 });

    // Give images time to load
    await page.waitForTimeout(3000);

    const brokenImgs = await page.locator(".grid > div img").evaluateAll((imgs) =>
      imgs.filter(
        (img) => (img as HTMLImageElement).naturalWidth === 0 && (img as HTMLImageElement).complete
      ).map((img) => (img as HTMLImageElement).src)
    );

    if (brokenImgs.length > 0) {
      console.warn("⚠️ Broken images:", brokenImgs);
    }
    expect(brokenImgs.length, `Broken images found: ${brokenImgs.join(", ")}`).toBe(0);
  });
});

test.describe("Story reader — chapter illustrations", () => {
  test("first story in showcase opens and shows chapter content", async ({ page }) => {
    await page.goto("/showcase");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector(".grid > div", { timeout: 15_000 });

    // Click the first story card
    await page.locator(".grid > div").first().click();
    await page.waitForURL(/\/stories\/.+/, { timeout: 10_000 });

    // Should show story title
    const heading = page.locator("h1").first();
    await expect(heading).toBeVisible({ timeout: 15_000 });
    console.log(`✅ Story title: ${await heading.textContent()}`);
  });

  test("completed story shows chapter illustration or gradient placeholder (not blank)", async ({ page }) => {
    // Navigate directly to a known-complete story
    await page.goto("/showcase");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector(".grid > div", { timeout: 15_000 });

    // Click first story
    await page.locator(".grid > div").first().click();
    await page.waitForURL(/\/stories\/.+/, { timeout: 10_000 });
    await page.waitForLoadState("networkidle");

    // Wait for chapters to appear
    await page.waitForSelector("article", { timeout: 20_000 });

    const articles = page.locator("article");
    const articleCount = await articles.count();
    expect(articleCount).toBeGreaterThan(0);

    // For each chapter, verify either an image OR a gradient placeholder exists
    // (not a blank void) — both are wrapped in <figure>
    for (let i = 0; i < Math.min(articleCount, 3); i++) {
      const article = articles.nth(i);
      const hasImage = await article.locator("figure img").count() > 0;
      const hasPlaceholder = await article.locator("figure").count() > 0;

      // Either an image or a placeholder figure must exist
      expect(
        hasImage || hasPlaceholder,
        `Chapter ${i + 1}: no illustration or placeholder found`
      ).toBe(true);

      if (hasImage) {
        console.log(`✅ Chapter ${i + 1}: has illustration image`);
      } else {
        console.log(`ℹ️  Chapter ${i + 1}: has gradient placeholder (no image URL)`);
      }
    }
  });

  test("chapter images in story reader return HTTP 200", async ({ page, request }) => {
    await page.goto("/showcase");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector(".grid > div img", { timeout: 15_000 });
    await page.locator(".grid > div").first().click();
    await page.waitForURL(/\/stories\/.+/, { timeout: 10_000 });
    await page.waitForLoadState("networkidle");
    await page.waitForSelector("article", { timeout: 20_000 });

    // Give images time to load
    await page.waitForTimeout(2000);

    const imgSrcs = await page.locator("article figure img").evaluateAll(
      (imgs) => imgs.slice(0, 3).map((img) => (img as HTMLImageElement).src)
    );

    if (imgSrcs.length === 0) {
      console.log("ℹ️  No chapter images found — gradient placeholders in use");
      return;
    }

    for (const src of imgSrcs) {
      if (!src || src.startsWith("data:")) continue;
      const resp = await request.get(src);
      expect(resp.status(), `Chapter image not accessible: ${src}`).toBe(200);
      console.log(`✅ Chapter image 200 OK: ${src.slice(-60)}`);
    }
  });
});

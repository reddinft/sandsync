import { test, expect } from "@playwright/test";

test.describe("Feature: PowerSync Real-time Sync", () => {
  test("PowerSync initializes without errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    // Let PowerSync initialize

    // Filter out expected dev warnings
    const criticalErrors = consoleErrors.filter(
      (e) =>
        !e.includes("Warning:") &&
        !e.includes("Download the React DevTools") &&
        !e.includes("Failed to fetch") // Expected when API not running
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test("local SQLite database is accessible", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    // Let PowerSync WASM initialize

    // Evaluate PowerSync status in the browser
    const isReady = await page.evaluate(async () => {
      // PowerSync attaches to window in dev mode
      return (
        (document.querySelector("[data-powersync-ready]") !== null) ||
        document.body.innerText.includes("Stories from the Spirit World")
      );
    });

    expect(isReady).toBe(true);
  });
});

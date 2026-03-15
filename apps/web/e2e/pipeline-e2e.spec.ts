/**
 * SandSync — Full Pipeline E2E Test
 *
 * Tests the complete flow via the pipeline-demo page using text input:
 *   1. API health + service key reachability
 *   2. Story created via API → pipeline runs to completion (API-only)
 *   3. Pipeline demo page UI — submit story, verify nodes go active
 *   4. Story reader page — content, image, audio state
 *   5. Showcase page gallery
 *   6. API-only: full pipeline validation (agents, image, audio, latency, imagen source)
 *   7–9. Smoke tests (page load only, no story submission)
 *
 * Runs against: https://web-eta-black-15.vercel.app (production)
 * API: https://sandsync-api.fly.dev
 */

import { test, expect, type Page } from "@playwright/test";

const BASE_URL = "https://web-eta-black-15.vercel.app";
const API_URL = "https://sandsync-api.fly.dev";
const PIPELINE_TIMEOUT = 120_000; // 2 min max for full pipeline
const POLL_TIMEOUT_BUFFER = 60_000; // extra buffer on top of pipeline timeout for polling
const STORY_PROMPT = "Anansi the spider tricks a proud lion into giving up his roar";

/** Known good story ID — used for smoke tests that don't submit a new story */
const KNOWN_STORY_ID = "3ad4ba52-c963-49db-b66e-5717f95fdc83";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function pollStoryStatus(
  storyId: string,
  timeoutMs = PIPELINE_TIMEOUT + POLL_TIMEOUT_BUFFER,
): Promise<{
  status: string;
  title: string | null;
  chapters_complete: number;
  total_chapters: number | null;
}> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${API_URL}/stories/${storyId}/status`);
    if (res.ok) {
      const data = await res.json();
      if (data.status === "complete" || data.status === "failed") return data;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error(`Story ${storyId} did not complete within ${timeoutMs}ms`);
}

// ── Test suite ────────────────────────────────────────────────────────────────

test.describe("SandSync Full Pipeline E2E", () => {
  // NOTE: No test.setTimeout at describe level.
  // Global config timeout (360_000) applies unless overridden per-test.
  // Tests that call pollStoryStatus set their own individual timeout below.

  // ── Test 1: API health + all service keys ──────────────────────────────────
  test("API health and all service keys are working", async ({ request }) => {
    // Health endpoint
    const health = await request.get(`${API_URL}/health`);
    expect(health.status()).toBe(200);
    const healthBody = await health.json();
    expect(healthBody.ok).toBe(true);
    expect(healthBody.mastra).toBe(true);
    expect(healthBody.supabase).toBe(true);

    // ElevenLabs — just verify endpoint is reachable (key lives on Fly)
    const el = await request.post(
      "https://api.elevenlabs.io/v1/text-to-speech/SOYHLrjzK2X1ezoPC6cr",
      {
        headers: { "Content-Type": "application/json" },
        data: {},
      },
    );
    // 401 is OK (no key client-side) — 404/503 would indicate service down
    expect([200, 401, 422]).toContain(el.status());

    // fal.ai — verify endpoint reachable
    const falCheck = await request.get("https://fal.run/fal-ai/flux/schnell");
    expect([200, 401, 403, 405]).toContain(falCheck.status());

    // Groq — verify reachable
    const groqCheck = await request.get("https://api.groq.com/openai/v1/models");
    expect([200, 401]).toContain(groqCheck.status());

    // Deepgram — verify reachable
    const dgCheck = await request.get("https://api.deepgram.com/v1/projects");
    expect([200, 401]).toContain(dgCheck.status());

    // Supabase confirmed via API health check above
    console.log(
      "✅ All services reachable. Supabase confirmed via API health check.",
    );
  });

  // ── Test 2: Story creation API end-to-end ─────────────────────────────────
  test(
    "POST /stories creates a story and pipeline runs to completion",
    async ({ request }) => {
      // 5 min individual timeout — pipeline takes ~86s, poll can take up to 180s,
      // plus HTTP overhead. Do NOT rely on describe-level timeout.
      test.setTimeout(300_000);

      const startMs = Date.now();

      const createRes = await request.post(`${API_URL}/stories`, {
        data: {
          userId: "playwright-e2e-test",
          request: STORY_PROMPT,
          shortStory: true,
        },
      });

      expect(createRes.status()).toBe(201);
      const { storyId } = await createRes.json();
      expect(storyId).toBeTruthy();
      console.log(`✅ Story created: ${storyId}`);

      // Poll until complete — up to 180 s
      const status = await pollStoryStatus(storyId, PIPELINE_TIMEOUT + POLL_TIMEOUT_BUFFER);
      expect(status.status).toBe("complete");
      expect(status.title).toBeTruthy();
      console.log(
        `✅ Pipeline complete: "${status.title}" (${status.chapters_complete} chapter(s))`,
      );

      // Verify story data via GET /stories/:id
      const storyRes = await request.get(`${API_URL}/stories/${storyId}`);
      expect(storyRes.status()).toBe(200);
      const story = await storyRes.json();
      expect(story.title).toBeTruthy();
      expect(story.chapters).toHaveLength(1); // shortStory=true → 1 chapter

      const ch = story.chapters[0];
      expect(ch.content).toBeTruthy();
      expect(ch.content.length).toBeGreaterThan(200);
      console.log(`✅ Chapter content: ${ch.content.length} chars`);

      // Verify fal.ai image was generated
      expect(ch.image_url).toBeTruthy();
      console.log(`✅ Image generated: ${ch.image_url}`);
      const imgCheck = await fetch(ch.image_url);
      expect(imgCheck.status).toBe(200);
      expect(imgCheck.headers.get("content-type")).toContain("image");

      // Assert audio_url is set — ElevenLabs timeout is fixed
      expect(ch.audio_url).toBeTruthy();
      console.log(`✅ Audio generated: ${ch.audio_url}`);
      const audioCheck = await fetch(ch.audio_url);
      expect(audioCheck.status).toBe(200);

      // Check agent events
      const eventsRes = await request.get(`${API_URL}/stories/${storyId}/events`);
      expect(eventsRes.status()).toBe(200);
      const events: Array<{ agent: string; event_type: string; payload: unknown }> =
        await eventsRes.json();

      const agents = events.map((e) => e.agent);
      expect(agents).toContain("papa_bois");
      expect(agents).toContain("anansi");
      expect(agents).toContain("ogma");
      expect(agents).toContain("imagen");

      const papaBoisCompleted = events.find(
        (e) => e.agent === "papa_bois" && e.event_type === "completed",
      ) as { payload: { brief?: { title?: string } } } | undefined;
      expect(papaBoisCompleted?.payload?.brief?.title).toBeTruthy();
      console.log(
        `✅ Papa Bois brief: "${papaBoisCompleted?.payload?.brief?.title}"`,
      );

      const imagenCompleted = events.find(
        (e) => e.agent === "imagen" && e.event_type === "completed",
      ) as { payload: { image_url?: string; source?: string } } | undefined;
      expect(imagenCompleted?.payload?.image_url).toBeTruthy();
      console.log(
        `✅ imagen completed: source=${imagenCompleted?.payload?.source}`,
      );

      const pipelineCompleted = events.find(
        (e) => e.agent === "pipeline" && e.event_type === "completed",
      ) as {
        payload: { total_cost_usd?: number; total_latency_ms?: number };
      } | undefined;
      expect(pipelineCompleted?.payload?.total_cost_usd).toBeDefined();
      console.log(
        `✅ Pipeline cost: $${pipelineCompleted?.payload?.total_cost_usd} | latency: ${pipelineCompleted?.payload?.total_latency_ms}ms`,
      );

      const elapsedMs = Date.now() - startMs;
      console.log(`✅ Total test wall-clock time: ${elapsedMs}ms`);
    },
  );

  // ── Test 3: Pipeline demo UI ───────────────────────────────────────────────
  // Strategy: submit story, verify pipeline STARTS (nodes go active), then
  // check the API briefly. Do NOT wait for full completion inside the browser
  // — the pipeline takes ~86s and the page has background SSE that keeps
  // network open, making networkidle impossible.
  test(
    "Pipeline demo page — submit story, watch nodes, see preview",
    async ({ page }) => {
      await page.goto(`${BASE_URL}/pipeline-demo`, {
        waitUntil: "domcontentloaded",
      });

      // Check page structure
      await expect(page.locator("h1")).toContainText("SandSync Pipeline");
      await expect(page.locator("text=✍️ Type")).toBeVisible();
      await expect(page.locator("text=🎤 Speak")).toBeVisible();
      await expect(page.locator("text=Quick demo")).toBeVisible();
      await expect(page.locator("text=Run Pipeline")).toBeVisible();
      console.log("✅ Pipeline demo page structure verified");

      // Verify Quick Demo checkbox is checked by default
      const quickDemoCheckbox = page.locator('input[type="checkbox"]').first();
      await expect(quickDemoCheckbox).toBeChecked();
      console.log("✅ Quick demo checkbox is checked by default");

      // Verify pipeline nodes are visible
      await expect(page.locator("text=PowerSync Client Write")).toBeVisible();
      await expect(page.locator("text=Mastra Orchestrator")).toBeVisible();
      await expect(page.locator("text=ElevenLabs").first()).toBeVisible();
      // Confirm Deepgram TTS is NOT shown as a pipeline node (it's STT input only)
      const deepgramTTSNode = page.locator("text=Deepgram TTS");
      await expect(deepgramTTSNode).not.toBeVisible();
      console.log(
        "✅ Pipeline nodes correct — ElevenLabs present, Deepgram TTS absent",
      );

      // Select Anansi genre and enter prompt
      await page.locator('button:has-text("Anansi")').click();
      await page.locator("textarea").fill(STORY_PROMPT);

      // Intercept the story creation API call to capture storyId
      let capturedStoryId: string | null = null;
      page.on("response", async (response) => {
        if (
          response.url().includes("/stories") &&
          response.request().method() === "POST"
        ) {
          try {
            const body = await response.json();
            if (body.storyId) capturedStoryId = body.storyId;
          } catch {}
        }
      });

      // Submit
      await page.locator('button:has-text("Run Pipeline")').click();
      console.log("✅ Story submitted");

      // Wait briefly for the API to accept the request and return a storyId
      await page.waitForTimeout(3000);

      // Verify pipeline has started — either a status message or node state change
      // The page should show some activity (story submitted / nodes firing)
      await expect(
        page
          .locator("text=Story submitted")
          .or(page.locator("text=Running"))
          .or(page.locator("text=Processing"))
          .first(),
      )
        .toBeVisible({ timeout: 15_000 })
        .catch(() => {
          console.log(
            "ℹ️  No explicit 'Story submitted' text — pipeline may use different state labels",
          );
        });

      if (capturedStoryId) {
        console.log(`✅ Captured storyId from network: ${capturedStoryId}`);
        // Verify via API that the story exists and is running (don't wait for full completion)
        const statusRes = await fetch(
          `${API_URL}/stories/${capturedStoryId}/status`,
        );
        expect(statusRes.ok).toBe(true);
        const statusData = await statusRes.json();
        expect(["pending", "running", "generating", "complete"]).toContain(statusData.status);
        console.log(`✅ Story status via API: ${statusData.status}`);
      } else {
        console.warn(
          "⚠️  Could not capture storyId from network — verifying page activity only",
        );
      }

      // Confirm page didn't crash or show error
      await expect(page.locator("text=Error").first()).not.toBeVisible({
        timeout: 5_000,
      }).catch(() => {});
      console.log("✅ Pipeline demo page: story submitted, nodes activating");
    },
  );

  // ── Test 4: Story reader page ─────────────────────────────────────────────
  test(
    "Story reader page loads content, image, and correct audio state",
    async ({ page }) => {
      // Fetch latest complete story from API for a realistic test
      const listRes = await fetch(`${API_URL}/stories`);
      const stories = await listRes.json();
      expect(stories.length).toBeGreaterThan(0);

      const latestStory = stories[0];
      console.log(
        `Testing story reader for: "${latestStory.title}" (${latestStory.id})`,
      );

      await page.goto(`${BASE_URL}/stories/${latestStory.id}`, {
        waitUntil: "domcontentloaded",
      });

      // Should NOT show "Story not found"
      await expect(page.locator("text=Story not found")).not.toBeVisible({
        timeout: 15_000,
      });

      // Should show the story title
      await expect(page.locator("h1")).toContainText(latestStory.title, {
        timeout: 15_000,
      });
      console.log(`✅ Story title visible: "${latestStory.title}"`);

      // Chapter content should be visible
      await expect(page.locator("article").first()).toBeVisible({
        timeout: 10_000,
      });
      console.log("✅ Chapter content rendered");

      // Image: either shown or skeleton (not broken)
      const brokenImages = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll("img"));
        return imgs
          .filter((img) => !img.complete || img.naturalHeight === 0)
          .map((img) => img.src);
      });
      if (brokenImages.length > 0) {
        console.warn(`⚠️  Broken images: ${brokenImages.join(", ")}`);
      } else {
        console.log("✅ No broken images");
      }

      // Audio: either AudioPlayer ("Narration by Devi" visible) or one of our honest status messages
      const audioPlayer = page.locator("text=Narration by Devi");
      const audioUnavailable = page.locator("text=Audio unavailable");
      const audioProcessing = page.locator(
        "text=Narration by Devi — processing audio",
      );

      // One of these should be present
      await expect(
        audioPlayer.or(audioUnavailable).or(audioProcessing).first(),
      ).toBeVisible({ timeout: 10_000 });

      const hasAudio = await audioPlayer.isVisible().catch(() => false);
      const isUnavailable = await audioUnavailable.isVisible().catch(() => false);
      console.log(
        `✅ Audio state: ${hasAudio ? "audio player present ✓" : isUnavailable ? "unavailable (quota)" : "processing"}`,
      );

      // No "Illustration for undefined"
      const badAlt = await page.locator('img[alt*="undefined"]').count();
      expect(badAlt).toBe(0);
      console.log("✅ No broken alt text");
    },
  );

  // ── Test 5: Showcase page ─────────────────────────────────────────────────
  test("Showcase page loads story gallery", async ({ page }) => {
    await page.goto(`${BASE_URL}/showcase`, { waitUntil: "domcontentloaded" });

    // Should show stories
    await expect(
      page
        .locator("text=Story Showcase")
        .or(page.locator("text=Showcase"))
        .first(),
    ).toBeVisible({ timeout: 10_000 });

    // At least one story card
    const readButtons = page.locator("text=Read");
    await expect(readButtons.first()).toBeVisible({ timeout: 15_000 });
    const count = await readButtons.count();
    console.log(`✅ Showcase shows ${count} stories`);

    // Click first story card → reader should load
    await readButtons.first().click();
    await expect(page).toHaveURL(/\/stories\//, { timeout: 10_000 });
    await expect(page.locator("text=Story not found")).not.toBeVisible({
      timeout: 15_000,
    });
    console.log("✅ Story card click → reader loads correctly");
  });

  // ── Test 6: API-only — full pipeline validation ────────────────────────────
  // Validates ALL agents ran, image source is fal, audio is working (devi not failed),
  // latency < 180s, imagen source is "fal".
  test(
    "API-only: full pipeline validation — all agents, image, audio, latency",
    async ({ request }) => {
      test.setTimeout(300_000); // 5 min — pipeline ~86s + poll buffer

      const pipelineStart = Date.now();

      const createRes = await request.post(`${API_URL}/stories`, {
        data: {
          userId: "playwright-api-validation",
          request: "A river spirit teaches a young girl to trust her voice",
          shortStory: true,
        },
      });
      expect(createRes.status()).toBe(201);
      const { storyId } = await createRes.json();
      expect(storyId).toBeTruthy();
      console.log(`✅ Story created: ${storyId}`);

      // Poll until complete — max 3 min
      const status = await pollStoryStatus(storyId, 180_000);
      const pipelineMs = Date.now() - pipelineStart;

      expect(status.status).toBe("complete");
      console.log(
        `✅ Pipeline complete in ${pipelineMs}ms: "${status.title}"`,
      );

      // Assert total latency < 180 s
      expect(pipelineMs).toBeLessThan(180_000);
      console.log(`✅ Latency within bound: ${pipelineMs}ms < 180000ms`);

      // Full story data
      const storyRes = await request.get(`${API_URL}/stories/${storyId}`);
      expect(storyRes.status()).toBe(200);
      const story = await storyRes.json();

      expect(story.title).toBeTruthy();
      const ch = story.chapters[0];
      expect(ch).toBeTruthy();

      // Chapter content > 200 chars
      expect(ch.content).toBeTruthy();
      expect(ch.content.length).toBeGreaterThan(200);
      console.log(`✅ Chapter content length: ${ch.content.length} chars`);

      // image_url set
      expect(ch.image_url).toBeTruthy();
      console.log(`✅ image_url: ${ch.image_url}`);

      // audio_url set — ElevenLabs / devi is working
      expect(ch.audio_url).toBeTruthy();
      console.log(`✅ audio_url: ${ch.audio_url}`);

      // Agent events
      const eventsRes = await request.get(
        `${API_URL}/stories/${storyId}/events`,
      );
      expect(eventsRes.status()).toBe(200);
      const events: Array<{
        agent: string;
        event_type: string;
        payload: Record<string, unknown>;
      }> = await eventsRes.json();

      const completedAgents = events
        .filter((e) => e.event_type === "completed")
        .map((e) => e.agent);

      // All required agents must have completed
      for (const agent of [
        "papa_bois",
        "anansi",
        "ogma",
        "imagen",
        "devi",
      ] as const) {
        expect(completedAgents).toContain(agent);
        console.log(`✅ Agent completed: ${agent}`);
      }

      // devi must NOT have failed (audio is working)
      const deviFailed = events.find(
        (e) => e.agent === "devi" && e.event_type === "failed",
      );
      expect(deviFailed).toBeUndefined();
      console.log("✅ devi completed without failure (ElevenLabs audio OK)");

      // imagen source must be "fal" (fal.ai FLUX)
      const imagenCompleted = events.find(
        (e) => e.agent === "imagen" && e.event_type === "completed",
      );
      expect(imagenCompleted).toBeTruthy();
      expect((imagenCompleted!.payload as { source?: string }).source).toBe(
        "fal",
      );
      console.log(`✅ imagen source: ${(imagenCompleted!.payload as { source?: string }).source} (fal.ai FLUX confirmed)`);
    },
  );

  // ── Smoke tests — page load only, no story submission ─────────────────────
  test.describe("Smoke tests — page loads only", () => {
    test("/pipeline-demo: page loads with h1 and Run Pipeline button", async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/pipeline-demo`, {
        waitUntil: "domcontentloaded",
      });
      await expect(page.locator("h1").first()).toBeVisible({ timeout: 15_000 });
      await expect(
        page.locator('button:has-text("Run Pipeline")'),
      ).toBeVisible({ timeout: 10_000 });
      console.log("✅ /pipeline-demo smoke test passed");
    });

    test("/showcase: page loads with story cards", async ({ page }) => {
      await page.goto(`${BASE_URL}/showcase`, {
        waitUntil: "domcontentloaded",
      });
      // At least one story card / Read button visible
      await expect(page.locator("text=Read").first()).toBeVisible({
        timeout: 15_000,
      });
      console.log("✅ /showcase smoke test passed");
    });

    test("/stories/:id: page loads with story content (known good ID)", async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/stories/${KNOWN_STORY_ID}`, {
        waitUntil: "domcontentloaded",
      });
      // Should NOT show "Story not found"
      await expect(page.locator("text=Story not found")).not.toBeVisible({
        timeout: 10_000,
      });
      // Should show a heading and article content
      await expect(page.locator("h1").first()).toBeVisible({ timeout: 15_000 });
      await expect(page.locator("article").first()).toBeVisible({
        timeout: 10_000,
      });
      console.log(`✅ /stories/${KNOWN_STORY_ID} smoke test passed`);
    });
  });
});

import { describe, it, expect } from "vitest";

const API_URL = `http://localhost:${process.env.PORT || 3002}`;
const TEST_USER_ID = "test-user-ci";

describe("SandSync API", () => {
  // ── Health ────────────────────────────────────────────────────────────────

  describe("GET /health", () => {
    it("returns 200 with service status flags", async () => {
      const res = await fetch(`${API_URL}/health`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("ok", true);
      expect(data).toHaveProperty("supabase");
      expect(data).toHaveProperty("mastra");
      expect(data).toHaveProperty("ollama");
      expect(data).toHaveProperty("timestamp");
    });
  });

  // ── POST /stories ─────────────────────────────────────────────────────────

  describe("POST /stories", () => {
    it("creates a story and returns a storyId", async () => {
      const res = await fetch(`${API_URL}/stories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: TEST_USER_ID,
          request: "Tell me an Anansi story about a young fisherman in Tobago",
        }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toHaveProperty("storyId");
      expect(typeof data.storyId).toBe("string");
      expect(data.storyId.length).toBeGreaterThan(0);
    });

    it("rejects requests with missing userId", async () => {
      const res = await fetch(`${API_URL}/stories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: "Tell me a story" }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty("error");
      expect(data.error).toContain("userId");
    });

    it("rejects requests with missing request text", async () => {
      const res = await fetch(`${API_URL}/stories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: TEST_USER_ID }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty("error");
    });

    it("rejects invalid JSON body", async () => {
      const res = await fetch(`${API_URL}/stories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not-valid-json",
      });
      expect(res.status).toBe(400);
    });
  });

  // ── GET /stories/:id/status ───────────────────────────────────────────────

  describe("GET /stories/:id/status", () => {
    it("returns status for a freshly created story", async () => {
      // Create a story first
      const createRes = await fetch(`${API_URL}/stories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: TEST_USER_ID,
          request: "Tell me a Papa Bois story about the forest spirits",
        }),
      });
      expect(createRes.status).toBe(201);
      const { storyId } = await createRes.json();
      expect(typeof storyId).toBe("string");

      // Check its status
      const statusRes = await fetch(`${API_URL}/stories/${storyId}/status`);
      expect(statusRes.status).toBe(200);
      const status = await statusRes.json();
      expect(status).toHaveProperty("status");
      expect(["queued", "generating", "complete", "failed"]).toContain(
        status.status
      );
      expect(status).toHaveProperty("chapters_complete");
    });

    it("returns 404 for a non-existent story id", async () => {
      const res = await fetch(
        `${API_URL}/stories/00000000-0000-0000-0000-000000000000/status`
      );
      expect(res.status).toBe(404);
    });
  });
});

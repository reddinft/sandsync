import { describe, it, expect, beforeAll } from "vitest";

const API_URL = `http://localhost:${process.env.PORT || 3002}`;

describe("SandSync API", () => {
  describe("GET /health", () => {
    it("returns healthy status", async () => {
      const res = await fetch(`${API_URL}/health`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("status");
    });
  });

  describe("POST /stories", () => {
    it("creates a story and returns an id", async () => {
      const res = await fetch(`${API_URL}/stories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genre: "Anansi trickster tale",
          theme: "Test story for CI",
          length: "short",
        }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toHaveProperty("id");
      expect(typeof data.id).toBe("string");
    });

    it("rejects requests with missing genre", async () => {
      const res = await fetch(`${API_URL}/stories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: "No genre" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /stories/:id/status", () => {
    it("returns status for an existing story", async () => {
      // First create a story
      const createRes = await fetch(`${API_URL}/stories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genre: "Papa Bois forest spirit",
          length: "short",
        }),
      });
      const { id } = await createRes.json();

      // Then check status
      const statusRes = await fetch(`${API_URL}/stories/${id}/status`);
      expect(statusRes.status).toBe(200);
      const status = await statusRes.json();
      expect(["queued", "generating", "complete", "failed"]).toContain(
        status.status
      );
    });

    it("returns 404 for non-existent story", async () => {
      const res = await fetch(`${API_URL}/stories/non-existent-id/status`);
      expect(res.status).toBe(404);
    });
  });
});

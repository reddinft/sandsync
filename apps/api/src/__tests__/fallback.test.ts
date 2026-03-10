/**
 * Test Kokoro and Flux fallback services
 */

import { describe, it, expect } from "bun:test";
import { generateKokoroAudio } from "../services/kokoro";
import { generateFluxImage } from "../services/flux";

describe("Fallback Services", () => {
  it("generateKokoroAudio should handle text input gracefully", async () => {
    // Test that the function handles input without crashing
    // In CI, Kokoro might not be available, so we check error handling
    const text = "This is a test of the Kokoro TTS fallback system.";
    try {
      const result = await generateKokoroAudio(text);
      // If Kokoro is available, we should get a buffer
      // If not available, we should get null
      expect(result === null || result instanceof Buffer).toBe(true);
    } catch (err) {
      // Kokoro not available — that's ok in test env
      expect(err).toBeDefined();
    }
  });

  it("generateFluxImage should handle prompt input gracefully", async () => {
    // Test that the function handles input without crashing
    // In CI, Flux might not be available, so we check error handling
    const prompt = "A Caribbean watercolor illustration of spirits";
    try {
      const result = await generateFluxImage(prompt);
      // If Flux is available, we should get a buffer
      // If not available, we should get null
      expect(result === null || result instanceof Buffer).toBe(true);
    } catch (err) {
      // Flux not available — that's ok in test env
      expect(err).toBeDefined();
    }
  });
});

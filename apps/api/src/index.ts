import { mastra } from "./mastra";

const port = process.env.PORT || 3001;

console.log(`🌴 SandSync API starting on port ${port}`);
console.log(`🧙 Agents loaded: Papa Bois, Anansi, Ogma, Devi`);

// Health check endpoint
const server = Bun.serve({
  port: Number(port),
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return Response.json({
        status: "ok",
        agents: ["papaBois", "anansi", "ogma", "devi"],
        timestamp: new Date().toISOString(),
      });
    }

    if (url.pathname === "/agents") {
      return Response.json({
        agents: [
          { name: "Papa Bois", role: "orchestrator", model: "claude-haiku-4-5" },
          { name: "Anansi", role: "storyteller", model: "claude-haiku-4-5" },
          { name: "Ogma", role: "language-guardian", model: "qwen3:4b (local)" },
          { name: "Devi", role: "voice-audio", model: "claude-haiku-4-5" },
        ],
      });
    }

    return new Response("SandSync API — PowerSync AI Hackathon 2026", {
      status: 200,
    });
  },
});

console.log(`✅ SandSync API running at http://localhost:${port}`);

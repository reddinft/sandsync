import { Mastra } from "@mastra/core";
import { papaBois } from "./agents/papa-bois";
import { anansi } from "./agents/anansi";
import { ogma } from "./agents/ogma";
import { devi } from "./agents/devi";

/**
 * SandSync Mastra Instance
 *
 * The orchestration layer for the SandSync storytelling pipeline.
 * Four agents with distinct Caribbean/cultural identities collaborate
 * to write, review, and narrate stories.
 *
 * Pipeline: Papa Bois → Anansi → Ogma → Devi → PowerSync → Client
 */
export const mastra = new Mastra({
  agents: {
    papaBois,
    anansi,
    ogma,
    devi,
  },
});

export { papaBois, anansi, ogma, devi };

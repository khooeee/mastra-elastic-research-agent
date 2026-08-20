/**
 * Mastra registration - everything here appears in Studio (`npm run dev`).
 *
 * advanced-memory-agent - lab current-picture tracker: typed memories,
 * hybrid recall with time decay, plus live arXiv search.
 */
import { Mastra } from "@mastra/core";
import { Observability, MastraStorageExporter } from "@mastra/observability";
import { advancedMemoryAgent } from "./agents/advanced-agent";

export const mastra = new Mastra({
  agents: { advancedMemoryAgent },
  observability: new Observability({
    configs: {
      default: {
        serviceName: "research-agent",
        exporters: [new MastraStorageExporter()],
      },
    },
  }),
});

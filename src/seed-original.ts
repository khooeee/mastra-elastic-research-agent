/**
 * Reset this agent's memories and load the original lab picture:
 * RLHF, RAG-as-architecture, LoRA-for-every-finetune.
 *
 *   npm run seed:original
 */
import {
  AGENT_ID,
  LAB_FILE,
  bulkIndex,
  eraOf,
  loadMemories,
  resetAgentMemories,
} from "./seed-memories";

async function resetAndSeedOriginal(): Promise<void> {
  const all = await loadMemories(LAB_FILE);
  const memories = all.filter((m) => eraOf(m) === "original" || eraOf(m) === "both");
  const deleted = await resetAgentMemories();
  await bulkIndex(memories, "arxiv-lab-original");
  const maxAge = Math.max(...memories.map((m) => m.ageDays));
  console.log(`Reset ${AGENT_ID}: deleted ${deleted} old memories.`);
  console.log(`Seeded ${memories.length} original memories (backdated up to ${maxAge} days).`);
}

resetAndSeedOriginal().catch((err) => {
  console.error(err);
  process.exit(1);
});

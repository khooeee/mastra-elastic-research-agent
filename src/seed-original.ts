/**
 * Load the original lab picture:
 * RLHF, RAG-as-architecture, LoRA-for-every-finetune.
 * Does not delete existing memories — run `npm run reset` first if you want a wipe.
 *
 *   npm run seed:original
 */
import { bulkIndex, loadMemories } from "./seed-memories";

async function seedOriginal(): Promise<void> {
  const memories = await loadMemories("./sample-data/original.json");
  await bulkIndex(memories, "arxiv-lab-original");
  const maxAge = Math.max(...memories.map((m) => m.ageDays));
  console.log(`Appended ${memories.length} memories`);
}

seedOriginal().catch((err) => {
  console.error(err);
  process.exit(1);
});

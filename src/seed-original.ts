/**
 * Load the original lab picture:
 * RLHF, RAG-as-architecture, LoRA-for-every-finetune.
 * Does not delete existing memories — run `npm run reset` first if you want a wipe.
 *
 *   npm run seed:original
 */
import { ORIGINAL_FILE, bulkIndex, loadMemories } from "./seed-memories";

async function seedOriginal(): Promise<void> {
  const memories = await loadMemories(ORIGINAL_FILE);
  await bulkIndex(memories, "arxiv-lab-original");
  const maxAge = Math.max(...memories.map((m) => m.ageDays));
  console.log(`Seeded ${memories.length} original memories (backdated up to ${maxAge} days).`);
}

seedOriginal().catch((err) => {
  console.error(err);
  process.exit(1);
});

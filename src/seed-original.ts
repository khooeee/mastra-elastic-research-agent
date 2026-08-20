/**
 * Load the original lab picture:
 * RLHF, RAG-as-architecture, LoRA-for-every-finetune.
 * Does not delete existing memories — run `npm run reset` first if you want a wipe.
 *
 *   npm run seed:original
 */
import { LAB_FILE, bulkIndex, eraOf, loadMemories } from "./seed-memories";

async function seedOriginal(): Promise<void> {
  const all = await loadMemories(LAB_FILE);
  const memories = all.filter((m) => eraOf(m) === "original" || eraOf(m) === "both");
  await bulkIndex(memories, "arxiv-lab-original");
  const maxAge = Math.max(...memories.map((m) => m.ageDays));
  console.log(`Appended ${memories.length} memories (backdated up to ${maxAge} days).`);
}

seedOriginal().catch((err) => {
  console.error(err);
  process.exit(1);
});

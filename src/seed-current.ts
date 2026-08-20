/**
 * Append reversal notes on top of the original lab picture.
 * Does not delete existing memories.
 *
 *   npm run seed:original   # once
 *   npm run seed:current    # later: GRPO, long context, full-finetune
 */
import { bulkIndex, loadMemories } from "./seed-memories";

async function seedReversals(): Promise<void> {
  const memories = await loadMemories("./sample-data/current.json");
  await bulkIndex(memories, "arxiv-lab-current");
  const maxAge = Math.max(...memories.map((m) => m.ageDays));
  console.log(`Appended ${memories.length} memories`);
}

seedReversals().catch((err) => {
  console.error(err);
  process.exit(1);
});

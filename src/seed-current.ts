/**
 * Append reversal notes on top of the original lab picture.
 * Does not delete existing memories.
 *
 *   npm run seed:original   # once
 *   npm run seed:current    # later: GRPO, long context, full-finetune
 */
import { seedReversals } from "./seed-memories";

seedReversals().catch((err) => {
  console.error(err);
  process.exit(1);
});

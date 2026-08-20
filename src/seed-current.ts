/**
 * Reset this agent's memories and load the current lab picture:
 * GRPO/RLVR, long context + memory, full-finetune the 70B.
 *
 *   npm run seed:current
 */
import { resetAndSeedPicture } from "./seed-memories";

resetAndSeedPicture("current").catch((err) => {
  console.error(err);
  process.exit(1);
});

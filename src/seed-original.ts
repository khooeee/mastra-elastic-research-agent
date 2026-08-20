/**
 * Reset this agent's memories and load the original lab picture:
 * RLHF, RAG-as-architecture, LoRA-for-every-finetune.
 *
 *   npm run seed:original
 */
import { resetAndSeedPicture } from "./seed-memories";

resetAndSeedPicture("original").catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * seed-sample.ts - seed the agent-memory index from a JSON file.
 *
 *   npx tsx src/seed-sample.ts --file ./sample-data/arxiv-lab.json
 *   npx tsx src/seed-sample.ts --file ./sample-data/arxiv-lab.json --reset
 *
 * --reset wipes this AGENT_ID first. Prefer `npm run seed:original` /
 * `npm run seed:current` to load one lab picture instead of both.
 *
 * Dataset format:
 *
 *   {
 *     "era": "original" | "current" | "both",   // optional; ignored here
 *     "type": "decision" | "pattern" | "context" | "feedback",
 *     "title": "...",
 *     "content": "...",
 *     "tags": ["..."],
 *     "ageDays": 305
 *   }
 *
 * Run `npm run setup` first (creates the index).
 */
import { seedFromFile } from "./seed-memories";

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const file = arg("file");
  if (!file) {
    console.error("Usage: npx tsx src/seed-sample.ts --file ./sample-data/arxiv-lab.json [--reset]");
    process.exit(1);
  }

  await seedFromFile(file, { reset: hasFlag("reset") });
  console.log("Now ask the advanced-memory-agent something the dataset reverses - then tune BRIDGE_MEMORY_DECAY_WINDOW.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

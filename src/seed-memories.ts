/**
 * Shared Elasticsearch seed from sample-data/arxiv-lab.json.
 *
 *   seed:original — wipe this AGENT_ID, load original thinking + shared patterns
 *   seed:current  — do not wipe; append reversal notes (era: current)
 *
 * Run `npm run setup` first.
 */
import { Client } from "@elastic/elasticsearch";
import { readFile } from "node:fs/promises";
import "dotenv/config";

const es = new Client({
  node: process.env.ELASTICSEARCH_URL!,
  auth: { apiKey: process.env.ELASTICSEARCH_API_KEY! },
});

const AGENT_ID = process.env.AGENT_ID ?? "mastra-agent";
const INDEX = "agent-memory";
const LAB_FILE = "./sample-data/arxiv-lab.json";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

export type Era = "original" | "current" | "both";

export type Mem = {
  era?: Era;
  type: "decision" | "pattern" | "context" | "feedback";
  title: string;
  content: string;
  tags: string[];
  ageDays: number;
};

function eraOf(m: Mem): Era {
  return m.era ?? "both";
}

async function loadMemories(file: string): Promise<Mem[]> {
  const memories = JSON.parse(await readFile(file, "utf8")) as Mem[];
  const bad = memories.filter(
    (m) => !m.title || !m.content || typeof m.ageDays !== "number" ||
      !["decision", "pattern", "context", "feedback"].includes(m.type)
  );
  if (bad.length > 0) {
    throw new Error(
      `${bad.length} entries are missing type/title/content/ageDays - first bad title: ${bad[0]?.title ?? "(none)"}`,
    );
  }
  return memories;
}

async function resetAgentMemories(): Promise<number> {
  const result = await es.deleteByQuery({
    index: INDEX,
    query: { term: { agent: AGENT_ID } },
    refresh: true,
  });
  return result.deleted ?? 0;
}

async function bulkIndex(memories: Mem[], dataset: string): Promise<void> {
  const operations = memories.flatMap((m, i) => {
    const created = daysAgo(m.ageDays);
    const id = `${AGENT_ID}-${dataset}-${String(i).padStart(3, "0")}`;
    return [
      { index: { _index: INDEX, _id: id } },
      {
        memory_id: id,
        agent: AGENT_ID,
        type: m.type,
        title: m.title,
        title_semantic: m.title,
        content: m.content,
        content_semantic: m.content,
        tags: m.tags ?? [],
        source: `seed:${dataset}`,
        created_at: created,
        updated_at: created,
        access_scope: "shared",
      },
    ];
  });

  const result = await es.bulk({ operations, refresh: true });
  if (result.errors) {
    const failed = result.items.filter((i: { index?: { error?: unknown } }) => i.index?.error);
    throw new Error(`Some documents failed: ${JSON.stringify(failed, null, 2)}`);
  }
}

/** Wipe this AGENT_ID, then load original standing decisions + shared patterns. */
export async function resetAndSeedOriginal(): Promise<void> {
  const all = await loadMemories(LAB_FILE);
  const memories = all.filter((m) => eraOf(m) === "original" || eraOf(m) === "both");
  const deleted = await resetAgentMemories();
  await bulkIndex(memories, "arxiv-lab-original");
  const maxAge = Math.max(...memories.map((m) => m.ageDays));
  console.log(`Reset ${AGENT_ID}: deleted ${deleted} old memories.`);
  console.log(`Seeded ${memories.length} original memories (backdated up to ${maxAge} days).`);
}

/** Append reversal notes only. Leaves original thinking in place. */
export async function seedReversals(): Promise<void> {
  const all = await loadMemories(LAB_FILE);
  const memories = all.filter((m) => eraOf(m) === "current");
  await bulkIndex(memories, "arxiv-lab-current");
  const maxAge = Math.max(...memories.map((m) => m.ageDays));
  console.log(`Appended ${memories.length} reversal memories (backdated up to ${maxAge} days). Original notes were left in place.`);
}

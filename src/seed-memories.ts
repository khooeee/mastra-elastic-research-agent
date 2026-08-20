/**
 * Shared Elasticsearch helpers for the lab seeds.
 * Run `npm run setup` first.
 */
import { Client } from "@elastic/elasticsearch";
import { readFile } from "node:fs/promises";
import "dotenv/config";

const es = new Client({
  node: process.env.ELASTICSEARCH_URL!,
  auth: { apiKey: process.env.ELASTICSEARCH_API_KEY! },
});

export const AGENT_ID = process.env.AGENT_ID ?? "mastra-agent";
export const ORIGINAL_FILE = "./sample-data/original.json";
export const CURRENT_FILE = "./sample-data/current.json";

const INDEX = "agent-memory";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

export type Mem = {
  type: "decision" | "pattern" | "context" | "feedback";
  title: string;
  content: string;
  tags: string[];
  ageDays: number;
};

export async function loadMemories(file: string): Promise<Mem[]> {
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

export async function resetAgentMemories(): Promise<number> {
  const result = await es.deleteByQuery({
    index: INDEX,
    query: { term: { agent: AGENT_ID } },
    refresh: true,
  });
  return result.deleted ?? 0;
}

export async function bulkIndex(memories: Mem[], dataset: string): Promise<void> {
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

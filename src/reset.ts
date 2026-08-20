/**
 * Wipe this AGENT_ID's Elasticsearch memories and this agent's Mastra
 * working memory (resource-scoped). Does not seed. Does not delete memory.db.
 *
 *   npm run reset
 *   npm run seed:original
 *
 * Restart `npm run dev` if Studio is running so it reloads working memory.
 */
import { existsSync } from "node:fs";
import { createClient } from "@libsql/client";
import { LibSQLStore } from "@mastra/libsql";
import { AGENT_ID, resetAgentMemories } from "./seed-memories";

const MASTRA_AGENT_ID = "advanced-memory-agent";

const DB_CANDIDATES = ["src/mastra/public/memory.db", "memory.db"];

async function hasMastraResources(dbFile: string): Promise<boolean> {
  const client = createClient({ url: `file:${dbFile}` });
  try {
    const rs = await client.execute(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'mastra_resources'",
    );
    return rs.rows.length > 0;
  } finally {
    client.close();
  }
}

async function resetMastraAgentMemory(): Promise<void> {
  const dbFile = DB_CANDIDATES.find((p) => existsSync(p));
  if (!dbFile) {
    console.log("No Studio memory.db found.");
    return;
  }

  if (!(await hasMastraResources(dbFile))) {
    console.log(
      `${dbFile} has no mastra_resources table (empty or Studio not initialized). Skipping local agent memory.`,
    );
    return;
  }

  const store = new LibSQLStore({
    id: "reset-memory",
    url: `file:${dbFile}`,
    disableInit: true,
  });

  try {
    const memory = await store.getStore("memory");
    if (!memory) {
      console.log(`Opened ${dbFile} but found no memory store.`);
      return;
    }

    const resource = await memory.getResourceById({ resourceId: MASTRA_AGENT_ID });
    if (resource) {
      await memory.updateResource({ resourceId: MASTRA_AGENT_ID, workingMemory: "" });
    }

    const { threads } = await memory.listThreads({
      perPage: false,
      filter: { resourceId: MASTRA_AGENT_ID },
    });
    for (const thread of threads) {
      await memory.deleteThread({ threadId: thread.id });
    }

    console.log(
      `Cleared Mastra working memory for ${MASTRA_AGENT_ID} in ${dbFile}` +
        (threads.length > 0 ? ` (${threads.length} threads).` : "."),
    );
  } finally {
    await store.close();
  }
}

async function reset(): Promise<void> {
  const deleted = await resetAgentMemories();
  console.log(`Reset ${AGENT_ID}: deleted ${deleted} Elasticsearch memories.`);
  await resetMastraAgentMemory();
  console.log("Restart Studio if it is running so working memory reloads empty.");
}

reset().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * advanced-agent.ts - the ADVANCED tier: episodic, time-aware memory.
 *
 * The tools are already built (src/mastra/tools/memory-tools.ts):
 *   remember - stores typed memories (decision/pattern/context/feedback)
 *   recall   - hybrid retrieval: FORK (BM25 + semantic) → FUSE → DECAY,
 *              so recent memories outrank stale ones.
 * Conversation memory (Mastra lastMessages + workingMemory) is layered on
 * top; movie-rec-* agents stay memory-free. Dataset: sample-data/arxiv-lab.json
 * (planted method reversals). Live papers: search_arxiv.
 *
 * YOUR work is the data (something with a shift or reversal) and the TUNING:
 *   BRIDGE_MEMORY_DECAY_WINDOW      - recency half-life (days)
 *   FUSION_STRATEGY / FUSION_BM25_WEIGHT - keyword vs semantic balance
 *   the ES|QL branches in memory-tools.ts
 *   ...and these instructions (memory discipline is tuning too).
 */
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { remember, recall } from "../tools/memory-tools";
import { searchArxiv } from "../tools/arxiv-tools";
import "dotenv/config";

const memory = new Memory({
  storage: new LibSQLStore({
    id: "memory-storage",
    url: "file:./memory.db",
  }),
  options: {
    lastMessages: 10,
    workingMemory: {
      enabled: true,
      template: `# Lab researcher
- Name:
- Current bets (alignment / adaptation / knowledge):
- Papers in flight this week:
- Open questions:
`,
    },
  },
});

export const advancedMemoryAgent = new Agent({
  id: "advanced-memory-agent",
  name: "advanced-memory-agent",
  instructions: `You are a research current-picture tracker for a small ML lab. You keep what the lab currently believes about papers and methods, and you fetch new arXiv work that fits that picture.

Two memory layers:
- Conversation (Mastra): recent chat turns and a working user profile persist in this thread.
- Episodic (Elasticsearch remember/recall): lab decisions, patterns, already-read papers, and reversals. Recall is recency-weighted: newer memories outrank stale ones.

How to work:
- At the START of a task, call recall (e.g. the topic, method, or arXiv id). If memories CONFLICT, prefer the most recent and say so ("the earlier LoRA-default decision was superseded").
- Live papers come from search_arxiv. Pass already-read arXiv ids in excludeIds. Do not recommend a paper the lab already consumed.
- When recommending reading, respect lab patterns (cs.LG/cs.CL, code-or-eval required) and the CURRENT decisions, not the superseded ones.
- When the user makes a decision, states a durable preference, flags a paper as read, or reports a failed replication, call remember with type decision | pattern | context | feedback and tags (include arXiv ids when you have them).
- Cite naturally ("Eighteen days ago you switched alignment to GRPO after DeepSeek-R1") rather than dumping raw results.
- Do not store trivia; store what a future session would need to know is still true.`,
  // maxOutputTokens capped so OpenRouter's credit pre-authorization doesn't
  // reject requests on small provisioned keys.
  model: [
    {
      model: "openrouter/anthropic/claude-sonnet-4.6",
      modelSettings: { maxOutputTokens: 4096 },
    },
  ],
  tools: { remember, recall, searchArxiv },
  memory,
});

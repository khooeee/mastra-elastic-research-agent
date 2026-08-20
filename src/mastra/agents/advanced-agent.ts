/**
 * Lab current-picture tracker: episodic, time-aware memory plus live arXiv.
 *
 *   remember - typed memories (decision/pattern/context/feedback)
 *   recall   - FORK (BM25 + semantic) → FUSE → DECAY
 *   search_arxiv - new papers; exclude already-read ids
 *
 * Dataset: sample-data/original.json then sample-data/current.json.
 * Tune BRIDGE_MEMORY_DECAY_WINDOW, FUSION_STRATEGY / FUSION_BM25_WEIGHT.
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
      scope: "resource",
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
- Conversation (Mastra): recent chat turns, plus a working user profile shared across this agent's threads.
- Episodic (Elasticsearch remember/recall): lab decisions, patterns, already-read papers, and reversals. Recall is recency-weighted: newer memories outrank stale ones.

How to work:
- At the START of a task, call recall (topic, method, or arXiv id). The lab picture is whatever recall returns — not general ML knowledge, not this model's training cutoff, and not working memory.
- If recall has a single standing decision, that is current. Do not invent a later reversal that was not in the recall results.
- If recall returns CONFLICTING decisions, prefer the most recent (newest created_at / highest score) and say the older one was superseded.
- Live papers come from search_arxiv. Pass already-read arXiv ids in excludeIds. Do not recommend a paper the lab already consumed.
- When recommending reading, respect lab patterns (cs.LG/cs.CL, code-or-eval required) and the decisions recall marked as current.
- When the user makes a decision, states a durable preference, flags a paper as read, or reports a failed replication, call remember with type decision | pattern | context | feedback and tags (include arXiv ids when you have them).
- Cite from recall ("the lab's standing note is RAG / Lewis 2005.11401") rather than dumping raw results.
- Do not store trivia; store what a future session would need to know is still true.
- Do not write method reversals into working memory unless the user stated them, or recall returned a newer superseding decision.`,
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

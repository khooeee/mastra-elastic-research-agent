# Research agent — current-picture tracker

A Mastra agent that tracks **what the lab currently believes** about papers and methods. Lab notes live in Elasticsearch with recency-weighted recall; new papers come from arXiv.

Memories are not the papers themselves. They are notes on them: decisions, patterns, already-read IDs, failed replications. When beliefs flip, decay makes the newer note win.

## How it works

- **`remember` / `recall`** (`src/mastra/tools/memory-tools.ts`) — typed memories in `agent-memory`. Recall is one ES|QL query: **FORK** (BM25 + semantic) → **FUSE** → **DECAY**.
- **`search_arxiv`** (`src/mastra/tools/arxiv-tools.ts`) — live catalog. Pass already-read IDs in `excludeIds`.
- **Conversation memory** — Mastra lastMessages + working memory on `advanced-memory-agent`.

Requires Elasticsearch Serverless or 9.3+ (`DECAY` / `FUSE`) and Node 20.20+.

## Setup

```bash
npm install
cp .env.example .env   # ELASTICSEARCH_URL, ELASTICSEARCH_API_KEY, OPENROUTER_API_KEY, AGENT_ID
npm run setup
npm run seed:sample -- --file ./sample-data/arxiv-lab.json
npm run dev
```

Studio: http://localhost:4111 → `advanced-memory-agent`. Use a **fresh thread** for each before/after so chat history does not leak the first answer.

### Break-it questions (same ask, tune decay)

| Ask | Stale (wide window / no decay) | Current (~45-day window) |
|---|---|---|
| How should we align the model? | RLHF / InstructGPT 2203.02155 | GRPO / RLVR, DeepSeek-R1 2501.12948 |
| How do we give the model knowledge? | RAG as the architecture | Long context first; memory tools; RAG only for huge corpora |
| How should we adapt this model? | LoRA for every finetune | Full finetune the 70B; LoRA for prototypes |

Decay flip: `.env` `BRIDGE_MEMORY_DECAY_WINDOW=45` → `180`, restart Studio, same question.

## Tuning

- `BRIDGE_MEMORY_DECAY_WINDOW` — recency half-life in days
- `FUSION_STRATEGY` / `FUSION_BM25_WEIGHT` — keyword vs semantic
- ES|QL branches in `memory-tools.ts`
- Instructions in `advanced-agent.ts`

Lab notes JSON is `{type, title, content, tags, ageDays}` with `type` one of `decision | pattern | context | feedback`. Give superseded entries longer rationale so undecayed recall confidently returns the stale answer.

## Troubleshooting

- Studio spinner never resolves → check the `npm run dev` terminal (often OpenRouter 402).
- `DECAY(...)` type error → third arg must be a `time_duration` (`1080 hours`); tools convert day knobs to hours.
- `semantic_text` errors on self-managed ES → create a Jina inference endpoint and set `INFERENCE_ID`.
- Recall empty right after remember → tools use `refresh: "wait_for"`; keep it.

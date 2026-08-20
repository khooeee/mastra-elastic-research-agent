ela.st/memory

ela.st/openrouter

https://arxiv.org/list/cs.LG/recent

https://github.com/jdarmada/agent-memory-hacknight

---

## Built

Lab notes in `sample-data/arxiv-lab.json` (not the papers themselves). Live arXiv via `search_arxiv`.

```bash
npm run setup
npm run seed:sample -- --file ./sample-data/arxiv-lab.json
```

Studio: http://localhost:4111 → `advanced-memory-agent`. **Fresh thread** for each before/after.

### Break-it questions (same ask, tune decay)

| Ask | Stale (wide window / no decay) | Current (~45-day window) |
|---|---|---|
| How should we align the model? | RLHF / InstructGPT 2203.02155 | GRPO / RLVR, DeepSeek-R1 2501.12948 |
| How do we give the model knowledge? | RAG as the architecture | Long context first; memory tools; RAG only for huge corpora |
| How should we adapt this model? | LoRA for every finetune | Full finetune the 70B; LoRA for prototypes |

Decay flip: `.env` `BRIDGE_MEMORY_DECAY_WINDOW=45` → `180`, restart Studio, same question.

### Reversals

- RLHF (310d, long) → GRPO (18d)
- RAG (290d, long) → long context + memory (28d)
- LoRA default (330d, long) → full finetune (35d)

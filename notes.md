ela.st/memory

ela.st/openrouter

https://arxiv.org/list/cs.LG/recent

https://github.com/jdarmada/agent-memory-hacknight

---

### Questions

npm run seed:original

How do we give the model knowledge?

npm run seed:current

How should we adapt this model?
How should we align the model?

## Built

Lab notes in `sample-data/arxiv-lab.json` (not the papers themselves). Live arXiv via `search_arxiv`.

```bash
npm run setup
npm run seed:original   # wipe + RLHF / RAG / LoRA
# ask the questions, then:
npm run seed:current    # append reversals (does not delete)
```

Studio: http://localhost:4111 → `advanced-memory-agent`. **Fresh thread** after `seed:current`.

### Break-it questions (same ask; current = original + reversals)

| Ask | `seed:original` | `seed:current` |
|---|---|---|
| How should we align the model? | RLHF / InstructGPT 2203.02155 | GRPO / RLVR, DeepSeek-R1 2501.12948 |
| How do we give the model knowledge? | RAG as the architecture | Long context first; memory tools; RAG only for huge corpora |
| How should we adapt this model? | LoRA for every finetune | Full finetune the 70B; LoRA for prototypes |

### Reversals

- RLHF (310d, long) → GRPO (18d)
- RAG (290d, long) → long context + memory (28d)
- LoRA default (330d, long) → full finetune (35d)

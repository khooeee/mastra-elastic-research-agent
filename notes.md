ela.st/memory

ela.st/openrouter

https://arxiv.org/list/cs.LG/recent

https://github.com/jdarmada/agent-memory-hacknight

---

### Questions

https://my-elasticsearch-project-e10d02.kb.us-west-2.aws.elastic.cloud/app/discover#/?_tab=(tabId:c272fdca-7660-47e7-a8df-9ca43bcebaa0)&_g=(filters:!(),refreshInterval:(pause:!t,value:60000),time:(from:now-15m,to:now))&_a=(dataSource:(type:esql),filters:!(),interval:auto,query:(esql:''),sort:!())

FROM agent-memory
| WHERE agent == "team-khooeee"
| STATS count = COUNT(*) BY source
| SORT source

npm run reset

npm run seed:original

npm run dev

How do we provide agents with knowledge these days?

How should we finetune models?

npm run seed:current

---

How should we align the model?

## Built

Lab notes in `sample-data/original.json` and `sample-data/current.json` (not the papers themselves). Live arXiv via `search_arxiv`.

```bash
npm run setup
npm run reset
npm run seed:original   # RLHF / RAG / LoRA
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

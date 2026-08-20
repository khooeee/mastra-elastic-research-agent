A paper search box is not that useful. What is useful is an agent that tracks **your current research picture** — what you already believe, what you already read, and which of those beliefs are now stale.

The memory project only pays off if some of those beliefs **flip**. Three versions that actually help:

**1. Current-picture tracker (best fit)**
You ask: *“What’s the current story on test-time compute / diffusion / LoRA?”*
Memories are not the papers themselves. They are *your notes on them*:

- `decision` — “RLHF is how we align” (age ~280, long convincing writeup)
- `decision` + `supersedes` — “RLVR / GRPO superseded RLHF for this lab” (age ~20, shorter)
- `pattern` — you always read cs.LG + cs.CL, skip theory
- `feedback` — “this paper didn’t replicate; don’t keep citing it”
- `context` — already-read IDs so tonight’s recs exclude them

Without decay, the long old note wins. With a ~45-day window, the reversal wins. Same question, before/after, trace visible. That is the demo.

**2. Taste-shifted reading list (movie demo, for papers)**
Six months of LLM-alignment papers rated high, then a recent kick into world models / agents. *“What should I read this week?”*
`TASTE_DECAY_DAYS=180` → stale-you. `21` → current-you. Useful weekly, slightly gimmicky on stage.

**3. Claim ledger**
One memory per claim (“SOTA on GSM8K is X”), later memories mark it superseded. Useful as a lab wiki, more bookkeeping than an agent.

I’d build **#1** on `advanced-memory-agent` plus a thin arXiv fetch for *new* papers, with Elasticsearch holding the decaying notes. The arXiv list is the catalog; memory is “what I currently think is true.”

Plant 2–3 reversals that are real in 2026, for example:

| Old (long, ~300 days) | New (short, ~2–6 weeks) |
|---|---|
| Scale pretraining is enough | Test-time compute / reasoning models |
| RAG is how we give models knowledge | Long context + memory tools |
| LoRA for every finetune | Full finetune / different PEFT, or “LoRA still, but only for X” |

The break-it question is the old title: *“How should we adapt this model?”* Undecayed recall says LoRA with a paragraph of rationale. Tuned decay says the newer decision.

If that picture is right, next step is a `sample-data/arxiv-lab.json` with those reversals and a couple of already-read `context` entries — same shape as the coffee shop file.

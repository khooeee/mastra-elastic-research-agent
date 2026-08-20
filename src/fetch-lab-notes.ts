/**
 * Fetch today's cs.LG + cs.CL papers from arXiv, write lab notes to
 * sample-data/YYYY-MM-DD.json, and ingest them into Elasticsearch.
 *
 *   npm run notes:today
 *   npm run notes:today -- --date 2026-08-18
 *   npm run notes:today -- --limit 15
 *
 * Dates follow arXiv's US Eastern announcement day. Re-running replaces
 * that day's ingested notes (does not wipe original/current memories).
 */
import { mkdir, writeFile } from "node:fs/promises";
import { arxivToday, fetchMlPapersForDate, type Paper } from "./mastra/arxiv";
import { AGENT_ID, ingestMemories, type Mem } from "./seed-memories";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function ageDaysOn(ymd: string): number {
  const day = Date.parse(`${ymd}T00:00:00Z`);
  const today = Date.parse(`${arxivToday()}T00:00:00Z`);
  return Math.max(0, Math.round((today - day) / 86_400_000));
}

function paperToNote(paper: Paper, ymd: string): Mem {
  const authors = paper.authors.length > 0 ? paper.authors.join(", ") : "unknown";
  return {
    type: "context",
    title: `arXiv ${paper.id}: ${paper.title}`,
    content:
      `Daily scan ${ymd}. ${authors}. Category ${paper.category || "cs.LG"}. ` +
      `${paper.summary} ${paper.url}`,
    tags: ["arxiv", "daily", ymd, paper.category || "cs.LG", paper.id],
    ageDays: ageDaysOn(ymd),
  };
}

async function main(): Promise<void> {
  const ymd = arg("date") ?? arxivToday();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    throw new Error(`--date must be YYYY-MM-DD (got ${ymd})`);
  }
  const limit = Number(arg("limit") ?? 15);
  const cap = Number.isFinite(limit) ? limit : 15;
  const eastern = arxivToday();
  console.log(`Date: ${ymd} (arXiv Eastern today is ${eastern})`);
  console.log(`Categories: cs.LG, cs.CL  |  limit: ${cap}`);

  console.log("Querying arXiv…");
  const { papers, usedFallback, datedHits, recentHits, datedQuery } =
    await fetchMlPapersForDate(ymd, cap);
  console.log(`Query: ${datedQuery}`);
  console.log(`Dated API hits: ${datedHits} (${datedHits === 0 ? "none on submittedDate" : "kept those published on " + ymd})`);
  if (usedFallback) {
    console.log(`Fallback: pulled ${recentHits} recent papers, filtered to published == ${ymd}`);
  }

  const notes = papers.map((p) => paperToNote(p, ymd));
  if (notes.length === 0) {
    console.log("No cs.LG/cs.CL papers for that date yet (arXiv may still be announcing).");
    return;
  }

  const byCat = new Map<string, number>();
  for (const p of papers) {
    const cat = p.category || "unknown";
    byCat.set(cat, (byCat.get(cat) ?? 0) + 1);
  }
  console.log(`Keeping ${papers.length} papers: ${[...byCat.entries()].map(([c, n]) => `${c}×${n}`).join(", ")}`);
  for (const p of papers) {
    console.log(`  ${p.id}  ${p.published}  ${(p.category || "?").padEnd(6)}  ${p.title}`);
  }

  const out = `./sample-data/${ymd}.json`;
  await mkdir("./sample-data", { recursive: true });
  await writeFile(out, `${JSON.stringify(notes, null, 2)}\n`);
  console.log(`Wrote ${notes.length} lab notes to ${out} (ageDays=${ageDaysOn(ymd)})`);

  const dataset = `daily-${ymd}`;
  console.log(`Ingesting into Elasticsearch index agent-memory as agent=${AGENT_ID} source=seed:${dataset}…`);
  const { deleted, indexed } = await ingestMemories(notes, dataset);
  console.log(`Replaced ${deleted} prior notes for this day; indexed ${indexed}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

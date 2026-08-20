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
import { ingestMemories, type Mem } from "./seed-memories";

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
  const papers = await fetchMlPapersForDate(ymd, Number.isFinite(limit) ? limit : 15);
  const notes = papers.map((p) => paperToNote(p, ymd));
  const out = `./sample-data/${ymd}.json`;
  await mkdir("./sample-data", { recursive: true });
  await writeFile(out, `${JSON.stringify(notes, null, 2)}\n`);
  console.log(`Wrote ${notes.length} lab notes to ${out}`);
  if (notes.length === 0) {
    console.log("No cs.LG/cs.CL papers for that date yet (arXiv may still be announcing).");
    return;
  }
  await ingestMemories(notes, `daily-${ymd}`);
  console.log(`Ingested ${notes.length} notes into Elasticsearch (source seed:daily-${ymd}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

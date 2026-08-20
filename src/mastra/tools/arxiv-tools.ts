/**
 * arxiv-tools.ts - live catalog for the current-picture tracker.
 *
 * Lab notes (decisions, reversals, already-read) live in Elasticsearch.
 * This tool is the other half: what arXiv is publishing *now*.
 *
 * GET https://export.arxiv.org/api/query  (Atom)
 */
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const ARXIV_API = "https://export.arxiv.org/api/query";

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : "";
}

function authors(block: string): string[] {
  const names: string[] = [];
  for (const m of block.matchAll(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/gi)) {
    names.push(decode(m[1]));
  }
  return names;
}

function arxivId(idUrl: string): string {
  const m = idUrl.match(/(\d{4}\.\d{4,5})(v\d+)?/);
  return m ? m[1] : idUrl;
}

type Paper = {
  id: string;
  title: string;
  authors: string[];
  published: string;
  summary: string;
  url: string;
  category: string;
};

function parseAtom(xml: string): Paper[] {
  const entries = xml.split("<entry>").slice(1);
  return entries.map((raw) => {
    const block = raw.split("</entry>")[0] ?? raw;
    const idUrl = tag(block, "id");
    const id = arxivId(idUrl);
    const category =
      block.match(/term="([^"]+)"/)?.[1] ??
      tag(block, "arxiv:primary_category") ??
      "";
    return {
      id,
      title: tag(block, "title"),
      authors: authors(block).slice(0, 8),
      published: tag(block, "published").slice(0, 10),
      summary: tag(block, "summary").slice(0, 600),
      url: `https://arxiv.org/abs/${id}`,
      category,
    };
  }).filter((p) => p.id && p.title);
}

export const searchArxiv = createTool({
  id: "search_arxiv",
  description:
    "Search live arXiv papers (title, abstract, authors, id). Use after recall " +
    "so recommendations fit the CURRENT lab picture and skip already-read ids. " +
    "Pass an arXiv id (e.g. 2501.12948) to look up one paper.",
  inputSchema: z.object({
    query: z.string().describe("Search terms, or an arXiv id like 2501.12948"),
    category: z.string().default("cs.LG").describe("arXiv category, e.g. cs.LG or cs.CL"),
    excludeIds: z.array(z.string()).default([]).describe("Already-read arXiv ids to drop"),
    limit: z.number().min(1).max(10).default(5),
  }),
  outputSchema: z.object({
    papers: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        authors: z.array(z.string()),
        published: z.string(),
        summary: z.string(),
        url: z.string(),
        category: z.string(),
      })
    ),
  }),
  execute: async (input) => {
    const q = input.query.trim();
    const isId = /^\d{4}\.\d{4,5}(v\d+)?$/.test(q);
    const params = new URLSearchParams(
      isId
        ? { id_list: q.replace(/v\d+$/, "") }
        : {
            search_query: `cat:${input.category} AND all:${q}`,
            start: "0",
            max_results: String(Math.min(input.limit + input.excludeIds.length, 20)),
            sortBy: "submittedDate",
            sortOrder: "descending",
          }
    );

    const res = await fetch(`${ARXIV_API}?${params}`, {
      headers: { "User-Agent": "mastra-elastic-research-agent/1.0 (mailto:research@local)" },
    });
    const xml = await res.text();
    if (!res.ok || xml.startsWith("Rate exceeded")) {
      throw new Error(
        xml.startsWith("Rate exceeded")
          ? "arXiv rate limit - wait a few seconds and retry"
          : `arXiv API ${res.status}: ${xml.slice(0, 200)}`
      );
    }

    const papers = parseAtom(xml)
      .filter((p) => !input.excludeIds.includes(p.id))
      .slice(0, input.limit);

    return { papers };
  },
});

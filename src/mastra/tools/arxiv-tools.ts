/**
 * arxiv-tools.ts - live catalog for the current-picture tracker.
 *
 * Lab notes live in Elasticsearch. This tool is what arXiv is publishing *now*.
 */
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { queryArxiv } from "../arxiv";

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

    const { papers } = await queryArxiv(params);
    return {
      papers: papers
        .filter((p) => !input.excludeIds.includes(p.id))
        .slice(0, input.limit),
    };
  },
});

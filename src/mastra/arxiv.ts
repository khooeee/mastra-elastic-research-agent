/**
 * arXiv Atom API client (export.arxiv.org).
 */
export const ARXIV_API = "https://export.arxiv.org/api/query";
export const USER_AGENT = "mastra-elastic-research-agent/1.0 (mailto:research@local)";

export type Paper = {
  id: string;
  title: string;
  authors: string[];
  published: string;
  summary: string;
  url: string;
  category: string;
};

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

export function parseAtom(xml: string): Paper[] {
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
      summary: tag(block, "summary").slice(0, 800),
      url: `https://arxiv.org/abs/${id}`,
      category,
    };
  }).filter((p) => p.id && p.title);
}

export async function queryArxiv(params: URLSearchParams): Promise<{ papers: Paper[]; url: string }> {
  const url = `${ARXIV_API}?${params}`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });
  const xml = await res.text();
  if (!res.ok || xml.startsWith("Rate exceeded")) {
    throw new Error(
      xml.startsWith("Rate exceeded")
        ? "arXiv rate limit - wait a few seconds and retry"
        : `arXiv API ${res.status}: ${xml.slice(0, 200)}`,
    );
  }
  return { papers: parseAtom(xml), url };
}

/** arXiv announcement day is US Eastern. en-CA yields YYYY-MM-DD. */
export function arxivToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

function ymdToStamp(ymd: string, endOfDay: boolean): string {
  const compact = ymd.replaceAll("-", "");
  return endOfDay ? `${compact}2359` : `${compact}0000`;
}

/**
 * cs.LG + cs.CL papers whose submittedDate falls on `ymd` (YYYY-MM-DD).
 * Falls back to a recent pull filtered by published date if the range query is empty
 * (common around timezone / announcement lag).
 */
export async function fetchMlPapersForDate(
  ymd: string,
  limit: number,
): Promise<{
  papers: Paper[];
  usedFallback: boolean;
  datedHits: number;
  recentHits: number;
  datedQuery: string;
  datedUrl: string;
  fallbackUrl?: string;
}> {
  const cats = "(cat:cs.LG OR cat:cs.CL)";
  const range = `submittedDate:[${ymdToStamp(ymd, false)} TO ${ymdToStamp(ymd, true)}]`;
  const datedQuery = `${cats} AND ${range}`;
  const dated = await queryArxiv(
    new URLSearchParams({
      search_query: datedQuery,
      start: "0",
      max_results: String(Math.min(limit, 100)),
      sortBy: "submittedDate",
      sortOrder: "descending",
    }),
  );
  const onDay = dated.papers.filter((p) => p.published === ymd);
  if (onDay.length > 0) {
    return {
      papers: onDay.slice(0, limit),
      usedFallback: false,
      datedHits: dated.papers.length,
      recentHits: 0,
      datedQuery,
      datedUrl: dated.url,
    };
  }

  const recent = await queryArxiv(
    new URLSearchParams({
      search_query: cats,
      start: "0",
      max_results: "100",
      sortBy: "submittedDate",
      sortOrder: "descending",
    }),
  );
  return {
    papers: recent.papers.filter((p) => p.published === ymd).slice(0, limit),
    usedFallback: true,
    datedHits: dated.papers.length,
    recentHits: recent.papers.length,
    datedQuery,
    datedUrl: dated.url,
    fallbackUrl: recent.url,
  };
}

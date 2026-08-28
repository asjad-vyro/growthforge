import { inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { generateStructured, type LlmUsage } from "@/lib/llm/client";
import {
  TrendReportSchema,
  type ChunkTrends,
  type PostingPatterns,
  type TrendReport,
} from "@/lib/llm/schemas/trends";

export async function reduceTrends(opts: {
  chunks: ChunkTrends[];
  postingPatterns: PostingPatterns;
  corpusStats: Record<string, unknown>;
  product: { description: string; usp: string; icp: unknown; name: string };
}): Promise<{ report: TrendReport; usage: LlmUsage }> {
  const { data, usage } = await generateStructured({
    task: "reduce",
    schemaName: "trend_report",
    schema: TrendReportSchema,
    system: [
      "You are a growth strategist synthesizing per-batch trend extractions into one market Trend Report for a specific startup.",
      "Merge duplicate topics/hooks across batches; rank by how often they appear weighted by engagement. engagement_index: 0-100 relative scale within this report.",
      "CRITICAL: content_angles must intersect the market trends with THIS product's USP and ICP — each angle is a concrete campaign idea the founder can run this week.",
      "Only cite evidence_post_ids present in the batch inputs. prevalence_pct is your estimate of how common a format is (0-100).",
    ].join("\n"),
    user: JSON.stringify({
      product: opts.product,
      corpus_stats: opts.corpusStats,
      batches: opts.chunks,
    }),
    maxOutputTokens: 12000,
  });

  const validated = await dropHallucinatedExemplars(data);
  const report: TrendReport = { ...validated, posting_patterns: opts.postingPatterns };
  return { report, usage };
}

/** Remove evidence_post_ids that don't exist in scraped_posts. */
async function dropHallucinatedExemplars<T extends Record<string, unknown>>(report: T): Promise<T> {
  const cited = new Set<string>();
  const collect = (obj: unknown): void => {
    if (Array.isArray(obj)) return obj.forEach(collect);
    if (obj && typeof obj === "object") {
      for (const [k, v] of Object.entries(obj)) {
        if (k === "evidence_post_ids" && Array.isArray(v)) {
          v.forEach((id) => typeof id === "string" && cited.add(id));
        } else collect(v);
      }
    }
  };
  collect(report);
  if (cited.size === 0) return report;

  const uuids = [...cited].filter((id) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
  );
  const found = uuids.length
    ? await db
        .select({ id: schema.scrapedPosts.id })
        .from(schema.scrapedPosts)
        .where(inArray(schema.scrapedPosts.id, uuids))
    : [];
  const valid = new Set(found.map((r) => r.id));

  const prune = (obj: unknown): unknown => {
    if (Array.isArray(obj)) return obj.map(prune);
    if (obj && typeof obj === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj)) {
        out[k] =
          k === "evidence_post_ids" && Array.isArray(v)
            ? v.filter((id) => valid.has(id as string))
            : prune(v);
      }
      return out;
    }
    return obj;
  };
  return prune(report) as T;
}

import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import type { PostingPatterns } from "@/lib/llm/schemas/trends";

export type SampledPost = {
  id: string;
  platform: string;
  authorHandle: string | null;
  authorFollowers: number | null;
  text: string | null;
  metrics: Record<string, number | undefined> | null;
  engagementScore: string | null;
  hashtags: string[] | null;
  postedAt: Date | null;
};

const CORPUS_CAP = Number(process.env.TREND_CORPUS_CAP ?? 600);

/**
 * Stratified sample: platform × recency bucket (7d / 8-30d / older), top-K by
 * engagement plus an engagement-weighted random remainder per stratum.
 */
export async function samplePosts(projectId: string): Promise<SampledPost[]> {
  const rows = (await db.execute(sql`
    WITH eligible AS (
      SELECT id, platform, author_handle, author_followers, text, metrics,
             engagement_score, hashtags, posted_at,
        CASE
          WHEN posted_at >= now() - interval '7 days' THEN 'recent'
          WHEN posted_at >= now() - interval '30 days' THEN 'month'
          ELSE 'older'
        END AS bucket
      FROM scraped_posts
      WHERE project_id = ${projectId}
        AND text IS NOT NULL AND length(text) > 20
        AND coalesce(engagement_score, -10) > -2
    ),
    ranked AS (
      SELECT *,
        row_number() OVER (
          PARTITION BY platform, bucket ORDER BY engagement_score DESC NULLS LAST
        ) AS top_rank,
        -- engagement-weighted random key for the remainder
        row_number() OVER (
          PARTITION BY platform, bucket
          ORDER BY random() * (1 + greatest(coalesce(engagement_score, 0) + 2, 0)) DESC
        ) AS lottery_rank
      FROM eligible
    )
    SELECT id, platform, author_handle, author_followers, text, metrics,
           engagement_score, hashtags, posted_at
    FROM ranked
    WHERE top_rank <= 30 OR lottery_rank <= 30
    ORDER BY platform, engagement_score DESC NULLS LAST
    LIMIT ${CORPUS_CAP}
  `)) as unknown as Record<string, unknown>[];

  return rows.map((r) => ({
    id: r.id as string,
    platform: r.platform as string,
    authorHandle: r.author_handle as string | null,
    authorFollowers: r.author_followers as number | null,
    text: r.text as string | null,
    metrics: r.metrics as SampledPost["metrics"],
    engagementScore: r.engagement_score as string | null,
    hashtags: r.hashtags as string[] | null,
    postedAt: r.posted_at ? new Date(r.posted_at as string) : null,
  }));
}

/** Best posting day/hour per platform, engagement-weighted — computed in SQL, not by the LLM. */
export async function computePostingPatterns(projectId: string): Promise<PostingPatterns> {
  const rows = (await db.execute(sql`
    SELECT platform,
      to_char(posted_at, 'Dy') AS day,
      extract(hour FROM posted_at)::int AS hour,
      avg(coalesce(engagement_score, 0))::numeric(10,3) AS idx,
      count(*) AS n
    FROM scraped_posts
    WHERE project_id = ${projectId} AND posted_at IS NOT NULL
    GROUP BY 1, 2, 3
    HAVING count(*) >= 2
  `)) as unknown as { platform: string; day: string; hour: number; idx: string; n: number }[];

  const patterns: PostingPatterns = {};
  for (const platform of new Set(rows.map((r) => r.platform))) {
    const mine = rows.filter((r) => r.platform === platform);
    const byDay = new Map<string, { total: number; n: number }>();
    const byHour = new Map<number, { total: number; n: number }>();
    for (const r of mine) {
      const d = byDay.get(r.day) ?? { total: 0, n: 0 };
      d.total += Number(r.idx) * Number(r.n);
      d.n += Number(r.n);
      byDay.set(r.day, d);
      const h = byHour.get(r.hour) ?? { total: 0, n: 0 };
      h.total += Number(r.idx) * Number(r.n);
      h.n += Number(r.n);
      byHour.set(r.hour, h);
    }
    patterns[platform] = {
      bestDays: [...byDay.entries()]
        .map(([day, v]) => ({ day, index: Number((v.total / v.n).toFixed(3)) }))
        .sort((a, b) => b.index - a.index)
        .slice(0, 3),
      bestHours: [...byHour.entries()]
        .map(([hour, v]) => ({ hour, index: Number((v.total / v.n).toFixed(3)) }))
        .sort((a, b) => b.index - a.index)
        .slice(0, 4),
    };
  }
  return patterns;
}

export function chunkPosts<T>(posts: T[], size = 40): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < posts.length; i += size) chunks.push(posts.slice(i, i + size));
  return chunks;
}

import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import type { JobRow } from "@/lib/jobs/queue";
import { enqueue, NonRetriableError } from "@/lib/jobs/queue";
import { startActorRun, fetchDatasetItems } from "@/lib/apify/client";
import { ACTOR_CONFIGS, PLATFORMS, estimateScrapeCost, type Platform } from "@/lib/apify/actors";
import { normalizeItem } from "@/lib/apify/normalize";
import { setRunStatus, bumpStageProgress, getRunWithProject, recomputeEngagementScores } from "@/lib/pipeline/state";
import { assertBudget, recordUsage, BudgetExceededError } from "@/lib/usage";
import { mirrorUrlToStorage, BUCKETS } from "@/lib/storage";

/** run.start {pipelineRunId} — create scrape_jobs + fan out scrape.start */
export async function runStart(job: JobRow): Promise<void> {
  const pipelineRunId = job.payload.pipelineRunId as string;
  const { run } = await getRunWithProject(pipelineRunId);
  if (run.status !== "queued") return; // idempotent replay

  await setRunStatus(pipelineRunId, "scraping");
  await bumpStageProgress(pipelineRunId, "scrape", 0, PLATFORMS.length);

  for (const platform of PLATFORMS) {
    const [row] = await db
      .insert(schema.scrapeJobs)
      .values({ pipelineRunId, projectId: run.projectId, platform })
      .returning({ id: schema.scrapeJobs.id });
    await enqueue(
      "scrape.start",
      { scrapeJobId: row.id },
      { dedupeKey: `scrape.start:${pipelineRunId}:${platform}`, pipelineRunId },
    );
  }
}

/** scrape.start {scrapeJobId} — kick off the Apify actor with webhooks */
export async function scrapeStart(job: JobRow): Promise<void> {
  const scrapeJobId = job.payload.scrapeJobId as string;
  const [sj] = await db.select().from(schema.scrapeJobs).where(eq(schema.scrapeJobs.id, scrapeJobId));
  if (!sj) throw new NonRetriableError(`scrape_job ${scrapeJobId} missing`);
  if (sj.apifyRunId) return; // already started (webhook retry / replay)

  const { project } = await getRunWithProject(sj.pipelineRunId);
  const [ws] = await db
    .select({ id: schema.workspaces.id })
    .from(schema.workspaces)
    .where(eq(schema.workspaces.id, project.workspaceId));

  const platform = sj.platform as Platform;
  const config = ACTOR_CONFIGS[platform];
  const keywords = project.nicheKeywords?.length ? project.nicheKeywords : [project.name];
  const input = config.buildInput(keywords);

  try {
    if (ws) await assertBudget(ws.id, estimateScrapeCost(platform, 300));
    const { runId, datasetId } = await startActorRun(config.actorId, input);
    await db
      .update(schema.scrapeJobs)
      .set({
        apifyActorId: config.actorId,
        apifyRunId: runId,
        apifyDatasetId: datasetId,
        input,
        status: "running",
        startedAt: new Date(),
      })
      .where(eq(schema.scrapeJobs.id, scrapeJobId));
  } catch (err) {
    if (err instanceof BudgetExceededError) {
      await markScrapeJobFailed(scrapeJobId, err.message);
      throw new NonRetriableError(err.message);
    }
    throw err;
  }
}

/** scrape.ingest {scrapeJobId} — fetch dataset, normalize, upsert, score */
export async function scrapeIngest(job: JobRow): Promise<void> {
  const scrapeJobId = job.payload.scrapeJobId as string;
  const [sj] = await db.select().from(schema.scrapeJobs).where(eq(schema.scrapeJobs.id, scrapeJobId));
  if (!sj?.apifyDatasetId) throw new NonRetriableError(`scrape_job ${scrapeJobId} has no dataset`);
  const platform = sj.platform as Platform;

  let offset = 0;
  let total = 0;
  const pageSize = 500;
  for (;;) {
    const items = await fetchDatasetItems(sj.apifyDatasetId, offset, pageSize);
    if (items.length === 0) break;
    const normalized = items
      .map((item) => normalizeItem(item, platform))
      .filter((p): p is NonNullable<typeof p> => p !== null);

    for (let i = 0; i < normalized.length; i += 100) {
      const batch = normalized.slice(i, i + 100);
      await db
        .insert(schema.scrapedPosts)
        .values(
          batch.map((p) => ({
            scrapeJobId,
            projectId: sj.projectId,
            platform: p.platform,
            externalId: p.externalId,
            url: p.url,
            authorHandle: p.authorHandle,
            authorName: p.authorName,
            authorFollowers: p.authorFollowers,
            text: p.text,
            media: p.media,
            metrics: p.metrics,
            hashtags: p.hashtags,
            postedAt: p.postedAt,
            raw: p.raw,
          })),
        )
        .onConflictDoNothing();
    }
    total += normalized.length;
    offset += items.length;
    if (items.length < pageSize) break;
  }

  await recomputeEngagementScores(sj.projectId);

  const cost = estimateScrapeCost(platform, total);
  await db
    .update(schema.scrapeJobs)
    .set({ status: "succeeded", postCount: total, costUsd: cost.toFixed(4), finishedAt: new Date() })
    .where(eq(schema.scrapeJobs.id, scrapeJobId));

  const { project } = await getRunWithProject(sj.pipelineRunId);
  await recordUsage(project.workspaceId, "apify_run", cost, { platform, posts: total });

  await enqueue(
    "media.thumbnails",
    { scrapeJobId },
    { dedupeKey: `thumbs:${scrapeJobId}`, pipelineRunId: sj.pipelineRunId },
  );
  await afterScrapeTerminal(sj.pipelineRunId);
}

/** media.thumbnails {scrapeJobId} — mirror top-engagement thumbnails (CDN URLs expire) */
export async function mediaThumbnails(job: JobRow): Promise<void> {
  const scrapeJobId = job.payload.scrapeJobId as string;
  const posts = await db
    .select({
      id: schema.scrapedPosts.id,
      projectId: schema.scrapedPosts.projectId,
      media: schema.scrapedPosts.media,
    })
    .from(schema.scrapedPosts)
    .where(eq(schema.scrapedPosts.scrapeJobId, scrapeJobId))
    .orderBy(sql`engagement_score DESC NULLS LAST`)
    .limit(40);

  for (let i = 0; i < posts.length; i += 8) {
    await Promise.allSettled(
      posts.slice(i, i + 8).map(async (p) => {
        const first = p.media?.find((m) => m.type === "image") ?? p.media?.[0];
        if (!first || first.thumbPath) return;
        const path = `${p.projectId}/${p.id}/thumb.jpg`;
        const stored = await mirrorUrlToStorage(first.url, BUCKETS.scrapedMedia, path);
        if (!stored) return;
        const updated = p.media!.map((m) => (m === first ? { ...m, thumbPath: path } : m));
        await db
          .update(schema.scrapedPosts)
          .set({ media: updated })
          .where(eq(schema.scrapedPosts.id, p.id));
      }),
    );
  }
}

export async function markScrapeJobFailed(scrapeJobId: string, error: string): Promise<void> {
  const [sj] = await db
    .update(schema.scrapeJobs)
    .set({ status: "failed", error, finishedAt: new Date() })
    .where(eq(schema.scrapeJobs.id, scrapeJobId))
    .returning({ pipelineRunId: schema.scrapeJobs.pipelineRunId });
  if (sj) await afterScrapeTerminal(sj.pipelineRunId);
}

/** When ALL platform scrapes are terminal: advance to analysis (≥1 success) or fail. */
async function afterScrapeTerminal(pipelineRunId: string): Promise<void> {
  const rows = await db
    .select({ status: schema.scrapeJobs.status })
    .from(schema.scrapeJobs)
    .where(eq(schema.scrapeJobs.pipelineRunId, pipelineRunId));
  const terminal = rows.filter((r) => ["succeeded", "failed", "timed_out"].includes(r.status));
  const succeeded = rows.filter((r) => r.status === "succeeded");
  await bumpStageProgress(pipelineRunId, "scrape", terminal.length, rows.length);
  if (terminal.length < rows.length) return;

  if (succeeded.length === 0) {
    await setRunStatus(pipelineRunId, "failed", { error: "all platform scrapes failed" });
    return;
  }
  await enqueue(
    "trends.sample",
    { pipelineRunId },
    { dedupeKey: `sample:${pipelineRunId}`, pipelineRunId },
  );
}

import { and, eq, sql, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import type { JobRow } from "@/lib/jobs/queue";
import { enqueue, NonRetriableError } from "@/lib/jobs/queue";
import { setRunStatus, bumpStageProgress, getRunWithProject } from "@/lib/pipeline/state";
import { samplePosts, computePostingPatterns, chunkPosts } from "@/lib/llm/trends/sample";
import { analyzeChunk } from "@/lib/llm/trends/map";
import { reduceTrends } from "@/lib/llm/trends/reduce";
import type { ChunkTrends, TrendReport } from "@/lib/llm/schemas/trends";
import { recordUsage, estimateLlmCost, assertBudget } from "@/lib/usage";

const DEFAULT_ASSET_PLAN = { tweets: 5, carousels: 2, imageAds: 3, reels: 1 };

/** trends.sample {pipelineRunId} — stratified sample → fan out map chunks */
export async function trendsSample(job: JobRow): Promise<void> {
  const pipelineRunId = job.payload.pipelineRunId as string;
  const { run, project } = await getRunWithProject(pipelineRunId);
  if (!["scraping", "analyzing"].includes(run.status)) return;

  await setRunStatus(pipelineRunId, "analyzing");
  const posts = await samplePosts(project.id);
  if (posts.length < 10) {
    await setRunStatus(pipelineRunId, "failed", {
      error: `only ${posts.length} usable posts scraped — not enough to analyze`,
    });
    return;
  }

  const chunks = chunkPosts(posts, 40);
  await bumpStageProgress(pipelineRunId, "analyze", 0, chunks.length + 1);
  for (let i = 0; i < chunks.length; i++) {
    await enqueue(
      "trends.map_chunk",
      {
        pipelineRunId,
        postIds: chunks[i].map((p) => p.id),
        chunkIndex: i,
        totalChunks: chunks.length,
      },
      { dedupeKey: `map:${pipelineRunId}:${i}`, pipelineRunId },
    );
  }
}

/** trends.map_chunk — one LLM extraction per ~40 posts; result stored on the job row */
export async function trendsMapChunk(job: JobRow): Promise<void> {
  const pipelineRunId = job.payload.pipelineRunId as string;
  const postIds = job.payload.postIds as string[];
  const totalChunks = job.payload.totalChunks as number;

  const { project } = await getRunWithProject(pipelineRunId);
  await assertBudget(project.workspaceId, 0.1);

  const rows = await db
    .select()
    .from(schema.scrapedPosts)
    .where(inArray(schema.scrapedPosts.id, postIds));
  const posts = rows.map((r) => ({
    id: r.id,
    platform: r.platform,
    authorHandle: r.authorHandle,
    authorFollowers: r.authorFollowers,
    text: r.text,
    metrics: (r.metrics ?? null) as Record<string, number | undefined> | null,
    engagementScore: r.engagementScore,
    hashtags: r.hashtags,
    postedAt: r.postedAt,
  }));

  const { trends, usage } = await analyzeChunk(posts);
  await recordUsage(project.workspaceId, "llm_call", estimateLlmCost(usage.input, usage.output), {
    stage: "trends.map",
    ...usage,
  });

  // Store result + mark own row done BEFORE counting, so the last finisher sees all
  await db.execute(sql`
    UPDATE jobs SET payload = payload || jsonb_build_object('result', ${JSON.stringify(trends)}::jsonb),
      status = 'done'
    WHERE id = ${job.id}
  `);

  const [{ count }] = (await db.execute(sql`
    SELECT count(*)::int AS count FROM jobs
    WHERE type = 'trends.map_chunk' AND pipeline_run_id = ${pipelineRunId} AND status = 'done'
  `)) as unknown as { count: number }[];
  await bumpStageProgress(pipelineRunId, "analyze", count, totalChunks + 1);

  if (count >= totalChunks) {
    await enqueue(
      "trends.reduce",
      { pipelineRunId, totalChunks },
      { dedupeKey: `reduce:${pipelineRunId}`, pipelineRunId },
    );
  }
}

/** trends.reduce — merge chunk extractions into the TrendReport, then fan out assets */
export async function trendsReduce(job: JobRow): Promise<void> {
  const pipelineRunId = job.payload.pipelineRunId as string;
  const { run, project } = await getRunWithProject(pipelineRunId);

  const chunkJobs = (await db.execute(sql`
    SELECT payload->'result' AS result FROM jobs
    WHERE type = 'trends.map_chunk' AND pipeline_run_id = ${pipelineRunId}
      AND status = 'done' AND payload ? 'result'
    ORDER BY (payload->>'chunkIndex')::int
  `)) as unknown as { result: ChunkTrends }[];
  if (chunkJobs.length === 0) throw new NonRetriableError("no chunk results to reduce");

  const postingPatterns = await computePostingPatterns(project.id);
  const [stats] = (await db.execute(sql`
    SELECT count(*)::int AS total,
      jsonb_object_agg(platform, n) AS per_platform
    FROM (SELECT platform, count(*)::int AS n FROM scraped_posts WHERE project_id = ${project.id} GROUP BY platform) s
  `)) as unknown as { total: number; per_platform: Record<string, number> }[];

  await assertBudget(project.workspaceId, 0.5);
  const { report, usage } = await reduceTrends({
    chunks: chunkJobs.map((c) => c.result),
    postingPatterns,
    corpusStats: stats ?? {},
    product: {
      name: project.name,
      description: project.productDescription ?? "",
      usp: project.usp ?? "",
      icp: project.icp ?? {},
    },
  });
  await recordUsage(project.workspaceId, "llm_call", estimateLlmCost(usage.input, usage.output), {
    stage: "trends.reduce",
    ...usage,
  });

  const [existing] = await db
    .select({ v: sql<number>`coalesce(max(version), 0)` })
    .from(schema.trendReports)
    .where(eq(schema.trendReports.projectId, project.id));

  const [reportRow] = await db
    .insert(schema.trendReports)
    .values({
      pipelineRunId,
      projectId: project.id,
      version: (existing?.v ?? 0) + 1,
      report: report as unknown as Record<string, unknown>,
      corpusStats: (stats ?? {}) as Record<string, unknown>,
      model: usage.model,
      tokenUsage: { input: usage.input, output: usage.output },
    })
    .returning({ id: schema.trendReports.id });

  await createAssetFanout(pipelineRunId, project.id, reportRow.id, report, run.assetPlan);
}

async function createAssetFanout(
  pipelineRunId: string,
  projectId: string,
  trendReportId: string,
  report: TrendReport,
  planOverride: { tweets: number; carousels: number; imageAds: number; reels: number } | null,
): Promise<void> {
  const plan = planOverride ?? DEFAULT_ASSET_PLAN;
  const specs: { type: string }[] = [
    ...Array.from({ length: plan.tweets }, () => ({ type: "tweet" })),
    ...Array.from({ length: plan.carousels }, () => ({ type: "carousel" })),
    ...Array.from({ length: plan.imageAds }, () => ({ type: "image_ad" })),
    ...Array.from({ length: plan.reels }, () => ({ type: "reel" })),
  ];

  // Idempotency: replay of trends.reduce must not double-create assets
  const [{ n }] = (await db.execute(sql`
    SELECT count(*)::int AS n FROM generated_assets WHERE pipeline_run_id = ${pipelineRunId}
  `)) as unknown as { n: number }[];
  if (n > 0) return;

  await setRunStatus(pipelineRunId, "generating");
  await bumpStageProgress(pipelineRunId, "generate", 0, specs.length);

  const angleCount = Math.max(report.content_angles.length, 1);
  for (let i = 0; i < specs.length; i++) {
    const [asset] = await db
      .insert(schema.generatedAssets)
      .values({
        projectId,
        pipelineRunId,
        trendReportId,
        type: specs[i].type,
        status: "queued",
        content: { angleIndex: i % angleCount },
      })
      .returning({ id: schema.generatedAssets.id });
    await enqueue(
      "asset.generate",
      { assetId: asset.id },
      { dedupeKey: `gen:${asset.id}`, pipelineRunId },
    );
  }
}

/** run.finalize — flip the run to completed/partial once every asset is terminal */
export async function runFinalize(job: JobRow): Promise<void> {
  const pipelineRunId = job.payload.pipelineRunId as string;
  const assets = await db
    .select({ status: schema.generatedAssets.status })
    .from(schema.generatedAssets)
    .where(eq(schema.generatedAssets.pipelineRunId, pipelineRunId));
  const terminal = assets.filter((a) => ["ready", "failed"].includes(a.status));
  if (terminal.length < assets.length) return; // finalize re-enqueued by later completions

  const scrapes = await db
    .select({ status: schema.scrapeJobs.status })
    .from(schema.scrapeJobs)
    .where(
      and(
        eq(schema.scrapeJobs.pipelineRunId, pipelineRunId),
        eq(schema.scrapeJobs.status, "failed"),
      ),
    );
  const anyFailed = assets.some((a) => a.status === "failed") || scrapes.length > 0;
  await bumpStageProgress(pipelineRunId, "generate", terminal.length, assets.length);
  await setRunStatus(pipelineRunId, anyFailed ? "partial" : "completed");
}

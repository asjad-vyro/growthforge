import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import type { JobRow } from "@/lib/jobs/queue";
import { enqueue, NonRetriableError } from "@/lib/jobs/queue";
import { bumpStageProgress } from "@/lib/pipeline/state";
import { loadGenerationContext } from "@/lib/generation/context";
import { generateTweets } from "@/lib/generation/tweets";
import { renderCarouselSlides } from "@/lib/generation/carousel-studio";
import { renderImageAds } from "@/lib/generation/image-ads";
import { renderReelVideo } from "@/lib/generation/video-studio";
import { recordUsage, estimateLlmCost, assertBudget, BudgetExceededError } from "@/lib/usage";

/** asset.generate {assetId} — dispatch per type */
export async function assetGenerate(job: JobRow): Promise<void> {
  const assetId = job.payload.assetId as string;
  const [asset] = await db
    .select()
    .from(schema.generatedAssets)
    .where(eq(schema.generatedAssets.id, assetId));
  if (!asset) throw new NonRetriableError(`asset ${assetId} missing`);
  if (asset.status === "ready") return;

  await db
    .update(schema.generatedAssets)
    .set({ status: "generating", error: null, updatedAt: new Date() })
    .where(eq(schema.generatedAssets.id, assetId));

  try {
    const ctx = await loadGenerationContext(assetId);
    await assertBudget(ctx.project.workspaceId, 0.5);

    switch (asset.type) {
      case "tweet":
      case "thread": {
        const { content, usage } = await generateTweets(ctx);
        await recordUsage(ctx.project.workspaceId, "llm_call", estimateLlmCost(usage.input, usage.output), { stage: "gen.tweet", ...usage });
        await finishAsset(assetId, { variants: content.variants }, []);
        break;
      }
      case "carousel": {
        const { files, concept } = await renderCarouselSlides(ctx);
        await recordUsage(ctx.project.workspaceId, "imagine_image", 0.2, { stage: "gen.carousel.slides", count: files.length });
        await finishAsset(assetId, { concept }, files);
        break;
      }
      case "image_ad": {
        const files = await renderImageAds(ctx);
        await recordUsage(ctx.project.workspaceId, "imagine_image", 0.16, { stage: "gen.ad.images", count: files.length });
        await finishAsset(assetId, {}, files);
        break;
      }
      case "reel": {
        const { file, template } = await renderReelVideo(ctx);
        await recordUsage(ctx.project.workspaceId, "imagine_video", 0.6, { stage: "gen.reel.video", template });
        await finishAsset(assetId, { template }, [file]);
        break;
      }
      default:
        throw new NonRetriableError(`unknown asset type ${asset.type}`);
    }
  } catch (err) {
    const finalAttempt = job.attempts >= job.maxAttempts;
    const permanent = err instanceof NonRetriableError || err instanceof BudgetExceededError || finalAttempt;
    if (permanent) await markAssetFailed(assetId, err instanceof Error ? err.message : String(err));
    if (err instanceof BudgetExceededError) throw new NonRetriableError(err.message);
    throw err;
  }
}

export async function finishAsset(
  assetId: string,
  contentPatch: Record<string, unknown>,
  files: { path: string; mime: string; width?: number; height?: number; durationS?: number; label?: string }[],
): Promise<void> {
  const [asset] = await db
    .update(schema.generatedAssets)
    .set({
      status: "ready",
      content: sql`coalesce(content, '{}'::jsonb) || ${JSON.stringify(contentPatch)}::jsonb`,
      files: sql`coalesce(files, '[]'::jsonb) || ${JSON.stringify(files)}::jsonb`,
      updatedAt: new Date(),
    })
    .where(eq(schema.generatedAssets.id, assetId))
    .returning({ pipelineRunId: schema.generatedAssets.pipelineRunId });
  if (asset?.pipelineRunId) await checkGenerationDone(asset.pipelineRunId);
}

export async function markAssetFailed(assetId: string, error: string): Promise<void> {
  const [asset] = await db
    .update(schema.generatedAssets)
    .set({ status: "failed", error, updatedAt: new Date() })
    .where(eq(schema.generatedAssets.id, assetId))
    .returning({ pipelineRunId: schema.generatedAssets.pipelineRunId });
  if (asset?.pipelineRunId) await checkGenerationDone(asset.pipelineRunId);
}

export async function checkGenerationDone(pipelineRunId: string): Promise<void> {
  const [{ total, terminal }] = (await db.execute(sql`
    SELECT count(*)::int AS total,
      count(*) FILTER (WHERE status IN ('ready','failed'))::int AS terminal
    FROM generated_assets WHERE pipeline_run_id = ${pipelineRunId}
  `)) as unknown as { total: number; terminal: number }[];
  await bumpStageProgress(pipelineRunId, "generate", terminal, total);
  if (total > 0 && terminal >= total) {
    await enqueue(
      "run.finalize",
      { pipelineRunId },
      { dedupeKey: `finalize:${pipelineRunId}:${terminal}`, pipelineRunId },
    );
  }
}

import { eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import type { TrendReport } from "@/lib/llm/schemas/trends";
import { getBrandSnapshot, brandPromptBlock, type BrandSnapshot } from "./brand";

export type GenerationContext = {
  asset: typeof schema.generatedAssets.$inferSelect;
  project: typeof schema.projects.$inferSelect;
  brand: BrandSnapshot;
  report: TrendReport;
  angle: TrendReport["content_angles"][number];
  exemplarTexts: string[];
  promptPreamble: string;
};

/** Load everything a generator needs for one asset. */
export async function loadGenerationContext(assetId: string): Promise<GenerationContext> {
  const [asset] = await db
    .select()
    .from(schema.generatedAssets)
    .where(eq(schema.generatedAssets.id, assetId));
  if (!asset) throw new Error(`asset ${assetId} not found`);

  const [project] = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, asset.projectId));
  if (!project) throw new Error(`project ${asset.projectId} not found`);

  if (!asset.trendReportId) throw new Error(`asset ${assetId} has no trend report`);
  const [reportRow] = await db
    .select()
    .from(schema.trendReports)
    .where(eq(schema.trendReports.id, asset.trendReportId));
  if (!reportRow) throw new Error(`trend report ${asset.trendReportId} not found`);
  const report = reportRow.report as TrendReport;

  const angles = report.content_angles.length
    ? report.content_angles
    : [
        {
          angle: "Introduce the product to the market",
          maps_to_usp: project.usp ?? "",
          recommended_asset_types: [],
          suggested_hook: "",
          evidence_post_ids: [],
        },
      ];
  const angleIndex = Number((asset.content as Record<string, unknown>)?.angleIndex ?? 0);
  const angle = angles[angleIndex % angles.length];

  const exemplarIds = angle.evidence_post_ids.slice(0, 3);
  const exemplars = exemplarIds.length
    ? await db
        .select({ text: schema.scrapedPosts.text, platform: schema.scrapedPosts.platform })
        .from(schema.scrapedPosts)
        .where(inArray(schema.scrapedPosts.id, exemplarIds))
    : [];

  const brand = await getBrandSnapshot(project.id);
  const userInstruction = (asset.content as Record<string, unknown>)?.userInstruction as
    | string
    | undefined;

  const promptPreamble = [
    `PRODUCT: ${project.name} — ${project.productDescription ?? ""}`,
    `USP: ${project.usp ?? ""}`,
    `ICP: ${JSON.stringify(project.icp ?? {})}`,
    brandPromptBlock(brand),
    `CAMPAIGN ANGLE (derived from live market trends): ${angle.angle}`,
    `Why it maps to the USP: ${angle.maps_to_usp}`,
    angle.suggested_hook ? `Suggested hook pattern: ${angle.suggested_hook}` : "",
    exemplars.length
      ? `HIGH-PERFORMING POSTS IN THIS NICHE (ground your style in what actually works):\n${exemplars
          .map((e) => `- [${e.platform}] ${(e.text ?? "").slice(0, 400)}`)
          .join("\n")}`
      : "",
    userInstruction ? `USER INSTRUCTION FOR THIS REGENERATION: ${userInstruction}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return { asset, project, brand, report, angle, exemplarTexts: exemplars.map((e) => e.text ?? ""), promptPreamble };
}

/**
 * Merge a checkpoint into the asset's content jsonb. Generation jobs can be
 * killed at the function duration limit; checkpoints let the retry resume
 * (skip finished slides/aspects, re-poll an already-submitted video) instead
 * of restarting — and re-spending — from zero.
 */
export async function patchAssetContent(
  assetId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  await db
    .update(schema.generatedAssets)
    .set({
      content: sql`coalesce(content, '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb`,
      updatedAt: new Date(),
    })
    .where(eq(schema.generatedAssets.id, assetId));
}

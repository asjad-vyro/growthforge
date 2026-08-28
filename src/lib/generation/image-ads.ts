import type { AssetFile } from "@/lib/db/schema";
import { generateImage } from "@/lib/imagine-mcp/client";
import { uploadBuffer, BUCKETS } from "@/lib/storage";
import type { GenerationContext } from "./context";
import { patchAssetContent } from "./context";
import { AD_ASPECTS, directorPrompt, lockCreativeDirection, brandClause, withStyleOnlyRefs, type AdAspect } from "./image-studio/matrix";

// Nominal display dims per aspect at ~2K long edge — imagine-mcp's `resolution` param governs
// actual output size; this is only for AssetFile metadata (asset-card aspect-ratio display).
const ASPECT_DIMS: Record<AdAspect, { width: number; height: number }> = {
  "16:9": { width: 2048, height: 1152 },
  "4:3": { width: 2048, height: 1536 },
  "3:4": { width: 1536, height: 2048 },
  "9:16": { width: 1152, height: 2048 },
};

function brandContext(ctx: GenerationContext): string {
  return [
    `${ctx.project.name} — ${ctx.project.productDescription ?? ""}`,
    ctx.project.usp ? `USP: ${ctx.project.usp}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Forge's Image Studio, ported: one locked archetype + one locked variation (world/voice/lean)
 * drives the same ad rendered at each of the director's four supported canvases — via
 * imagine-mcp's generate_image (model=gpt-image-2), calls run sequentially (imagine-mcp
 * throttles concurrent generations per user). Unlike GrowthForge's old satori-overlay approach,
 * the headline/CTA/brand mark are rendered BY the image model per the director prompt — there
 * is no separate LLM copy step and no text overlay pass.
 */
type AdCheckpoint = { directive: string; label: string; adFiles: AssetFile[] };

export async function renderImageAds(ctx: GenerationContext): Promise<AssetFile[]> {
  // Resume-safe: creative direction + finished aspects are checkpointed into
  // asset.content, so a retry continues from the next aspect with the SAME look.
  const prior = (ctx.asset.content as { ad?: AdCheckpoint } | null)?.ad;
  const { directive, label } =
    prior ??
    lockCreativeDirection(Math.floor(Math.random() * 10), Math.floor(Math.random() * 5));
  const brandCtx = brandContext(ctx);
  const refImage = ctx.brand.logoDataUri || undefined;
  const files: AssetFile[] = prior?.adFiles ? [...prior.adFiles] : [];
  if (!prior) {
    await patchAssetContent(ctx.asset.id, { ad: { directive, label, adFiles: [] } });
  }

  for (const aspect of AD_ASPECTS.slice(files.length)) {
    let prompt = directorPrompt(aspect, "English") + directive;
    prompt = withStyleOnlyRefs(prompt, Boolean(refImage));
    if (brandCtx) prompt += brandClause(brandCtx);

    const imageUrl = await generateImage({
      prompt,
      aspectRatio: aspect,
      model: "gpt-image-2",
      resolution: "2K",
      quality: "high",
      imageUrl: refImage,
    });

    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(60_000) });
    const buf = Buffer.from(await res.arrayBuffer());
    const dims = ASPECT_DIMS[aspect];
    const path = `${ctx.project.id}/${ctx.asset.id}/ad-${aspect.replace(":", "x")}.png`;
    await uploadBuffer(BUCKETS.generatedAssets, path, buf, "image/png");
    files.push({
      path,
      mime: "image/png",
      width: dims.width,
      height: dims.height,
      label: `${label} · ${aspect}`,
    });
    await patchAssetContent(ctx.asset.id, { ad: { directive, label, adFiles: files } });
  }
  return files;
}

import type { AssetFile } from "@/lib/db/schema";
import { generateImage } from "@/lib/imagine-mcp/client";
import { uploadBuffer, BUCKETS } from "@/lib/storage";
import type { GenerationContext } from "../context";
import { CAROUSEL_CONCEPTS, makeStyleLock, slidePrompt, type Mode } from "./prompts";

const SLIDES = 5;
// GrowthForge has no product-screenshot library (unlike Forge's feature packs), so slides stay
// text-only rather than have the model invent a fake product UI to fill a "screens"/"mixed" slot.
const MODE: Mode = "text";

function brief(ctx: GenerationContext): string {
  return [
    `${ctx.project.name} — ${ctx.project.productDescription ?? ""}`,
    ctx.project.usp ? `USP: ${ctx.project.usp}` : "",
    `Campaign angle: ${ctx.angle.angle}`,
    ctx.angle.suggested_hook ? `Suggested hook: ${ctx.angle.suggested_hook}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Forge's Carousel Studio, "independent" approach, ported: one locked STYLE LOCK (world / energy /
 * type / accent / layout / through-line, randomized per run from one of 5 concepts) drives N
 * cohesive-but-distinct 4:5 slides — hook, benefits, CTA — each rendered whole by the image model
 * (headline + layout baked in, no separate copy LLM or satori overlay). Calls run sequentially via
 * imagine-mcp (generate_image, model=gpt-image-2), per the concurrency-serialization decision.
 */
export async function renderCarouselSlides(ctx: GenerationContext): Promise<{ files: AssetFile[]; concept: string }> {
  const concept = CAROUSEL_CONCEPTS[Math.floor(Math.random() * CAROUSEL_CONCEPTS.length)];
  const styleLock = makeStyleLock(concept);
  const brand = brief(ctx);
  const files: AssetFile[] = [];

  for (let k = 1; k <= SLIDES; k++) {
    const prompt = slidePrompt(brand, "English", styleLock, k, SLIDES, MODE);
    const imageUrl = await generateImage({ prompt, aspectRatio: "4:5", model: "gpt-image-2", resolution: "2K", quality: "high" });

    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(60_000) });
    const buf = Buffer.from(await res.arrayBuffer());
    const path = `${ctx.project.id}/${ctx.asset.id}/slide-${String(k).padStart(2, "0")}.png`;
    await uploadBuffer(BUCKETS.generatedAssets, path, buf, "image/png");
    files.push({ path, mime: "image/png", width: 1024, height: 1280, label: `Slide ${k}` });
  }
  return { files, concept };
}

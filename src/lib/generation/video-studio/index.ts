import type { AssetFile } from "@/lib/db/schema";
import { generateVideo } from "@/lib/imagine-mcp/client";
import { uploadBuffer, BUCKETS } from "@/lib/storage";
import type { GenerationContext } from "../context";
import { TEMPLATE_KEYS } from "./templates";
import { buildVideoPrompt } from "./prompt";

function details(ctx: GenerationContext): string {
  return [
    ctx.project.productDescription ?? "",
    ctx.project.usp ? `USP: ${ctx.project.usp}` : "",
    `Campaign angle: ${ctx.angle.angle}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Forge's Video Studio, ported: one of the 12 backcoded UGC-ad templates (hook → problem/value →
 * product reveal → CTA), rendered as a single imagine-mcp generate_video call (model=seedance-2.0,
 * which — like Forge's own Seedance choice — generates synchronised speech audio natively; no
 * separate TTS/transcription/compose chain is needed, unlike the old fal-based reel pipeline).
 *
 * Caveat: Forge's templates are built to reproduce a REAL product screenshot on the laptop-reveal
 * shot (`PRODUCT UI CONSISTENCY — TOP PRIORITY`). GrowthForge has no product-screenshot library
 * (unlike Forge's feature packs), so no reference image is attached — the model invents a plausible
 * UI from the text description instead of reproducing a real one. Quality will read as more
 * generic than Forge's own screenshot-grounded output.
 */
export async function renderReelVideo(ctx: GenerationContext): Promise<{ file: AssetFile; template: string }> {
  const templateKey = TEMPLATE_KEYS[Math.floor(Math.random() * TEMPLATE_KEYS.length)];
  const prompt = buildVideoPrompt({
    templateKey,
    details: details(ctx),
    brand: ctx.project.name,
    audioOn: true,
  });

  const videoUrl = await generateVideo({ prompt, aspectRatio: "9:16", model: "seedance-2.0" });

  const res = await fetch(videoUrl, { signal: AbortSignal.timeout(180_000) });
  const buf = Buffer.from(await res.arrayBuffer());
  const path = `${ctx.project.id}/${ctx.asset.id}/reel.mp4`;
  await uploadBuffer(BUCKETS.generatedAssets, path, buf, "video/mp4");

  return {
    file: { path, mime: "video/mp4", width: 1080, height: 1920, durationS: 15, label: "Reel" },
    template: templateKey,
  };
}

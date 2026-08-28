import { z } from "zod";
import { apify } from "@/lib/apify/client";
import { SCREENSHOT_ACTOR } from "@/lib/apify/actors";
import { generateStructured } from "@/lib/llm/client";
import { uploadBuffer, signedUrl, mirrorUrlToStorage, BUCKETS } from "@/lib/storage";

export const OnboardingPrefillSchema = z.object({
  product_name: z.string(),
  product_description: z.string(),
  usp: z.string(),
  tone_of_voice: z.string(),
  colors: z.object({
    primary: z.string(),
    secondary: z.string(),
    accent: z.string(),
    background: z.string(),
    text: z.string(),
  }),
  logo_url: z.string(),
  niche_keywords: z.array(z.string()),
  icp: z.object({
    persona: z.string(),
    pains: z.array(z.string()),
    goal: z.string(),
    demographics: z.string(),
    watering_holes: z.array(z.string()),
  }),
  offers: z.string(),
  pricing: z.string(),
  testimonials: z.string(),
  socials: z.object({
    twitter: z.string(),
    instagram: z.string(),
    youtube_or_other: z.string(),
  }),
  suggested_goals: z.array(
    z.enum([
      "Increase brand awareness",
      "Grow community",
      "Drive more leads",
      "Increase retention",
      "Other",
    ]),
  ),
});
export type OnboardingPrefill = z.infer<typeof OnboardingPrefillSchema> & {
  screenshotPath?: string;
};

/**
 * Landing-page ingestion without extra vendors: raw fetch (text + meta/OG) +
 * apify screenshot + one vision LLM call → wizard prefill. Everything is
 * user-editable afterwards.
 */
export async function ingestLandingPage(
  url: string,
  workspaceId: string,
): Promise<OnboardingPrefill> {
  const [html, screenshotPath] = await Promise.all([
    fetchHtml(url),
    captureScreenshot(url, workspaceId),
  ]);

  const textContent = html ? condenseHtml(html) : "";
  const parts: ({ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } })[] = [
    {
      type: "text",
      text: [
        `Landing page URL: ${url}`,
        textContent ? `PAGE CONTENT (condensed HTML/text):\n${textContent}` : "(page fetch failed — rely on the screenshot)",
        [
          "Extract the onboarding prefill. colors must be hex like #1A2B3C — infer the actual site palette (from the screenshot when present).",
          "logo_url: absolute URL of the site logo if identifiable from the HTML (og:image / link rel icon / img with 'logo'), else empty string.",
          "niche_keywords: 4-6 short search terms a growth marketer would use to find this product's market conversation on social (no hashtag symbol).",
          "watering_holes: where this ICP hangs out online. icp.goal: what success looks like for this customer, one sentence.",
          "offers: current offers/plans/promos visible on the page (e.g. free trial, discounts), one line, else empty. pricing: pricing summary from the page (tiers/amounts), one line, else empty.",
          "testimonials: 1-3 short verbatim quotes of reviews/testimonials/social proof found on the page joined with ' | ', else empty.",
          "socials: absolute URLs of the brand's own social profiles found in the page links (twitter = twitter.com/x.com profile, instagram = instagram.com profile, youtube_or_other = youtube/tiktok/discord/linkedin — pick the most prominent). Empty string when not present — NEVER invent handles.",
          "suggested_goals: 1-2 of the allowed goal labels that best fit what this business appears to need right now.",
        ].join(" "),
      ].join("\n\n"),
    },
  ];
  if (screenshotPath) {
    parts.push({
      type: "image_url",
      image_url: { url: await signedUrl(BUCKETS.brandAssets, screenshotPath, 3600) },
    });
  }

  const { data } = await generateStructured({
    task: "extract",
    schemaName: "onboarding_prefill",
    schema: OnboardingPrefillSchema,
    system:
      "You analyze startup landing pages and produce structured onboarding data for a growth-marketing tool. Be concrete and faithful to the page — do not invent claims.",
    user: parts,
    maxOutputTokens: 2500,
  });

  return { ...data, screenshotPath: screenshotPath ?? undefined };
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12_000),
      headers: { "user-agent": "Mozilla/5.0 (compatible; GrowthForgeBot/1.0)" },
    });
    if (!res.ok) return null;
    return (await res.text()).slice(0, 400_000);
  } catch {
    return null;
  }
}

async function captureScreenshot(url: string, workspaceId: string): Promise<string | null> {
  try {
    const run = await apify.actor(SCREENSHOT_ACTOR).call(
      { urls: [{ url }], fullPage: false, viewportWidth: 1440, delay: 3000, format: "png" },
      { timeout: 120 },
    );
    const { items } = await apify.dataset(run.defaultDatasetId).listItems({ limit: 1 });
    const item = items[0] as Record<string, unknown> | undefined;
    const shotUrl =
      (item?.screenshotUrl as string | undefined) ??
      ((item?.screenshot as Record<string, unknown>)?.url as string | undefined);
    if (!shotUrl) return null;
    const path = `${workspaceId}/landing/${Date.now()}.png`;
    return await mirrorUrlToStorage(shotUrl, BUCKETS.brandAssets, path, "image/png");
  } catch {
    return null;
  }
}

/** Strip scripts/styles, keep meta tags + visible text — LLM-budget friendly. */
function condenseHtml(html: string): string {
  const metas = [...html.matchAll(/<meta[^>]+>/gi)].map((m) => m[0]).join("\n").slice(0, 4000);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12_000);
  const logoHints = [...html.matchAll(/<(?:img|link)[^>]*(?:logo|icon)[^>]*>/gi)]
    .map((m) => m[0])
    .slice(0, 10)
    .join("\n");
  const socialLinks = [
    ...new Set(
      [...html.matchAll(/href="(https?:\/\/[^"]*(?:twitter\.com|x\.com|instagram\.com|youtube\.com|tiktok\.com|linkedin\.com|discord\.(?:gg|com))[^"]*)"/gi)]
        .map((m) => m[1])
        .slice(0, 12),
    ),
  ].join("\n");
  return `TITLE: ${title}\nMETA:\n${metas}\nLOGO/ICON TAGS:\n${logoHints}\nSOCIAL/COMMUNITY LINKS:\n${socialLinks}\nTEXT:\n${body}`;
}

/** Mirror a discovered logo URL into brand-assets. */
export async function mirrorLogo(
  logoUrl: string,
  workspaceId: string,
  projectId: string,
): Promise<string | null> {
  const ext = logoUrl.includes(".svg") ? "svg" : logoUrl.includes(".jpg") ? "jpg" : "png";
  return mirrorUrlToStorage(
    logoUrl,
    BUCKETS.brandAssets,
    `${workspaceId}/${projectId}/logo.${ext}`,
    "image/png",
  );
}

export async function uploadLogoBuffer(
  buf: Buffer,
  contentType: string,
  workspaceId: string,
  projectId: string,
): Promise<string> {
  const ext = contentType.includes("svg") ? "svg" : contentType.includes("jpeg") ? "jpg" : "png";
  const path = `${workspaceId}/${projectId}/logo.${ext}`;
  await uploadBuffer(BUCKETS.brandAssets, path, buf, contentType);
  return path;
}

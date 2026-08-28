import { DIRECTOR_TEXT } from "./director";

// Ported from Forge (apps/api/forge/api/routes/images.py) — the static_ad_director's five
// axes, by their exact in-prompt names, so a per-call lock maps cleanly onto the director's
// own vocabulary and is honoured strongly (GPT-Image-2's own "randomly select" never
// diverges across near-identical calls on the same prompt).
export const ARCHETYPES = [
  "ARCHETYPE A — PRODUCT HERO",
  "ARCHETYPE B — HEADLINE DOMINANT",
  "ARCHETYPE C — FEATURE PROOF",
  "ARCHETYPE D — BRAND CTA",
  "ARCHETYPE E — SOCIAL PROOF",
  "ARCHETYPE F — PROBLEM / SOLUTION SPLIT",
  "ARCHETYPE G — METRIC SPOTLIGHT",
  "ARCHETYPE H — COMPARISON FRAME",
  "ARCHETYPE I — LIFESTYLE CONTEXT",
  "ARCHETYPE J — TYPE AS SCULPTURE",
] as const;

const WORLDS = [
  "WORLD 1 — LIGHT AIRY",
  "WORLD 2 — DARK GLOW",
  "WORLD 3 — BRAND SATURATED",
  "WORLD 4 — EDITORIAL PAPER",
  "WORLD 5 — GRADIENT WASH",
] as const;

const VOICES = [
  "VOICE 1 — NEO-GROTESQUE TRACKED",
  "VOICE 2 — GEOMETRIC SANS BOLD",
  "VOICE 3 — MODERN SERIF PLUS GROTESQUE",
  "VOICE 4 — MONOSPACE ACCENT",
  "VOICE 5 — HUMANIST WARM",
] as const;

const LEANS = [
  "LEAN 1 — VERTICAL GRAVITY",
  "LEAN 2 — AXIS SPLIT",
  "LEAN 3 — DIAGONAL ENERGY",
  "LEAN 4 — ASYMMETRIC FLOAT",
  "LEAN 5 — CENTRED GRAVITY",
] as const;

// The four canvases the director prompt gives explicit geometry for, and the only ones
// worth using — they're also the only ones imagine-mcp's gpt-image-2 aspect_ratio allow-list
// shares with them (a value outside a model's allow-list silently falls back to 1:1).
export const AD_ASPECTS = ["16:9", "4:3", "3:4", "9:16"] as const;
export type AdAspect = (typeof AD_ASPECTS)[number];

const NO_BADGE =
  " Do NOT render any page number, slide / concept counter, 'N of M', 'x / y', 'CONCEPTS', or any " +
  "batch / variation badge anywhere in the image — that positioning is internal direction only.";

// Applied whenever a reference image is attached: informs brand/aesthetic ONLY — the model
// must never paste the app UI into the ad.
const STYLE_ONLY_REFS =
  "\n\nPRODUCT REFERENCES = STYLE CUES ONLY. The attached product reference(s) are provided ONLY so you " +
  "match the brand's colour story and visual sensibility. Do NOT composite, paste, inset, screenshot, " +
  "mock-up, or reproduce any product screenshot, app window, dashboard, phone/laptop/device frame, or UI " +
  "panel in the ad — even though the reference shows one. Render a CLEAN, ORIGINAL ad: a headline, at most " +
  "one simple real-world hero subject/object, the brand mark, and generous negative space. Message + " +
  "typography carry it — never a screenshot.";

function axisLabel(axis: string): string {
  const name = axis.split("—", 2)[1]?.trim() ?? axis;
  return name ? name[0].toUpperCase() + name.slice(1).toLowerCase() : axis;
}

export function directorPrompt(aspect: AdAspect, language: string): string {
  return DIRECTOR_TEXT.replace(/^ASPECT RATIO:.*$/m, `ASPECT RATIO: ${aspect}`).replace(
    /^LANGUAGE:.*$/m,
    `LANGUAGE: ${language}`,
  );
}

/**
 * Lock ONE archetype + ONE variation (world/voice/lean) for a whole ad — every aspect-ratio
 * deliverable of the same asset shares this same lock, like one campaign delivered pre-cropped
 * for each canvas. Ported from Forge's `_matrix_directive`.
 */
export function lockCreativeDirection(archetypeIndex: number, variationIndex: number): { directive: string; label: string } {
  const arch = ARCHETYPES[archetypeIndex % ARCHETYPES.length];
  const world = WORLDS[variationIndex % WORLDS.length];
  const voice = VOICES[variationIndex % VOICES.length];
  const lean = LEANS[(variationIndex * 2) % LEANS.length];
  const directive =
    "\n\n---\n\nLOCKED CREATIVE DIRECTION FOR THIS RENDER (overrides the Axis 1–4 random selections):\n" +
    `- CONCEPT: build this ad as — ${arch} — the single creative direction for this product.\n` +
    `- VARIATION (World / Type Voice / Lean): use ${world}, ${voice}, and ${lean}.` +
    NO_BADGE;
  return { directive, label: axisLabel(arch) };
}

/** Ported from Forge's `_brand_clause` — grounds the model in the real product without forcing a logo. */
export function brandClause(brandCtx: string): string {
  return (
    "\n\n---\n\nBRAND / PRODUCT — this ad is FOR the following product:\n" +
    brandCtx.trim().slice(0, 1200) +
    "\n\nCRITICAL: whether a brand name/wordmark appears at all is decided by the skin/archetype above " +
    "and by the direction/brief — do NOT add one just because this context is present. If, per that " +
    "direction, a brand name or wordmark DOES appear, it MUST be exactly this product's real name, " +
    "spelled correctly. NEVER invent a brand name, and NEVER draw, letter or imply ANY other real " +
    "company's name, logo, app icon or mark. Every word and mark in the ad is about THIS product — " +
    "nothing else."
  );
}

export function withStyleOnlyRefs(prompt: string, hasRef: boolean): string {
  return hasRef ? prompt + STYLE_ONLY_REFS : prompt;
}

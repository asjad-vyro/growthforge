// Ported from Forge's Carousel Studio (apps/api/forge/api/routes/carousel.py, Vyro-ai/forge) —
// the "independent" approach only (N separate slides, one cohesive STYLE LOCK). The continuous
// board (one panorama sliced + cropped) and the bespoke template skins (zine/showcase/insight/
// pillars/roundup/bighead/fourthwall/iconcollage) are NOT ported — this is the generic engine
// behind Forge's "clean" / "playful" / "bold" / "gradient" / "mono" concepts.

// Axes SHARED by every concept (type / accent / layout don't change the plain-vs-decorated feel).
const CAR_SHARED = {
  type: [
    "bold geometric-grotesque (Inter / Söhne / General Sans), ≤2 weights, sentence case",
    "humanist warm sans, optically balanced and approachable",
    "display serif headline + a quiet grotesque for support — premium editorial pairing",
    "elegant editorial serif, ranged left, classic and refined",
    "rounded friendly sans (circular / Gilroy character), soft and approachable",
    "clean sans with ONE monospace accent word — subtle and precise",
  ],
  accent: [
    "soft violet", "warm amber", "muted teal", "sage / soft green",
    "dusty coral", "soft sky blue", "the product's own brand accent",
  ],
  layout: [
    "hero figure on the LEFT · clean product/UI panels across the middle · an airy CTA on the RIGHT (no second hero)",
    "a centred hero · UI panels flanking it · an airy CTA as the last panel",
    "type-led: a big display-headline panel first (no hero photo) · UI component panels · a clean CTA panel last",
    "asymmetric editorial: an oversized headline easing into the next panel · small UI insets · an airy CTA",
    "stacked cards: each panel a floating card / device mock on the light background · the CTA as plain type, no card",
  ],
} as const;

const CONCEPTS = {
  clean: {
    world: [
      "light-airy — near-white field, soft diffused shadows, lots of breathing room; clean premium product-page feel",
      "soft-gradient — a gentle pale gradient (a soft pastel easing into white), modern and airy",
      "warm-cream — a warm cream base with ONE tasteful accent; soft, premium and inviting",
      "soft-dark — a gentle soft-charcoal (NEVER pure black) with a quiet accent glow; minimal and restrained",
    ],
    energy: [
      "calm & premium — restrained, lots of negative space, quiet confidence",
      "editorial & refined — magazine-grade, elegant, considered",
      "clean & minimal — simple, uncluttered and precise",
      "friendly & approachable — soft, warm and gentle",
    ],
    through: [
      "a soft numbered 01–0N timeline ribbon along the bottom, tying all panels together",
      "a thin accent ribbon weaving smoothly across all panels",
      "an unbroken soft horizon / gradient band across the full width (no numbers)",
      "no explicit connector — unity comes purely from the shared world, type and accent",
    ],
    decoration: [
      "minimal — almost no extra decoration; let type, accent and negative space carry it",
      "editorial flourishes — fine rules, a bracket or quote mark, ONE circled keyword; refined and considered",
    ],
  },
  playful: {
    world: [
      "editorial-paper — warm off-white / cream, ink-on-paper with fine ruled lines, circled words and generous margins; elements feel placed and hand-composed",
      "playful line-art — light background with hand-drawn doodle lines, squiggles, little arrows and tiny stars framing the content; friendly and cute",
      "curvy organic — soft pastel curved colour shapes / blobs and rounded forms flowing behind the content; bouncy and approachable",
      "sticker collage — clean background with cut-out 'sticker' cards, rounded outlines and soft drop-shadows, a couple of playful badges",
      "retro editorial — bold rules and dividers, oversized circled / underlined words, a confident graphic-zine feel",
      "confetti-accent — mostly clean with tasteful scattered graphic confetti (dots, squiggles, small zigzags) in the accent colour",
    ],
    energy: [
      "bold & playful — confident, expressive and fun (still tasteful, never messy)",
      "fun & punchy — lively, characterful and a little cheeky",
      "vibrant & expressive — energetic colour and graphic motion, eye-catching",
      "friendly & approachable — soft, warm and gentle",
    ],
    through: [
      "a hand-drawn curvy line / squiggle that flows continuously from panel to panel",
      "doodle connectors — little arrows, dotted lines and circled highlights leading panel to panel",
      "a thin accent ribbon weaving smoothly across all panels",
      "a soft numbered 01–0N timeline ribbon along the bottom, tying all panels together",
    ],
    decoration: [
      "tasteful decorative marks — a few thin curved lines / underlines, ONE circled or underlined emphasis word, the odd small star or sparkle; sparingly, never cluttered",
      "soft graphic accents — rounded shapes, a gentle squiggle or a little arrow pointing at the key element; light and cute",
      "playful doodles — hand-drawn squiggles, a small star/sparkle and an underline on the emphasis word; cute but tasteful",
    ],
  },
  bold: {
    world: [
      "brand-saturated — a confident flat field of the product's primary colour (or a strong duo), high-contrast and campaign-ready",
      "colour-block — two or three bold blocks of colour splitting the frame; strong graphic geometry",
      "dark high-contrast — deep near-black with ONE punchy accent and bright white type",
      "poster — a single loud colour field, oversized type dominating, minimal else",
    ],
    energy: [
      "loud & confident — big, punchy, scroll-stopping",
      "high-energy — bold, direct, high-contrast",
      "assertive & modern — strong, clean, unmissable",
    ],
    through: [
      "a heavy colour band or bar carrying across all panels",
      "an oversized display headline that continues its energy panel to panel",
      "no explicit connector — unity from the loud shared colour and type",
    ],
    decoration: [
      "minimal — the bold colour + oversized type do all the work",
      "one hard graphic element (a thick rule, a filled shape, a big arrow) per slide",
    ],
  },
  gradient: {
    world: [
      "vibrant gradient mesh — a smooth modern multi-stop gradient (brand hues), techy and premium",
      "glassy — a soft gradient with frosted-glass panels / cards floating on it, glossy and modern",
      "aurora — soft flowing gradient light on a dark base, glowing and futuristic",
      "soft duotone gradient — two brand tones blending edge to edge, clean and current",
    ],
    energy: [
      "modern & premium — sleek, glossy, confident",
      "futuristic & smooth — clean tech energy",
      "vibrant & fresh — energetic but refined",
    ],
    through: [
      "the gradient itself flowing continuously across all panels",
      "a thin glowing accent line weaving through the set",
      "soft floating glass cards recurring panel to panel",
    ],
    decoration: [
      "subtle glow / soft light blooms around the focal element",
      "frosted-glass chips and thin luminous strokes, sparingly",
    ],
  },
  mono: {
    world: [
      "monochrome editorial — a single-hue world (greys or one brand tone), refined and gallery-like",
      "duotone — two-tone treatment across photos and fields, cohesive and premium",
      "black-and-white press — crisp B&W with ONE tiny accent, newspaper-editorial",
      "tinted paper mono — a single soft tint over everything, quiet and considered",
    ],
    energy: [
      "refined & editorial — restrained, elegant, gallery-grade",
      "quiet & premium — calm, confident, minimal",
      "considered & modern — precise and cohesive",
    ],
    through: [
      "a thin hairline rule system running across the panels",
      "the single unifying tone carrying edge to edge",
      "no explicit connector — unity from the monochrome world and type",
    ],
    decoration: [
      "minimal — one hairline rule or a small index number, nothing more",
      "fine editorial flourishes — a bracket, a rule, ONE emphasised word",
    ],
  },
} satisfies Record<string, { world: string[]; energy: string[]; through: string[]; decoration: string[] }>;

export type CarouselConcept = keyof typeof CONCEPTS;
export const CAROUSEL_CONCEPTS = Object.keys(CONCEPTS) as CarouselConcept[];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** One random pick per axis → the STYLE LOCK injected into every slide of this run. */
export function makeStyleLock(concept: CarouselConcept): string {
  const c = CONCEPTS[concept];
  const decoNote = concept !== "clean" ? " — applied (tastefully) on EVERY slide" : "";
  return (
    `STYLE LOCK — apply this ONE cohesive look across every slide (${concept} concept):\n` +
    `• World: ${pick(c.world)}\n` +
    `• Energy: ${pick(c.energy)}\n` +
    `• Type system: ${pick(CAR_SHARED.type)}\n` +
    `• Accent: ${pick(CAR_SHARED.accent)} — on exactly ONE emphasis per slide\n` +
    `• Layout: ${pick(CAR_SHARED.layout)}\n` +
    `• Through-line: ${pick(c.through)}\n` +
    `• Decoration: ${pick(c.decoration)}${decoNote}`
  );
}

// The model NEVER draws a brand mark: the real logo is stamped onto the finished slides by hand
// in Forge (a compositing pass GrowthForge doesn't have) — kept anyway so the model never invents
// one, which is the more common failure mode.
const NO_LOGO =
  "\n\nBRAND LOGO — DRAW NONE: do NOT draw, letter, sketch or imply ANY brand logo, wordmark, app icon or mark " +
  "ANYWHERE on ANY slide — not in a corner, not centred, NOT on the hook, NOT on the CTA. The CTA slide shows ONLY " +
  "its short call-to-action line, no logo. Keep the composition clean and give that space back to the design.";

// Soft background cohesion (independent free mode): close, not identical.
const BG_FAMILY =
  "\n\nBACKGROUND FAMILY: keep every slide's background in the SAME visual family — the same core palette, " +
  "mood and lighting — so the set feels cohesive. They should be CLOSE to each other, NOT pixel-identical; " +
  "gentle variation between slides is fine, just don't switch to a different colour world or theme.";

// Any interface the model invents defaults to a stock palette otherwise.
const UI_COLOUR_LOCK =
  "\n\nUI + CHART COLOUR — ONE ACCENT ACROSS THE WHOLE SET: every interface element you invent or mock up " +
  "(charts, graphs, bars, lines, donuts, sparklines, buttons, pills, tabs, highlights, selection states, badges) " +
  "must use THIS run's accent colour and neutral greys — never a stock default palette: no default blue, no " +
  "default spreadsheet green, no rainbow multi-series. Never let two slides disagree on colour: one accent " +
  "family, greys for everything else.";

// The role words (HOOK / benefit / CTA) are an internal PLAN — never render them as visible text.
const NO_LABELS =
  " NEVER print any internal or planning label as on-slide text: no 'BENEFIT', 'BENEFIT 1/2/3', 'HOOK', 'CTA', " +
  "'STEP', 'SLIDE 1/2/3' or a slide number anywhere. Those words are instructions to you, NOT copy. If a slide " +
  "uses a small eyebrow / kicker, it must be a REAL topic word (e.g. 'Integrations', 'Insights'), never a label " +
  "like 'Benefit 1'.";

function languageDirective(language: string): string {
  const lang = language.trim();
  if (!lang || lang.toLowerCase() === "auto" || lang.toLowerCase() === "english") return "";
  return (
    `\n\nLANGUAGE: render ALL on-image text (headlines, body, CTAs, UI copy) in ${lang}, ` +
    "natural and correctly spelled for a native reader; keep the brand name in its original form."
  );
}

// Distinct typographic COMPOSITIONS for text-only slides, so no two text slides share a recipe.
const TEXT_TREATMENTS = [
  "a GIANT one- or two-word statement filling most of the panel, with a small support line beneath",
  "a stacked multi-line headline (3–4 short lines, each ranged left), with a tiny support line under it",
  "built around a BIG NUMBER / stat as the hero — a huge figure + a few words, support line small",
  "a bold QUESTION or provocation in large type, answered by the support line below it",
  "an oversized headline that runs to the very edge and bleeds off one side — asymmetric, editorial",
  "a calm, centred, spacious statement — lots of negative space, ONE accent word, minimal support line",
  "a two-part 'X → Y' or 'from … to …' line, the two halves contrasted in weight or on two lines",
];

function textTreatment(k: number, n: number, mode: Mode): string {
  let ordinal = 0;
  for (let j = 2; j < k; j++) if (j < n && !middleShowsScreen(j, n, mode)) ordinal++;
  return TEXT_TREATMENTS[ordinal % TEXT_TREATMENTS.length];
}

export type Mode = "screens" | "mixed" | "text";

/** Does THIS middle slide show a product screen, or is it text-only? (hook & CTA handled separately). */
export function middleShowsScreen(k: number, n: number, mode: Mode): boolean {
  if (mode === "text") return false;
  if (mode === "mixed") return (k - 2) % 2 === 0;
  return true;
}

function benefitRole(k: number, n: number, mode: Mode, unit: string): string {
  if (middleShowsScreen(k, n, mode)) {
    return (
      `ONE benefit — a short benefit headline + ONE relevant product screen shown LARGE and fully legible (a ` +
      `tight crop of the single component that proves it). It MUST be a VISIBLY DIFFERENT screen from every ` +
      `other ${unit} — never reuse a screen, never repeat the hook ${unit}'s screen, never two ${unit}s alike`
    );
  }
  return (
    `ONE benefit — a BOLD TEXT-ONLY ${unit} (NO product UI), composed as ${textTreatment(k, n, mode)}. ONE ` +
    `benefit message with ONE accent word, set in the brand type on the clean background. Draw NO screenshot, ` +
    `app window, device frame or UI panel on this ${unit} — pure editorial typography with generous negative ` +
    `space. Its TYPOGRAPHIC COMPOSITION, scale and emphasis MUST be clearly different from every other text ` +
    `${unit} (not just different words) — vary the type size, line count and placement so no two text ${unit}s look alike`
  );
}

function roleOf(k: number, n: number, mode: Mode, unit: string): string {
  if (k === 1) {
    return "the HOOK — a bold display headline with ONE accent word + a LARGE hero / main visual (shown big, not a tiny component)";
  }
  if (k === n) {
    return (
      "the CTA — ONE short call-to-action line set as plain TYPE, and nothing else. NO brand wordmark, logo, " +
      "mark or lettered product name. NO container of any kind around it: no card, plate, chip, badge, panel, " +
      "rounded box or outlined frame. NO fake button, pill, tappable-looking control or link chrome — this is " +
      "a still image, it must not imitate UI. The slide still carries the run's world, accent and decoration " +
      "so it feels part of the set (product UI absent or ghosted)"
    );
  }
  return benefitRole(k, n, mode, unit);
}

function screenDirective(k: number, n: number, mode: Mode): string {
  const shows = k === 1 || (k !== n && middleShowsScreen(k, n, mode));
  if (!shows) {
    if (k === n) return " NO product screenshot on this CTA slide — product UI absent or ghosted; one short CTA line only.";
    return " TEXT-ONLY SLIDE: draw NO product screenshot, app window, device frame or UI panel here — pure typography (see the role above).";
  }
  return " Show a product screen DIFFERENT from every other slide and never the hook's; invent a plausible, clean UI consistent with the product description.";
}

/** Independent FREE-mode slide: cohesive set, no step bar / slide numbers. Ported from Forge's `_slide_prompt`. */
export function slidePrompt(brief: string, language: string, styleLock: string, k: number, n: number, mode: Mode): string {
  return (
    brief +
    languageDirective(language) +
    "\n\n" +
    styleLock +
    BG_FAMILY +
    (`\n\nThis is SLIDE ${k} of ${n} in a vertical social CAROUSEL ad — ONE slide of a cohesive SET. ` +
      "COHESION: every slide shares ONE look — the SAME colour palette, type system, accent and footer; keep " +
      "the backgrounds closely related so the set feels unified. " +
      `DESIGN SLIDE ${k} AS ${roleOf(k, n, mode, "slide")}.` +
      screenDirective(k, n, mode) +
      " Make this slide DISTINCT — a different headline and message from every other slide; advance the " +
      "story (hook → a new benefit each middle → CTA). " +
      "NO STEP BAR / NO SLIDE NUMBERS: do NOT add any progress bar, step dots, slide numbers (01, 02 …), " +
      "pagination or footer counter anywhere — keep each slide clean with no slide-number indicator at all." +
      NO_LABELS) +
    UI_COLOUR_LOCK +
    NO_LOGO
  );
}
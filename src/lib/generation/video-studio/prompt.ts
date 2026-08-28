import { TEMPLATES } from "./templates";

// Ported from Forge's video-templates.ts helpers (featureContext / realismDirective /
// buildVideoPrompt). The UGC-identity (`ugcDirective`) and per-template CONCEPTS/VARIATIONS
// cast-pool systems are NOT ported — GrowthForge has no avatar roster and generates one
// take per asset rather than a concept×variation grid, so both are always no-ops here.

/** Product/feature context — keeps the spoken lines and the brand name grounded and correctly pronounced. */
function featureContext(details: string, brand: string): string {
  const d = details.trim();
  const b = brand.trim();
  if (!d && !b) return "";
  const ctx = [b ? `Brand / product name: ${b}.` : "", d].filter(Boolean).join("\n");
  return (
    "\n\nPRODUCT / FEATURE CONTEXT (what the on-screen product actually is and does — use this to keep the " +
    "explanation, reactions and spoken lines accurate and specific to it):\n" +
    ctx +
    "\n\nBRAND PRONUNCIATION: whenever the creator SAYS the product's brand name aloud, say it clearly and IN " +
    "FULL, sounding out the EXACT spelling syllable by syllable — never drop a consonant, double a letter, or " +
    "simplify an unusual name into a more common-sounding word. Keep the correct spelling for any on-screen wordmark."
  );
}

// Non-cinematic branch only — none of the ported templates are cinematic.
function realismDirective(audioOn: boolean): string {
  const human =
    "\n\nPHOTOREAL HUMAN — MAKE IT 100% REAL (CRITICAL): Any person on camera must look like a " +
    "REAL human being filmed on a phone — never a 3D render, CGI character, cartoon, video-game " +
    "model, digital avatar or airbrushed influencer. Photorealistic, true-to-life. Real skin with " +
    "natural texture — visible pores, fine lines, slight asymmetry, a little natural shine, the odd " +
    "blemish or flyaway hair — NOT smoothed, waxy, plastic or beauty-filtered. Shot on a modern " +
    "smartphone front camera: natural handheld micro-shake, real-lens look, a little sensor grain / " +
    "noise in the shadows, natural (non-studio) light, subtle motion blur. NOT MIRRORED: even on a " +
    "front / selfie camera the video is NOT mirror-flipped — any on-screen, product or background TEXT " +
    "reads correctly left-to-right, never reversed or backwards. Candid, unposed, " +
    "everyday-person energy; natural blinks, micro-expressions and eye movement; anatomically correct " +
    "hands and face. NEGATIVES: any 3D / CGI / rendered / cartoon / anime / video-game look; waxy, " +
    "plastic, rubbery, over-smoothed or airbrushed skin; a beauty-filter glow or HDR sheen; dead, " +
    "glassy or uncanny eyes; a doll-like, mannequin or too-perfect model face; warping, melting or " +
    "morphing features; deformed or extra fingers; an over-saturated, too-clean 'AI-generated' look; " +
    "flawless studio polish.";
  const voice = audioOn
    ? "\n\nVOICE — REAL, NOT ROBOTIC (CRITICAL): The generated voice must sound like a real person " +
      "talking casually to their phone — warm, natural and conversational, in an everyday real-person " +
      "accent (neutral unless the creator profile implies otherwise), clearly matching the person's " +
      "apparent age and gender. Natural cadence at a real-time, up-to-speed conversational PACE (never " +
      "slow, sleepy or dragged-out): real breaths, small pauses, and the occasional filler word or tiny " +
      "stumble — NOT an announcer, NOT a narrator read, NOT studio-perfect, NOT text-to-speech. Keep each spoken line short (roughly five to ten words) so the lip-sync stays " +
      "tight; SPEAK the quoted lines from the shot list in this real voice, and let the whole face react " +
      "to the speech (brow, cheeks, head), not just the mouth. Pronounce any brand or product NAME exactly as written — letter for letter, do NOT add, drop or double letters (a name ending in '-tly' stays '-tly', it is NOT '-tty'); say the whole name clearly, never clipped, slurred or mangled. NEGATIVES: a mispronounced, clipped or misspelled brand / product name; a robotic, monotone, synthetic" +
      "or text-to-speech voice; an announcer / e-learning / advertisement-narrator tone; over-enunciated " +
      "or exaggerated mouth shapes; gibberish or nonsense words; garbled, flapping or out-of-sync lips; " +
      "teeth or mouth morphing; a slow, sluggish, sleepy or dragged-out delivery; a voice that doesn't match the person on screen."
    : "\n\nNo voice track is generated here (a voiceover is added in post), but any person on camera must " +
      "still look genuinely mid-conversation — natural, continuous talking motion, never silent-and-frozen.";
  const motion =
    "\n\nDELIVERY & MOTION: Whenever a person is on camera they must be talking NATURALLY and CONTINUOUSLY " +
    "the whole time they are in frame — a real conversational rhythm with constant micro-movement (natural " +
    "mouth movement mid-sentence, small head tilts, hand gestures, eyebrow raises, blinks). They must NEVER " +
    "freeze, go static, fall silent, hold a closed or blank mouth, or pause awkwardly — no dead air and no " +
    "still 'photo' moments." +
    "\n\nONE VOICE AT A TIME + CLEAN ENDING (CRITICAL): only ONE voice ever speaks at a moment — NEVER two " +
    "people (or two characters) talking at the same time, not even for a fraction of a second; there is no " +
    "overlapping dialogue, echo or crosstalk. Pace the dialogue to FINISH and settle a beat EARLY — the " +
    "video must feel complete and land its final line (with a short breath/hold after it) comfortably BEFORE " +
    "the length cap; it must never feel rushed, clipped mid-word, or cut off at the very end.";
  return human + voice + motion;
}

export function buildVideoPrompt(opts: { templateKey: string; details?: string; brand?: string; audioOn?: boolean }): string {
  const base = TEMPLATES[opts.templateKey]?.prompt ?? TEMPLATES.auto.prompt;
  return base + featureContext(opts.details ?? "", opts.brand ?? "") + realismDirective(opts.audioOn ?? true);
}

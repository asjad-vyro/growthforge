// Ported from Forge's Video Studio (apps/web/lib/video-templates.ts, Vyro-ai/forge) — the
// original "12 backcoded templates" set: the 11 that share the mkUgcVideo() master template
// (kept byte-identical) plus their own per-template parameters. `game_explainer` (its own
// ~100-line bespoke prompt) and every template added to that file since (zine/showcase/
// cinematic/brand-specific ones, several literally naming ImagineArt/Fable/Seedance) are NOT
// ported — they don't generalize to an arbitrary GrowthForge customer product.
export interface VideoTemplate {
  name: string;
  aspect: string;
  duration: string;
  prompt: string;
}

interface MkUgcVideoArgs {
  kind: string;
  noun: string;
  format: string;
  profileHeader: string;
  profile: string;
  setting: string;
  arc: string;
  beats: string;
  energy: string;
  shots: string;
}

function mkUgcVideo(o: MkUgcVideoArgs): string {
  const noun = o.noun;
  const NOUN = noun.toUpperCase();
  return `Generate a 15-second ${o.kind}.
Aspect ratio: 9:16 (vertical, phone-native).
${o.format}

This is a MULTI-SHOT, MULTI-ANGLE video — NOT a single continuous take. It is cut
together from several handheld shots filmed in the SAME space at DIFFERENT angles and
framings, in the natural jump-cut style real creators use. IMPORTANT: the multiple
angles apply to the ${NOUN} and the ROOM only. The product UI is shown in exactly ONE
continuous, steady shot — never across multiple cuts or angles — so the interface is
rendered once and stays identical to the reference.

NO captions. NO text overlays. NO burned-in subtitles. NO lower-thirds. NO title
cards. NO text of any kind appears on screen at any point. The ${noun}'s voice and the
product carry the entire video. Pure visual UGC — no on-screen text whatsoever.

PRODUCT UI CONSISTENCY — TOP PRIORITY:
Reproducing the product UI EXACTLY and CONSISTENTLY is the single most important
requirement of this video. Treat the attached reference as a FIXED, FROZEN image.
Every frame in which the laptop screen is visible must show the identical interface —
same layout, same components, same colourway, same on-screen copy, character for
character, pixel for pixel. The UI must NOT change, morph, flicker, warp, re-layout,
re-render, scramble its text, or look different between any two frames or any two
shots. It does not animate, scroll to new content, load, or navigate to another view.
It is the same static reference screen, held steady, the entire time it is on camera.

PRODUCT REFERENCE:
Use the attached product screen image as the exact visual reference for the product
UI. The interface on the ${noun}'s LAPTOP screen must match this reference exactly —
same design system, same colourway, same components, same on-screen copy. Do NOT
fabricate, alter, simplify, reimagine, or regenerate the UI in any way. The product is
shown ON A LAPTOP — never on a phone. The interface is RENDERED INSIDE the laptop's
screen, bounded by the screen bezel and filling the display — it is NEVER a floating
card, window, document, panel or image hovering above, beside, in front of or outside
the laptop, and it NEVER spills past the screen edges. NOT MIRRORED: even though the shot is a
front-facing selfie, the frame is NOT mirror-flipped — the laptop's UI and ALL on-screen text read
correctly left-to-right, never reversed, flipped or backwards. During the reveal, show the screen LARGE and
close to FLAT-ON so the interface fills most of the laptop and its text stays sharp and
clearly readable — never small, angled, blurred or low-resolution. Render the UI crisp
and high-contrast; legible text on the screen matters more than any camera flourish.

${o.profileHeader}:
${o.profile}

SETTING:
${o.setting}

SHOT LIST — UP TO 15 SECONDS, MULTI-SHOT / MULTI-ANGLE (REAL-TIME, UNHURRIED):
Cut from several handheld shots in one space. ${o.arc} The MULTIPLE ANGLES apply to
the talking beats; the product UI gets exactly ONE clean, steady, continuous shot.
FEW beats, each given room to land, beat a rushed run through everything — the footage
plays in real time, never sped up; the ${noun} finishes the last line and settles a
beat early rather than cramming.

${o.shots}

CAMERA AND MOTION:
Handheld throughout — natural micro-shake in every shot. Never a locked-off tripod,
never gimbal-smooth. MULTIPLE ANGLES apply to the ${NOUN} and the ROOM — front-facing
selfie, a three-quarter side angle, an over-the-shoulder turn toward the laptop, back
to selfie; this variety makes it feel real. The PRODUCT UI is shown in exactly ONE
shot (the reveal), never across multiple cuts or angles, held steady. Transitions
between the talking shots are casual, organic jump cuts — never slick or cinematic;
same room, new angle. During the reveal the camera holds steady on the screen —
minimal motion, near flat-on, fully legible; no push-in or pan that distorts the UI,
no second angle on the screen. The product is on a LAPTOP only — never a phone. No
drone, wide cinematic, rack focus, dolly, crane or gimbal moves. No cuts to other
locations — one continuous environment.

LIGHTING:
Natural or warm ambient light, ideally a window from one side; slight warmth reads as
authentic. No three-point lighting, colour gels or softboxes; slight grain in the
shadows is fine. During the reveal the laptop screen is evenly lit and fully legible —
no glare, reflection or hotspot washing out the UI, and not too dark to read. A clean,
readable interface is essential for consistency.

AUDIO:
The ${noun}'s voice is the primary and only intentional audio — clear enough to
understand but not studio-perfect, with slight room ambience, natural breathing and
the occasional micro-pause. Quiet room tone underneath at a very low level. No
background music. No voiceover. No narrator. The ${noun} speaks directly — their voice
carries the video.

UGC AUTHENTICITY MARKERS (all must be present):
The multi-angle cuts on the talking beats feel natural and unpolished — real reframes
to new handheld angles, not a slick edit. At least one natural imperfection: a slight
speech stumble, a blink at a cut, a hand briefly entering frame, or a small re-frame
as the ${noun} adjusts. The background shows one or two real objects — never blank,
never branded, never a studio backdrop. The ${noun} glances away from camera ONCE —
toward the laptop or to recall a thought — then back. The reveal feels spontaneous —
the ${noun} turns the laptop mid-sentence, as if just remembering to show it — but
then HOLDS the screen steady for a clean, consistent look at the UI. ${o.energy}
The energy reads like a real person talking to a friend — never performed, never a pitch.

PRODUCT FIDELITY (STRICT — NO DRIFT):
The product UI on the laptop matches the attached reference EXACTLY and IDENTICALLY in
every frame it is visible — same layout, colourway, components and on-screen copy,
character for character, pixel for pixel. The interface is NOT reimagined, simplified,
recoloured, approximated, animated or regenerated; it does not morph, flicker, warp,
melt, shift, re-layout, or change its text/numbers between frames or shots. Only the
natural viewing angle and minor handheld micro-motion may affect how it appears — the
underlying UI is byte-for-byte the reference. PREFER A STILL SCREEN: the laptop's
on-screen content is held completely STILL — one fixed view of the interface, no
scrolling, typing, loading or animating inside the screen; the life of the shot comes
from the ${noun}, the handheld shake and the cuts, never from the UI moving. A steady,
static screen reads cleaner and distorts far less than a "live" moving interface.
The laptop screen is the only moment
text appears in the video: the real product UI from the reference, exactly as shown,
nothing added or removed.

NEGATIVES: Avoid — the product UI changing, morphing, flickering, warping, melting,
shifting, re-laying-out, re-rendering, or looking different between any two frames or
shots; the interface shown across multiple cuts or angles (it must be ONE steady
shot); the screen scrolling, navigating, loading or animating to a different view; UI
text, labels or numbers changing, scrambling, garbling or becoming illegible;
hallucinated, fabricated, simplified or altered UI elements; lorem-ipsum or
placeholder strings; UI copy that differs from the reference in any way; the product
appearing on a PHONE instead of the laptop; the whole frame or the laptop UI MIRROR-FLIPPED
(reversed / backwards text — a selfie-mirror flip); the product UI duplicated, mirrored, ghosted,
split or shown twice anywhere in the frame, or as a floating card / overlay / second screen
off the laptop; the screen cropped, stretched, squished or warped from its native shape; any text overlay, caption, subtitle,
lower-third, title card or on-screen text outside the product's real UI; a single
static one-shot take for the whole video (the talking beats must use multiple angles);
studio lighting or three-point setups; a locked-off tripod; gimbal-smooth motion;
slick or cinematic transitions; a blank or branded backdrop; the ${noun} looking like
a model or actor; corporate or scripted delivery; teleprompter stiffness; branded end
cards or logo bugs; drone, rack focus, dolly or crane moves; background music; a
voiceover replacing the ${noun}'s speech; the reveal feeling rehearsed or staged; the
laptop screen too dark, glared or angled to be legible; a push-in or pan during the
reveal that distorts the UI; multiple locations or background changes; the footage
sped up, time-lapsed or fast-forwarded to fit everything in (real-time only); the
video running longer than 15 seconds; flat, performed energy.

ABSOLUTE RULES:
Reproducing the product UI exactly and CONSISTENTLY is the top priority — shown in
exactly ONE continuous, steady shot, frozen and identical to the reference in every
frame, never changing, morphing or re-rendering across cuts. No text, captions,
overlays or subtitles; the product UI on the ${noun}'s LAPTOP is the only text in the
video and it matches the reference exactly with zero fabrication or drift. The product
is on a laptop, never a phone. This is an up-to-15-second vertical (9:16) ${o.kind}, built as
a MULTI-SHOT, MULTI-ANGLE handheld edit — multiple angles on the ${noun} and room, ONE
clean shot on the product. Four beats: ${o.beats}. The ${noun} speaks directly to
camera throughout. Handheld, authentic, casual; one lived-in location; natural light;
no music; no captions; no branded elements. Real-time pacing — finish and settle a
beat early, never rush, never speed up. Authenticity is the creative value; UI
consistency is the technical non-negotiable. Prioritise motion realism and
natural human movement fidelity.`;
}

const CREATOR_PROFILE =
  "A real-feeling everyday person — not a model, not an actor, not corporate-looking. Casual clothing, natural hair, an expressive face. Age 22–38. Relatable, energetic, genuinely enthusiastic. No heavy makeup, no studio lighting, no teleprompter stiffness — the kind of person whose recommendation you would actually trust.";
const CREATOR_SETTING =
  "A real, lived-in space — a home-office desk, a kitchen counter, a coffee-shop corner, a couch. Slightly warm and styled but not staged. A laptop is present — the device that shows the product. One or two recognisable real objects in the background (a coffee cup, a plant, books), never a blank wall or branded backdrop. One single location throughout — only the camera angle changes.";

export const TEMPLATES: Record<string, VideoTemplate> = {
  ugc_testimonial: {
    name: "UGC Testimonial — multi-angle, product on laptop",
    aspect: "9:16",
    duration: "15",
    prompt: mkUgcVideo({
      kind: "UGC-style testimonial video",
      noun: "creator",
      format:
        "The creator speaks directly to camera in a casual, authentic, slightly-imperfect style — organic content that performs on TikTok, Instagram Reels and YouTube Shorts. NOT a polished brand ad. It feels real, personal and unscripted: a genuine recommendation from someone who actually uses the product every day.",
      profileHeader: "CREATOR PROFILE",
      profile:
        "A real-feeling everyday person — not a model, not an actor, not corporate-looking. Casual clothing, natural hair, an expressive face. Age 22–38. Relatable, energetic, genuinely enthusiastic. No heavy makeup, no studio lighting, no teleprompter stiffness — the kind of person whose recommendation you would actually trust.",
      setting:
        "A real, lived-in space — a home-office desk, a kitchen counter, a coffee-shop corner, a couch. Slightly warm and styled but not staged. A laptop is present — the device that shows the product. One or two recognisable real objects in the background (a coffee cup, a plant, books, a monitor), never a blank wall or branded backdrop. One single location throughout — only the camera angle changes.",
      arc: "The four beats run hook -> problem -> reveal -> close, joined by casual, organic jump cuts.",
      beats: "hook -> problem -> reveal -> close",
      energy:
        "Energy arc: starts engaged (hook), builds (problem), peaks briefly (reveal reaction), settles warmly (close) — a natural human curve.",
      shots: `SHOT 1 — HOOK (0–2s):
Front-facing selfie, tight on face and shoulders, handheld. The creator opens with a
punchy, curiosity-triggering line — no intro, no "hey guys", straight into the hook.
Slightly leaning in, expressive, spontaneous.
Tone (audio only, never rendered as text): "I cannot believe I used to do this
manually." / "This just saved me three hours today." / "Okay I have to show you this
right now."

SHOT 2 — PROBLEM (2–5s):
JUMP CUT to a new angle — a three-quarter side framing or a small reframe, clearly a
different shot. The creator describes the pain the product solves: conversational,
specific, real language, natural hand gestures, energy building. A subtle handheld
push-in for emphasis.

SHOT 3 — TURN + PRODUCT REVEAL (5–12s) — THE ONE UI SHOT, HELD STEADY:
A SINGLE continuous shot. Mid-sentence, the creator turns toward the laptop and tilts
the screen to camera (or the camera moves in to frame it), then HOLDS — steady and close to flat-on,
fully legible, for the entire beat (a stable hold of at least 4 seconds). The interface
matches the reference EXACTLY and does not change: no scrolling, navigation, loading,
animation, morphing or flicker. The creator reacts with genuine excitement — a small
laugh, a head shake, a "look at this" point — but no gesture changes what is displayed.
Do NOT cut to a second angle or a closer insert of the screen — keep it as ONE shot.
Handheld micro-movement only; the framing on the screen stays stable and legible.

SHOT 4 — CLOSE / CTA (12–15s):
JUMP CUT back to a front-facing selfie (a fresh framing is fine). The creator looks
directly to camera and delivers a punchy, genuine close — slight smile, unhurried.
Tone (audio only, no text on screen): "Genuinely cannot go back to the old way." / "If
you are not using this you are wasting time." / "Link in bio — thank me later."
Land the line, hold a breath, then end — settled by 15 seconds, never clipped.`,
    }),
  },
  founder_story: {
    name: "Founder Story — why I built it, product on laptop",
    aspect: "9:16",
    duration: "15",
    prompt: mkUgcVideo({
      kind: "founder-story video",
      noun: "founder",
      format:
        "The actual founder of the product speaks directly to camera, telling the story of why they built it — sincere, personal, a little raw. Organic founder-story content that performs on TikTok, Instagram Reels, LinkedIn and YouTube Shorts. NOT a polished brand ad or a corporate keynote. It feels real and honest: a maker sharing the problem that pushed them to build this and what it means to them.",
      profileHeader: "FOUNDER PROFILE",
      profile:
        "The real founder/maker — a credible everyday person, not an actor or model. Looks like someone who builds things: smart-casual or plain clothing, natural hair, an earnest, expressive face. Age 24–45. Grounded, passionate and convincing — speaks with conviction and warmth, not hype. No heavy makeup, no studio polish. The kind of founder whose story makes you trust the product.",
      setting:
        "A real workspace where the product was actually built — a home office, a small studio, a startup desk, a kitchen table. Lived-in and a little personal: a laptop (the device that shows the product), sticky notes or a notebook, a coffee, a plant, books. Warm and authentic, never a staged set or branded backdrop. One single location throughout — only the camera angle changes.",
      arc: "The four beats run origin -> problem -> reveal -> mission, joined by casual, organic jump cuts.",
      beats: "origin -> problem -> reveal -> mission",
      energy:
        "Energy arc: starts reflective (origin), sharpens with conviction (problem), warms with quiet pride (reveal), lands grounded and sincere (mission) — a natural human curve.",
      shots: `SHOT 1 — ORIGIN / HOOK (0–2s):
Front-facing selfie, medium-tight on face and shoulders, handheld. The founder opens
with a personal, honest hook — no intro, no "hey guys", straight in. Earnest, a little
understated, leaning slightly toward camera.
Tone (audio only, never rendered as text): "I quit my job to build this." / "I built
this because I was losing hours every single week." / "Everyone told me this was a bad
idea."

SHOT 2 — THE PROBLEM I HIT (2–5s):
JUMP CUT to a new angle — a three-quarter side framing or small reframe. The founder
explains the real, specific problem they personally kept hitting that pushed them to
build it: concrete, honest, conviction building. Natural hand gestures, a subtle
handheld push-in.

SHOT 3 — TURN + PRODUCT REVEAL (5–12s) — THE ONE UI SHOT, HELD STEADY:
A SINGLE continuous shot. Mid-sentence, the founder turns toward the laptop where they
built the product and tilts the screen to camera (or the camera moves in to frame it),
then HOLDS — steady and close to flat-on,
fully legible, for the entire beat (a stable hold of at least 4 seconds). The interface
matches the reference EXACTLY and does not change: no scrolling, navigation, loading,
animation, morphing or flicker. The founder shows it with quiet pride — a small "this
is the thing" beat, a point at one part — but no gesture changes what is displayed. Do
NOT cut to a second angle or a closer insert of the screen — keep it as ONE shot.
Handheld micro-movement only; the framing on the screen stays stable and legible.

SHOT 4 — MISSION / CTA (12–15s):
JUMP CUT back to a front-facing selfie (a fresh framing is fine). The founder looks
straight to camera and shares why it matters and where it's going, with a soft,
sincere CTA — warm, grounded, unhurried.
Tone (audio only, no text on screen): "We're just getting started." / "If it saves you
the time it saved me, I did my job." / "Link's below — I'd genuinely love your
feedback."
Land the line, hold a breath, then end — settled by 15 seconds, never clipped.`,
    }),
  },
  auto: {
    name: "Auto — generic UGC ad (hook → value → reveal → CTA)",
    aspect: "9:16",
    duration: "15",
    prompt: mkUgcVideo({
      kind: "UGC-style ad video",
      noun: "creator",
      format:
        "A real creator speaks directly to camera in a casual, authentic, slightly-imperfect style — organic content that performs on TikTok, Reels and Shorts. NOT a polished brand ad. Use the most natural structure for THIS product: a strong hook, real value, a clean product reveal, and a genuine call to action.",
      profileHeader: "CREATOR PROFILE",
      profile: CREATOR_PROFILE,
      setting: CREATOR_SETTING,
      arc: "The four beats run hook -> value -> reveal -> CTA, joined by casual, organic jump cuts.",
      beats: "hook -> value -> reveal -> CTA",
      energy: "Energy arc: hooks fast, stays warm and genuine, peaks on the reveal, lands on a real CTA.",
      shots: `SHOT 1 — HOOK (0–2s):
Front-facing selfie, tight, handheld. A punchy, curiosity-triggering line — no intro, no
"hey guys", straight in. Tone (audio only): "Okay you need to see this." / "This changed
how I work." / "I wish I found this sooner."

SHOT 2 — VALUE (2–6s):
JUMP CUT to a new angle. The creator says what it does and why it's worth it — specific,
real, conversational; energy building.

SHOT 3 — TURN + PRODUCT REVEAL (6–12s) — THE ONE UI SHOT, HELD STEADY:
A SINGLE continuous shot: mid-sentence, the creator turns/tilts the LAPTOP screen to camera (or the
camera moves in), then HOLDS — steady, flat-on, fully legible — the whole beat. The
interface matches the reference EXACTLY and does not change (no scroll, navigation,
animation, morph or flicker). Genuine reaction, no gesture changes what's displayed. Keep
it ONE shot; handheld micro-movement only.

SHOT 5 — CTA (12–15s):
JUMP CUT back to selfie. A genuine close + call to action. Tone (audio only): "Link's
below." / "Just try it." Land the line, hold a breath, then end — settled by 15 seconds, never clipped.`,
    }),
  },
  problem_solution: {
    name: "Problem → Solution — call out the pain, reveal the fix",
    aspect: "9:16",
    duration: "15",
    prompt: mkUgcVideo({
      kind: "Problem→Solution UGC ad video",
      noun: "creator",
      format:
        "A creator calls out a specific, painful problem, then reveals the product as the fix — the classic problem→solution UGC ad. Relatable, real, a genuine before-the-product frustration that the product clearly solves.",
      profileHeader: "CREATOR PROFILE",
      profile: CREATOR_PROFILE,
      setting: CREATOR_SETTING,
      arc: "The four beats run problem -> agitate -> solution (reveal) -> result, joined by casual jump cuts.",
      beats: "problem -> agitate -> solution -> result",
      energy:
        "Energy arc: opens frustrated/relatable (problem), leans in (agitate), brightens on the reveal, lands satisfied (result).",
      shots: `SHOT 1 — PROBLEM (0–3s):
Front-facing selfie, handheld. The creator names the painful problem the viewer has —
direct and relatable. Tone (audio only): "Still doing this by hand?" / "Tired of wasting
hours on this?"

SHOT 2 — AGITATE (3–5s):
JUMP CUT to a new angle. Twists the knife — how slow / annoying / costly the old way is,
specific and real.

SHOT 3 — TURN + SOLUTION REVEAL (5–12s) — THE ONE UI SHOT, HELD STEADY:
A SINGLE continuous shot: "so I found this" — mid-sentence the creator turns toward the
laptop, the screen is turned/tilted to camera (or camera moves
in) and HELD steady, flat-on, fully legible — showing the product solving that exact
problem. The interface matches the reference EXACTLY and does not change. ONE shot,
handheld micro-movement only.

SHOT 4 — RESULT / CTA (12–15s):
JUMP CUT to selfie. The payoff + CTA. Tone (audio only): "Done in seconds now." / "Link's
below." Land the line, hold a breath, then end — settled by 15 seconds, never clipped.`,
    }),
  },
  speed_demo: {
    name: "Speed demo — watch how fast this is",
    aspect: "9:16",
    duration: "15",
    prompt: mkUgcVideo({
      kind: "speed-demo UGC ad video",
      noun: "creator",
      format:
        "A creator shows how FAST the product is — 'watch how quick this is' — getting the whole thing done in seconds. Snappy, energetic; time/speed is the hero.",
      profileHeader: "CREATOR PROFILE",
      profile: CREATOR_PROFILE,
      setting: CREATOR_SETTING,
      arc: "The four beats run hook -> set-the-clock -> fast-do-it (reveal) -> done, joined by snappy jump cuts.",
      beats: "hook -> clock -> do -> done",
      energy:
        "Energy arc: snappy hook, a quick 'normally this takes ages' beat, peaks on the fast reveal, lands on a clean 'done, that fast'.",
      shots: `SHOT 1 — HOOK (0–2s):
Front-facing selfie, handheld, leaning in. Tone (audio only): "Watch how fast this is." /
"Time me."

SHOT 2 — SET THE CLOCK (2–4s):
JUMP CUT to a new angle. "Normally this takes hours / all afternoon" — sets up the
contrast, energy rising.

SHOT 3 — TURN + FAST DO IT (4–12s) — THE ONE UI SHOT, HELD STEADY:
A SINGLE continuous shot: the creator turns to the laptop mid-sentence and the LAPTOP
screen is held steady, flat-on and fully legible
while the task gets done fast; the creator reacts to the speed ("wait, already?"). The
interface matches the reference EXACTLY and does not change, scroll or morph. ONE shot,
handheld micro-movement only.

SHOT 4 — DONE (12–15s):
JUMP CUT to selfie. "Done. That fast." + CTA. Land the line, hold a breath, then end —
settled by 15 seconds, never clipped.`,
    }),
  },
  before_after: {
    name: "Before / After — the old way vs the new way",
    aspect: "9:16",
    duration: "15",
    prompt: mkUgcVideo({
      kind: "Before/After UGC ad video",
      noun: "creator",
      format:
        "A creator contrasts the OLD painful way with the NEW way using the product — a clear before/after. The 'before' is the messy/slow old method; the 'after' is the clean result with the product.",
      profileHeader: "CREATOR PROFILE",
      profile: CREATOR_PROFILE,
      setting: CREATOR_SETTING,
      arc: "The four beats run before -> turning point -> after (reveal) -> result, joined by casual jump cuts.",
      beats: "before -> turn -> after -> result",
      energy:
        "Energy arc: opens exasperated (before), shifts (turning point), brightens on the after reveal, lands relieved/impressed (result).",
      shots: `SHOT 1 — BEFORE (0–3s):
Front-facing selfie, handheld. The creator shows / describes the OLD way — frustrated,
messy, slow. Tone (audio only): "This is how I used to do it… painful."

SHOT 2 — TURNING POINT (3–5s):
JUMP CUT to a new angle. "Then I tried this" — the shift, curiosity rising.

SHOT 3 — TURN + AFTER REVEAL (5–12s) — THE ONE UI SHOT, HELD STEADY:
A SINGLE continuous shot: mid-sentence the creator turns toward the laptop, the
LAPTOP screen turned/tilted to camera (or camera moves in)
and HELD steady, flat-on, fully legible — the clean AFTER result with the product. The
interface matches the reference EXACTLY and does not change. ONE shot, handheld
micro-movement only.

SHOT 4 — RESULT / CTA (12–15s):
JUMP CUT to selfie. "Night and day." + CTA. Land the line, hold a breath, then end —
settled by 15 seconds, never clipped.`,
    }),
  },
  unboxing: {
    name: "Unboxing / First look — genuine first try",
    aspect: "9:16",
    duration: "15",
    prompt: mkUgcVideo({
      kind: "first-look UGC ad video",
      noun: "creator",
      format:
        "A creator's genuine FIRST look at the product — discovering it live, real first reactions, 'okay let's see if this actually works'. Curious, unscripted, honest.",
      profileHeader: "CREATOR PROFILE",
      profile: CREATOR_PROFILE,
      setting: CREATOR_SETTING,
      arc: "The four beats run intrigue -> first try -> reveal -> verdict, joined by casual jump cuts.",
      beats: "intrigue -> first try -> reveal -> verdict",
      energy:
        "Energy arc: curious (intrigue), a little skeptical (first try), genuinely surprised on the reveal, settles into an honest verdict.",
      shots: `SHOT 1 — INTRIGUE (0–2s):
Front-facing selfie, handheld. Tone (audio only): "Everyone's talking about this, so I'm
trying it." / "Let's see if this is actually worth it."

SHOT 2 — FIRST TRY (2–5s):
JUMP CUT to a new angle. The creator describes opening / first using it — slightly
skeptical, real.

SHOT 3 — TURN + FIRST REACTION REVEAL (5–12s) — THE ONE UI SHOT, HELD STEADY:
A SINGLE continuous shot: the creator turns to the laptop mid-sentence, the LAPTOP
screen held steady, flat-on and fully legible as the
creator sees it work for the first time — genuine reaction ("oh that's actually good").
The interface matches the reference EXACTLY and does not change. ONE shot, handheld
micro-movement only.

SHOT 4 — VERDICT / CTA (12–15s):
JUMP CUT to selfie. An honest verdict + CTA. Tone (audio only): "Yeah, I'm keeping this."
/ "Link's below." Land the line, hold a breath, then end — settled by 15 seconds, never clipped.`,
    }),
  },
  three_reasons: {
    name: "3 Reasons — punchy listicle",
    aspect: "9:16",
    duration: "15",
    prompt: mkUgcVideo({
      kind: "listicle UGC ad video",
      noun: "creator",
      format:
        "A creator gives a punchy numbered list — '3 reasons you need this' — fast and value-packed, each reason a quick beat, landing on the product and a CTA.",
      profileHeader: "CREATOR PROFILE",
      profile: CREATOR_PROFILE,
      setting: CREATOR_SETTING,
      arc: "The four beats run hook -> reason 1 -> reason 2 -> reason 3 + reveal/CTA, joined by snappy jump cuts.",
      beats: "hook -> 1 -> 2 -> 3 + CTA",
      energy: "Energy arc: punchy hook, brisk and confident through the reasons, peaks on reason three over the reveal.",
      shots: `SHOT 1 — HOOK (0–2s):
Front-facing selfie, handheld, energetic. Tone (audio only): "3 reasons you need this." /
"Here's why everyone's switching."

SHOT 2 — REASON 1 (2–5s):
JUMP CUT to a new angle; reason one, counted on fingers, quick and specific.

SHOT 3 — REASON 2 (5–7s):
JUMP CUT to another angle; reason two, brisk.

SHOT 4 — REASON 3 + REVEAL (7–12s) — THE ONE UI SHOT, HELD STEADY:
A SINGLE continuous shot: as the creator gives reason three, the LAPTOP screen is held
steady, flat-on and fully legible showing the product. The interface matches the
reference EXACTLY and does not change, scroll or morph. ONE shot, handheld micro-movement
only.

SHOT 5 — CTA (12–15s):
JUMP CUT to selfie. "Link's below — go." Land the line, hold a breath, then end — settled by 15 seconds, never clipped.`,
    }),
  },
  tutorial: {
    name: "Tutorial / How-to — do X in seconds",
    aspect: "9:16",
    duration: "15",
    prompt: mkUgcVideo({
      kind: "how-to UGC ad video",
      noun: "creator",
      format:
        "A creator quickly teaches HOW to use the product — 'here's how to do X in seconds' — helpful, clear, lightly enthusiastic, product-focused. Feels like a friend showing you, not a manual.",
      profileHeader: "CREATOR PROFILE",
      profile: CREATOR_PROFILE,
      setting: CREATOR_SETTING,
      arc: "The four beats run hook -> setup -> do-it (reveal) -> result, joined by casual jump cuts.",
      beats: "hook -> setup -> steps -> result",
      energy:
        "Energy arc: friendly hook, clear and calm through the setup, satisfying on the do-it reveal, lands on the result.",
      shots: `SHOT 1 — HOOK (0–2s):
Front-facing selfie, handheld. Tone (audio only): "Here's how to do this in seconds." /
"Save this — you'll need it."

SHOT 2 — SETUP (2–5s):
JUMP CUT to a new angle. What you need / the goal, in one clear line.

SHOT 3 — TURN + DO IT (5–12s) — THE ONE UI SHOT, HELD STEADY:
A SINGLE continuous shot: the creator turns to the laptop mid-sentence, the LAPTOP
screen held steady, flat-on and fully legible while
the creator walks the steps on screen. The interface matches the reference EXACTLY and
does not change between frames (no scroll to new content, no morph). ONE shot, handheld
micro-movement only.

SHOT 4 — RESULT / CTA (12–15s):
JUMP CUT to selfie. The finished result + CTA. Tone (audio only): "That easy. Link's
below." Land the line, hold a breath, then end — settled by 15 seconds, never clipped.`,
    }),
  },
  day_in_life: {
    name: "Day in the life — product in the workflow",
    aspect: "9:16",
    duration: "15",
    prompt: mkUgcVideo({
      kind: "day-in-the-life UGC ad video",
      noun: "creator",
      format:
        "A creator folds the product into their real day / workflow — 'a day running my…' — casual, lifestyle, the product as a natural part of getting things done.",
      profileHeader: "CREATOR PROFILE",
      profile: CREATOR_PROFILE,
      setting: CREATOR_SETTING,
      arc: "The four beats run set-the-scene -> the moment -> use it (reveal) -> wrap, joined by casual jump cuts.",
      beats: "scene -> moment -> use -> wrap",
      energy: "Energy arc: easy lifestyle open, a small 'ugh, this task' moment, brightens using the product, wraps warm.",
      shots: `SHOT 1 — SCENE (0–2s):
Front-facing selfie, handheld, relaxed. Tone (audio only): "A day of running my whole
business solo — watch." / "Morning routine, but make it productive."

SHOT 2 — THE MOMENT (2–5s):
JUMP CUT to a new angle. Hits the task that always eats time — the moment the product
helps.

SHOT 3 — TURN + USE IT (5–12s) — THE ONE UI SHOT, HELD STEADY:
A SINGLE continuous shot: the creator turns to the laptop mid-sentence, the LAPTOP
screen held steady, flat-on and fully legible as the
creator uses the product to knock out the task. The interface matches the reference
EXACTLY and does not change. ONE shot, handheld micro-movement only.

SHOT 4 — WRAP / CTA (12–15s):
JUMP CUT to selfie. "Done — and it's not even lunch." + CTA. Hard cut or natural fade at
exactly 15 seconds.`,
    }),
  },
  pov_trend: {
    name: "POV / Trend hook — scroll-stopping native",
    aspect: "9:16",
    duration: "15",
    prompt: mkUgcVideo({
      kind: "POV trend-style UGC ad video",
      noun: "creator",
      format:
        "A trend-style POV hook — 'POV: you just found the tool that…' — native, scroll-stopping, of-the-moment, then it delivers the product. Feels like organic FYP content, not an ad.",
      profileHeader: "CREATOR PROFILE",
      profile: CREATOR_PROFILE,
      setting: CREATOR_SETTING,
      arc: "The four beats run POV hook -> the realisation -> reveal -> CTA, joined by casual jump cuts.",
      beats: "POV -> realise -> reveal -> CTA",
      energy: "Energy arc: instant scroll-stopping POV hook, a 'wait this changes everything' beat, peaks on the reveal, playful CTA.",
      shots: `SHOT 1 — POV HOOK (0–2s):
Front-facing selfie, handheld, direct to camera. Tone (audio only): "POV: you just found
the tool that does this for you." / "POV: you never do this manually again."

SHOT 2 — REALISATION (2–5s):
JUMP CUT to a new angle. The 'wait, this changes everything' beat — what it means for the
viewer.

SHOT 3 — TURN + REVEAL (5–12s) — THE ONE UI SHOT, HELD STEADY:
A SINGLE continuous shot: the creator turns to the laptop mid-sentence, the LAPTOP
screen held steady, flat-on and fully legible
showing the product. The interface matches the reference EXACTLY and does not change,
scroll or morph. ONE shot, handheld micro-movement only.

SHOT 4 — CTA (12–15s):
JUMP CUT to selfie. Playful close + CTA. Tone (audio only): "You're welcome — link's
below." Land the line, hold a breath, then end — settled by 15 seconds, never clipped.`,
    }),
  },
};

export const TEMPLATE_KEYS = Object.keys(TEMPLATES);

"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  BrainMark,
  EditPill,
  Field,
  GhostButton,
  GlintButton,
  LcdCaret,
  Logo,
  StepTitle,
  TextArea,
  TextInput,
} from "@/components/bm";

/* ------------------------------------------------------------------ */
/* Step metadata — mirrors the STEPS table in the design canvas.       */
/* ------------------------------------------------------------------ */

type StepMeta = {
  auto?: true;
  title?: string;
  sub?: string;
  note?: string;
  primary?: string;
  back?: boolean;
  skip?: string;
};

const STEPS: StepMeta[] = [
  {
    auto: true,
    title: "Extracting your brand details…",
    sub: "This will only take a few seconds.",
    note: "We only analyse publicly available information. You can edit everything in the next step.",
  },
  { primary: "Looks good, continue", back: true },
  { primary: "Continue", skip: "We'll use general audience data. Fine-tune this later." },
  { primary: "Continue", skip: "We'll optimise for general engagement." },
  { primary: "Continue", skip: "We'll surface commonsense insights and best practices." },
  { primary: "Continue", skip: "We'll use proven trust signals." },
  { primary: "Looks perfect", back: true },
  {
    auto: true,
    title: "One moment… crafting your first ad",
    sub: "We're using your brand profile to write something tuned to your audience.",
    note: "You can regenerate or edit this any time.",
  },
  { primary: "Finish setup", back: true },
];

const GOALS = [
  "Increase brand awareness",
  "Grow community",
  "Drive more leads",
  "Increase retention",
  "Other",
];
const EXTRACT_LINES = ["Logo", "Colors", "Fonts", "Tone of voice", "Tagline", "USP"];
const CRAFT_LINES = ["Voice: calm", "Angle: daily note", "Hook: quieter mind", "CTA: join free"];

const SOCIAL_KEYS = ["Twitter / X", "Instagram", "YouTube / Other"] as const;
const SOCIAL_PLACEHOLDER: Record<string, string> = {
  "Twitter / X": "https://x.com/yourhandle",
  Instagram: "https://instagram.com/yourhandle",
  "YouTube / Other": "https://youtube.com/@yourchannel",
};

/* Shape returned by /api/onboarding/ingest. */
type Prefill = {
  product_name: string;
  product_description: string;
  usp: string;
  tone_of_voice: string;
  colors: { primary: string; secondary: string; accent: string; background: string; text: string };
  logo_url: string;
  niche_keywords: string[];
  icp: { persona: string; pains: string[]; demographics: string; watering_holes: string[] };
  screenshotPath?: string;
};

/* ------------------------------------------------------------------ */

function Chrome({ step, onHome }: { step: number; onHome: () => void }) {
  const counter = `${step + 2} of 10`;
  const pct = `${Math.round(((step + 2) / 10) * 100)}%`;
  return (
    <div className="relative flex items-center justify-between gap-5 px-[34px] pt-[26px]">
      <Logo size={19} markSize={19} tagline onClick={onHome} />
      <div className="flex items-center gap-3">
        <span className="text-[12px] text-[#1a1a1a]/50">{counter}</span>
        <div className="h-[3px] w-[130px] overflow-hidden rounded-full bg-[#1a1a1a]/15">
          <div className="h-full rounded-full" style={{ width: pct, background: "var(--bm-blue)" }} />
        </div>
      </div>
    </div>
  );
}

/** The beach/LCD loading panel used for both async steps. */
function LoadingPanel({
  meta,
  lines,
  shown,
  error,
}: {
  meta: StepMeta;
  lines: string[];
  shown: number;
  error: string | null;
}) {
  const head = lines === EXTRACT_LINES ? "Extracting…" : "Generating ad…";
  const tail = shown >= lines.length ? "Please wait" : "";
  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: "1600 / 894" }}>
      <Image
        src="/brand/beach-wide.png"
        alt="brain.market handset on a quiet beach"
        fill
        priority
        className="object-cover"
        sizes="(max-width: 1180px) 100vw, 1180px"
      />

      <div className="absolute left-0 right-0 top-0 flex items-center justify-between gap-5 px-[34px] pt-[30px]">
        <Logo size={19} markSize={19} tagline />
      </div>

      {/* Nokia LCD sitting on the phone screen in the photo. */}
      <div
        className="font-nokia absolute overflow-hidden text-left"
        style={{
          left: "40.6%",
          top: "22.5%",
          width: "20.4%",
          height: "32%",
          padding: "2.4% 2%",
          background: "var(--bm-lcd-bg)",
          borderRadius: 3,
          fontSize: "clamp(7px, 1.05vw, 13px)",
          lineHeight: 1.42,
          color: "var(--bm-lcd)",
        }}
      >
        <div>{head}</div>
        {lines.slice(0, shown).map((l) => (
          <div key={l}>{l}</div>
        ))}
        <div>
          {tail}
          <LcdCaret w={5} h={9} />
        </div>
      </div>

      <div className="absolute bottom-[6%] left-1/2 max-w-[78%] -translate-x-1/2 px-[18px] text-center">
        <div
          className="rounded-xl px-[18px] py-[10px] backdrop-blur-[6px]"
          style={{ background: "rgba(255,255,255,0.82)", border: "1px solid rgba(0,0,0,0.06)" }}
        >
          <span className="text-[clamp(10px,1.05vw,12.5px)] leading-[1.5] text-[#1a1a1a]/60">
            {error ?? meta.note}
          </span>
        </div>
      </div>

      <div className="absolute left-1/2 top-[62%] w-full -translate-x-1/2 px-6 text-center">
        <div className="font-instrument text-[clamp(22px,2.6vw,34px)] leading-[1.08] tracking-[-0.02em] text-[#1a1a1a]">
          {meta.title}
        </div>
        <div className="mt-2 text-[clamp(11px,1.1vw,13.5px)] text-[#1a1a1a]/55">{meta.sub}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Wizard() {
  const router = useRouter();
  const params = useSearchParams();
  const seedUrl = params.get("url") ?? "";

  const [screen, setScreen] = useState<"flow" | "done">("flow");
  // With no ?url= there is nothing to extract, so skip straight to the form.
  const [step, setStep] = useState(seedUrl ? 0 : 1);
  const [lcd, setLcd] = useState<{ step: number; n: number }>({ step: -1, n: 0 });
  const [error, setError] = useState<string | null>(null);

  const [prefill, setPrefill] = useState<Prefill | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  // Collected answers
  const [icpWho, setIcpWho] = useState("");
  const [icpPain, setIcpPain] = useState("");
  const [icpGoal, setIcpGoal] = useState("");
  const [goals, setGoals] = useState<number[]>([]);
  const [goalsMore, setGoalsMore] = useState("");
  const [offers, setOffers] = useState("");
  const [pricing, setPricing] = useState("");
  const [reviews, setReviews] = useState("");
  const [socials, setSocials] = useState<Record<string, string>>({
    "Twitter / X": "",
    Instagram: "",
    "YouTube / Other": "",
  });

  const meta = STEPS[step];
  const domain = seedUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "") || "brain.market";
  const ingestStarted = useRef(false);
  const craftStarted = useRef(false);

  /* LCD line ticker while an async step runs. The count is tagged with the step
     it belongs to, so switching steps restarts it without a reset-in-effect. */
  useEffect(() => {
    if (!meta.auto) return;
    const lines = step === 0 ? EXTRACT_LINES : CRAFT_LINES;
    const id = setInterval(
      () =>
        setLcd((cur) =>
          cur.step !== step ? { step, n: 1 } : { step, n: Math.min(cur.n + 1, lines.length) },
        ),
      520,
    );
    return () => clearInterval(id);
  }, [step, meta.auto]);

  /* Step 0 — real brand extraction. */
  useEffect(() => {
    if (step !== 0 || ingestStarted.current) return;
    ingestStarted.current = true;

    (async () => {
      try {
        const res = await fetch("/api/onboarding/ingest", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: `https://${domain}` }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "extraction failed");
        setPrefill(json.prefill as Prefill);
        setError(null);
      } catch (err) {
        // Extraction is best-effort — the user can still fill everything by hand.
        setError(
          `Couldn't read ${domain} automatically (${err instanceof Error ? err.message : "error"}). You can fill this in by hand.`,
        );
      } finally {
        setStep(1);
      }
    })();
  }, [step, seedUrl, domain]);

  /* Step 7 — create the project and kick off the real pipeline run. */
  useEffect(() => {
    if (step !== 7 || craftStarted.current) return;
    craftStarted.current = true;

    void (async () => {
      const pains = [icpPain, ...(prefill?.icp.pains ?? [])].filter(Boolean);
      const keywords = (prefill?.niche_keywords ?? []).filter(Boolean).slice(0, 8);

      const body = {
        name: prefill?.product_name || domain,
        productDescription: prefill?.product_description || `Product at ${domain}`,
        landingPageUrl: seedUrl ? `https://${domain}` : undefined,
        landingPageScreenshotPath: prefill?.screenshotPath,
        usp: prefill?.usp || goalsMore || "Not specified yet",
        icp: {
          persona: icpWho || prefill?.icp.persona || "General audience",
          pains: pains.length ? pains : ["Not specified"],
          demographics: prefill?.icp.demographics ?? "",
          wateringHoles: prefill?.icp.watering_holes ?? [],
        },
        nicheKeywords: keywords.length ? keywords : [domain.split(".")[0] || "product"],
        brandKit: {
          colors: prefill?.colors ?? {
            primary: "#0871E7",
            secondary: "#A9C8DE",
            accent: "#C79A5B",
            background: "#F3F4ED",
            text: "#1a1a1a",
          },
          toneOfVoice: prefill?.tone_of_voice || "Calm, supportive, clear and uplifting.",
          doNotSay: [],
          logoUrl: prefill?.logo_url || undefined,
        },
      };

      try {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "could not create project");
        const id = json.project?.id ?? json.id;
        setProjectId(id);

        // Start the pipeline. A 409 just means a recent run already exists.
        const runRes = await fetch("/api/runs", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ projectId: id }),
        });
        if (!runRes.ok && runRes.status !== 409) {
          const rj = await runRes.json().catch(() => ({}));
          throw new Error(rj.error ?? "could not start run");
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "setup failed");
      } finally {
        setStep(8);
      }
    })();
    // Answers are captured when the step is entered; re-running on each
    // keystroke would restart the pipeline, so step is the only trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const next = () => (step === STEPS.length - 1 ? setScreen("done") : setStep(step + 1));
  const back = () => setStep(Math.max(step - 1, 0));
  const goHome = () => router.push("/");

  function toggleGoal(idx: number) {
    setGoals((list) => {
      const at = list.indexOf(idx);
      if (at >= 0) return list.filter((i) => i !== idx);
      const nextList = list.length >= 2 ? list.slice(1) : list.slice();
      return [...nextList, idx];
    });
  }

  /* ---------------- Done ---------------- */
  if (screen === "done") {
    return (
      <section
        className="relative flex min-h-screen flex-col items-center justify-center px-6 pb-[72px] pt-[120px]"
        style={{ background: "var(--bm-page)" }}
      >
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[900px] -translate-x-1/2"
          style={{
            background:
              "radial-gradient(ellipse at top, rgba(8,113,231,0.12), rgba(8,113,231,0))",
          }}
        />
        <div
          className="relative flex w-full max-w-[560px] flex-col items-center gap-6 text-center"
          style={{ animation: "dotPanelIn 0.7s cubic-bezier(0.16,1,0.3,1) both" }}
        >
          <Image
            src="/brand/phone-3-right.png"
            alt="brain.market handset"
            width={190}
            height={300}
            className="h-auto w-[140px]"
          />
          <div className="font-instrument text-[clamp(38px,5vw,56px)] leading-[0.9] tracking-[-0.03em] text-[#1a1a1a]">
            You&apos;re all set.
          </div>
          <div className="max-w-[420px] text-[16px] leading-[1.6] text-[#1a1a1a]/65">
            Your first ad is ready. brain.market keeps the distribution running while you stay
            calm.
          </div>
          <div className="flex items-center gap-3.5">
            <GhostButton onClick={goHome} className="!rounded-full !px-[26px] !py-[14px]">
              Back to home
            </GhostButton>
            <GlintButton onClick={() => router.push("/canvas")} padding="15px 30px" fontSize={15}>
              Open your canvas
            </GlintButton>
          </div>
          <span
            onClick={() => {
              setScreen("flow");
              setStep(1);
            }}
            className="cursor-pointer text-[12.5px] text-[#1a1a1a]/50"
          >
            Review brand profile again
          </span>
        </div>
      </section>
    );
  }

  /* ---------------- Flow ---------------- */
  return (
    <section
      className="relative flex min-h-screen flex-col items-center px-6 pb-[56px] pt-[44px]"
      style={{ background: "var(--bm-app)" }}
    >
      <div
        className="relative w-full max-w-[1180px] overflow-hidden rounded-[26px]"
        style={{
          border: "1px solid rgba(0,0,0,0.07)",
          background: "linear-gradient(180deg, #F4FAFF 0%, #FAFCFD 45%, #FEFEFC 100%)",
          boxShadow: "0 12px 24px rgba(176,175,175,0.25)",
        }}
      >
        {meta.auto ? (
          <LoadingPanel
            meta={meta}
            lines={step === 0 ? EXTRACT_LINES : CRAFT_LINES}
            shown={lcd.step === step ? lcd.n : 0}
            error={error}
          />
        ) : (
          <div className="relative flex min-h-[640px] flex-col">
            {/* Beach wash along the bottom edge. */}
            <div
              className="pointer-events-none absolute bottom-0 left-0 right-0 h-[46%] opacity-90"
              style={{
                backgroundImage: "url('/brand/beach-bottom.png')",
                backgroundSize: "cover",
                backgroundPosition: "center 30%",
                WebkitMaskImage:
                  "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 34%, rgba(0,0,0,0) 100%)",
                maskImage:
                  "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 34%, rgba(0,0,0,0) 100%)",
              }}
            />

            <Chrome step={step} onHome={goHome} />

            <div className="relative flex flex-1 flex-col items-center px-[34px] pb-[26px] pt-[30px]">
              {error && step === 1 && (
                <div className="mb-4 w-full max-w-[860px] rounded-xl border border-[#0871E7]/20 bg-[#0871E7]/5 px-4 py-3 text-[12.5px] text-[#1a1a1a]/70">
                  {error}
                </div>
              )}

              {step === 1 && <BrandProfile prefill={prefill} site={domain} />}
              {step === 2 && (
                <Panel width={620}>
                  <Head badge="Optional" sub="This helps us create content that truly connects.">
                    Tell us about your
                    <br />
                    ideal customer
                  </Head>
                  <Field label="Who is your ideal customer?" required hint="Be specific about their age, role and lifestyle.">
                    <TextInput value={icpWho} onChange={(e) => setIcpWho(e.target.value)} placeholder="e.g. Students, remote workers, founders" />
                  </Field>
                  <Field label="What are their biggest challenges?" required hint="What keeps them up at night?">
                    <TextInput value={icpPain} onChange={(e) => setIcpPain(e.target.value)} placeholder="e.g. Overwhelm, loneliness, lack of focus" />
                  </Field>
                  <Field label="What do they want to achieve?" required hint="What does success look like for them?">
                    <TextInput value={icpGoal} onChange={(e) => setIcpGoal(e.target.value)} placeholder="e.g. Build habits, feel less alone, stay consistent" />
                  </Field>
                </Panel>
              )}
              {step === 3 && (
                <Panel width={620}>
                  <Head badge="Optional" sub="Helps us align content with what matters most.">
                    What are your
                    <br />
                    business goals?
                  </Head>
                  <div className="flex flex-col gap-2.5">
                    <span className="text-[12.5px] font-medium text-[#1a1a1a]/75">
                      Primary goal <span className="text-[#1a1a1a]/45">(select up to 2)</span>
                    </span>
                    <div className="grid grid-cols-2 gap-2.5">
                      {GOALS.map((label, idx) => {
                        const on = goals.includes(idx);
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => toggleGoal(idx)}
                            className="cursor-pointer rounded-[10px] px-3.5 py-3 text-center text-[13px] transition-colors"
                            style={{
                              border: `1px solid ${on ? "#0871E7" : "rgba(0,0,0,0.10)"}`,
                              background: on ? "#0871E7" : "rgba(255,255,255,0.9)",
                              color: on ? "#FFFFFF" : "rgba(26,26,26,0.75)",
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <Field label="Tell us more" optional>
                    <TextArea rows={3} value={goalsMore} onChange={(e) => setGoalsMore(e.target.value)} placeholder="Any specific goals or targets?" />
                  </Field>
                </Panel>
              )}
              {step === 4 && (
                <Panel width={620}>
                  <Head badge="Optional" sub="Share your offers, pricing or promotions.">
                    What are you currently
                    <br />
                    offering?
                  </Head>
                  <Field label="Current offers or plans" hint="Include any limited-time offers or key benefits.">
                    <TextInput value={offers} onChange={(e) => setOffers(e.target.value)} placeholder="e.g. Free trial, 30% off annual plan, referral bonus" />
                  </Field>
                  <Field label="Pricing" optional hint="Helps us highlight value in the right places.">
                    <TextInput value={pricing} onChange={(e) => setPricing(e.target.value)} placeholder="e.g. Free, $4.99/month, Premium plans" />
                  </Field>
                </Panel>
              )}
              {step === 5 && (
                <Panel width={620}>
                  <Head sub="Reviews, testimonials and social links build trust.">
                    Add social proof
                    <br />
                    (optional)
                  </Head>
                  <Field label="Top reviews or testimonials" hint="We'll use these in your ads and content.">
                    <TextArea rows={3} value={reviews} onChange={(e) => setReviews(e.target.value)} placeholder="Paste reviews or what your users say" />
                  </Field>
                  <div className="flex flex-col gap-3">
                    <span className="text-[12.5px] font-medium text-[#1a1a1a]/75">
                      Social media &amp; community links
                    </span>
                    {SOCIAL_KEYS.map((k) => (
                      <div key={k} className="flex flex-col gap-[5px]">
                        <span className="text-[11.5px] text-[#1a1a1a]/50">{k}</span>
                        <TextInput
                          value={socials[k]}
                          onChange={(e) => setSocials((s) => ({ ...s, [k]: e.target.value }))}
                          placeholder={SOCIAL_PLACEHOLDER[k]}
                          style={{ paddingTop: 12, paddingBottom: 12, fontSize: 13 }}
                        />
                      </div>
                    ))}
                    <span className="text-[11.5px] text-[#1a1a1a]/45">
                      Keep people first and trust your proof.
                    </span>
                  </div>
                </Panel>
              )}
              {step === 6 && (
                <Panel width={640}>
                  <Head sub="Here's everything we've captured so far.">
                    Your brand
                    <br />
                    profile summary
                  </Head>
                  <div className="flex flex-col gap-2.5">
                    {[
                      { label: "Brand details", value: "Logo, colors, fonts, tagline, USP", to: 1 },
                      { label: "Ideal customer", value: short(icpWho, "Details, mindset, preferences"), to: 2 },
                      {
                        label: "Business goals",
                        value: goals.length
                          ? goals.map((i) => GOALS[i]).join(", ")
                          : "Grow community, increase retention",
                        to: 3,
                      },
                      { label: "Offers", value: short(offers, "Free plan, Premium from $4.99/mo"), to: 4 },
                      { label: "Social proof", value: short(reviews, "Not added yet"), to: 5 },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center justify-between gap-3.5 rounded-[14px] px-4 py-[13px]"
                        style={{ background: "rgba(255,255,255,0.88)", border: "1px solid rgba(0,0,0,0.07)" }}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className="h-[30px] w-[30px] flex-none rounded-full"
                            style={{ background: "radial-gradient(circle at 32% 30%, #BEDCF9, #7FA9D8)" }}
                          />
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <span className="text-[13.5px] font-medium text-[#1a1a1a]">{row.label}</span>
                            <span className="text-[12px] leading-[1.45] text-[#1a1a1a]/50">{row.value}</span>
                          </div>
                        </div>
                        <EditPill onClick={() => setStep(row.to)} />
                      </div>
                    ))}
                  </div>
                </Panel>
              )}
              {step === 8 && (
                <FirstAd
                  domain={domain}
                  error={error}
                  onRegenerate={() => {
                    craftStarted.current = false;
                    setStep(7);
                  }}
                  onFinish={() => setScreen("done")}
                  onNext={next}
                />
              )}
            </div>

            {/* Footer nav — hidden on the ad step, which carries its own CTA. */}
            {step !== 8 && (
              <div className="relative flex items-end justify-between gap-5 px-[34px] pb-[30px]">
                <div className="flex flex-col gap-0.5">
                  {meta.skip && (
                    <span onClick={next} className="cursor-pointer text-[13px] text-[#0871E7]">
                      Skip for now
                    </span>
                  )}
                  <span className="text-[11px] text-[#1a1a1a]/40">{meta.skip ?? ""}</span>
                </div>
                <div className="flex items-center gap-3">
                  {meta.back && <GhostButton tone="blue" onClick={back}>Back</GhostButton>}
                  <GlintButton onClick={next} radius="10px" padding="13px 28px" fontSize={13.5}>
                    {meta.primary ?? "Continue"}&nbsp;&nbsp;→
                  </GlintButton>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {projectId && (
        <span className="mt-4 text-[11px] text-[#1a1a1a]/35">Project {projectId.slice(0, 8)} · pipeline queued</span>
      )}
    </section>
  );
}

/* ---------------- small building blocks ---------------- */

function short(text: string, fallback: string) {
  const t = text.trim();
  if (!t) return fallback;
  return t.length > 46 ? t.slice(0, 46) + "…" : t;
}

function Panel({ width, children }: { width: number; children: React.ReactNode }) {
  return (
    <div
      className="flex w-full flex-col gap-5"
      style={{ maxWidth: width, animation: "dotPanelIn 0.45s cubic-bezier(0.16,1,0.3,1) both" }}
    >
      {children}
    </div>
  );
}

function Head({ children, sub, badge }: { children: React.ReactNode; sub: string; badge?: string }) {
  return (
    <div className="text-center">
      <StepTitle badge={badge}>{children}</StepTitle>
      <div className="mt-2.5 text-[13.5px] leading-[1.55] text-[#1a1a1a]/55">{sub}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col gap-2.5 rounded-2xl px-[18px] py-4"
      style={{ background: "rgba(255,255,255,0.86)", border: "1px solid rgba(0,0,0,0.07)" }}
    >
      <span className="text-[12px] font-semibold text-[#1a1a1a]">{title}</span>
      {children}
      <EditPill />
    </div>
  );
}

/** Step 1 — the auto-filled brand profile, populated from the real extraction. */
function BrandProfile({ prefill, site }: { prefill: Prefill | null; site: string }) {
  const colors = prefill?.colors;
  const swatches = colors
    ? [colors.primary, colors.secondary, colors.accent, colors.text]
    : ["#A9C8DE", "#C79A5B", "#6B4B32", "#3A2A20"];

  return (
    <div
      className="flex w-full max-w-[860px] flex-col gap-[22px]"
      style={{ animation: "dotPanelIn 0.45s cubic-bezier(0.16,1,0.3,1) both" }}
    >
      <div className="text-center">
        <div className="font-instrument text-[clamp(30px,3vw,40px)] leading-[1.06] tracking-[-0.02em] text-[#1a1a1a]">
          Review your
          <br />
          auto-filled brand profile
        </div>
        <div className="mt-2.5 text-[13.5px] leading-[1.55] text-[#1a1a1a]/55">
          We&apos;ve extracted this from {site}.
          <br />
          Please review and edit if needed.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        <Card title="Brand logo">
          <div
            className="relative h-[56px] w-[120px] overflow-hidden rounded-[10px]"
            style={{ background: "var(--bm-page)" }}
          >
            {prefill?.logo_url ? (
              // Remote logo host is unknown at build time — plain img avoids next/image config.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={prefill.logo_url} alt="Brand logo" className="h-full w-full object-contain" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[11px] text-[#1a1a1a]/35">
                Logo
              </span>
            )}
          </div>
        </Card>

        <Card title="Tone of voice">
          <span className="text-[13.5px] leading-[1.5] text-[#1a1a1a]/70">
            {prefill?.tone_of_voice || "Calm, supportive, clear and uplifting."}
          </span>
        </Card>

        <Card title="Colors">
          <div className="flex gap-2">
            {swatches.map((c, i) => (
              <span
                key={`${c}-${i}`}
                className="h-[30px] w-[30px] rounded-lg"
                style={{ background: c, border: "1px solid rgba(0,0,0,0.06)" }}
              />
            ))}
          </div>
        </Card>

        <Card title="Tagline">
          <span className="text-[13.5px] leading-[1.5] text-[#1a1a1a]/70">
            {prefill?.product_description || "Calm marketing that ships itself."}
          </span>
        </Card>

        <Card title="Fonts">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11.5px] text-[#1a1a1a]/50">Heading font</span>
            <span className="font-instrument text-[17px] text-[#1a1a1a]">Instrument Serif</span>
            <span className="mt-1 text-[11.5px] text-[#1a1a1a]/50">Body font</span>
            <span className="text-[13.5px] text-[#1a1a1a]">Inter</span>
          </div>
        </Card>

        <Card title="USP">
          <span className="text-[13.5px] leading-[1.5] text-[#1a1a1a]/70">
            {prefill?.usp ||
              "Daily anonymous connection that builds confidence and encourages real growth."}
          </span>
        </Card>
      </div>
    </div>
  );
}

/** Step 8 — first-ad preview. */
function FirstAd({
  domain,
  error,
  onRegenerate,
  onFinish,
  onNext,
}: {
  domain: string;
  error: string | null;
  onRegenerate: () => void;
  onFinish: () => void;
  onNext: () => void;
}) {
  return (
    <div
      className="flex w-full max-w-[560px] flex-col gap-4"
      style={{ animation: "dotPanelIn 0.45s cubic-bezier(0.16,1,0.3,1) both" }}
    >
      <div className="text-center">
        <div className="font-instrument text-[clamp(30px,3vw,40px)] leading-[1.06] tracking-[-0.02em] text-[#1a1a1a]">
          Here&apos;s your first ad
        </div>
        <div className="mt-2 text-[13.5px] text-[#1a1a1a]/55">
          {error ? error : "A preview of what we can create for you."}
        </div>
      </div>

      <div
        className="overflow-hidden rounded-[18px] bg-white"
        style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 4px 8px rgba(176,175,175,0.2)" }}
      >
        <div
          className="flex items-center gap-[9px] px-[15px] py-[11px]"
          style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
        >
          <BrainMark size={17} />
          <div className="flex flex-col">
            <span className="font-instrument text-[15px] leading-[1.15] tracking-[-0.01em] text-[#1a1a1a]">
              brain.market
            </span>
            <span className="text-[9.5px] text-[#1a1a1a]/45">Sponsored</span>
          </div>
        </div>
        <div
          className="grid grid-cols-[1fr_auto] gap-3.5 px-4 pb-3.5 pt-[18px]"
          style={{ background: "linear-gradient(180deg, #F0F5F8 0%, #F7EFE0 100%)" }}
        >
          <div className="flex min-w-0 flex-col gap-2.5">
            <span className="font-instrument text-[25px] leading-[1.06] tracking-[-0.02em] text-[#1a1a1a]">
              A calmer way
              <br />
              to grow.
            </span>
            <span className="text-[12.5px] leading-[1.5] text-[#1a1a1a]/60">
              One brief. One ad.
              <br />
              Distribution handled.
            </span>
            <GlintButton padding="10px 20px" fontSize={13} lift={false} className="self-start">
              Join free
            </GlintButton>
            <span className="self-start rounded-md bg-white/80 px-2.5 py-[5px] text-[11px] text-[#1a1a1a]/45">
              {domain}
            </span>
          </div>
          <Image
            src="/brand/phone-3-right.png"
            alt="brain.market handset"
            width={190}
            height={300}
            className="h-auto w-[116px] self-end"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <GhostButton onClick={onRegenerate} className="!px-2 !py-[11px] !text-[12.5px]">
          Regenerate
        </GhostButton>
        <GhostButton className="!px-2 !py-[11px] !text-[12.5px]">Edit ad</GhostButton>
        <GhostButton onClick={onFinish} className="!px-2 !py-[11px] !text-[12.5px]">
          Publish later
        </GhostButton>
      </div>

      <GlintButton onClick={onNext} radius="12px" padding="14px 20px" className="w-full">
        Finish setup&nbsp;&nbsp;→
      </GlintButton>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--bm-app)" }} />}>
      <Wizard />
    </Suspense>
  );
}

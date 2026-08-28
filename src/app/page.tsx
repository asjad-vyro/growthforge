"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { GlintButton, Logo } from "@/components/bm";

/* ------------------------------------------------------------------ */
/* TypingMessages — sits on the phone screen inside the hero video.    */
/* ------------------------------------------------------------------ */

// Kept short — the phone screen in the video is only ~130px wide.
const MESSAGES = ["Ad ready?", "Yes. Shipping.", "Distribution wins."];

const TYPING_SPEED = 100;
const DELETING_SPEED = 50;
const PAUSE_BEFORE_DELETE = 2000;

function TypingMessages() {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const full = MESSAGES[index];

    // Finished typing — hold the full message, then start deleting.
    if (!deleting && text === full) {
      const hold = setTimeout(() => setDeleting(true), PAUSE_BEFORE_DELETE);
      return () => clearTimeout(hold);
    }

    // Finished deleting — advance to the next message. Scheduled rather than
    // set synchronously, which would cascade an extra render.
    if (deleting && text === "") {
      const advance = setTimeout(() => {
        setDeleting(false);
        setIndex((i) => (i + 1) % MESSAGES.length);
      }, DELETING_SPEED);
      return () => clearTimeout(advance);
    }

    const tick = setTimeout(
      () =>
        setText((cur) =>
          deleting ? full.slice(0, cur.length - 1) : full.slice(0, cur.length + 1),
        ),
      deleting ? DELETING_SPEED : TYPING_SPEED,
    );
    return () => clearTimeout(tick);
  }, [text, deleting, index]);

  return (
    <div className="pointer-events-none absolute bottom-[32%] left-[48.5%] z-30 flex w-[110px] -translate-x-1/2 justify-start text-left sm:w-[130px]">
      <p className="font-nokia min-h-[1.5em] break-words text-[10px] leading-tight text-[#2A3616] sm:text-[14px]">
        {text}
        <motion.span
          className="ml-1 inline-block h-3 w-1.5 bg-[#2A3616] align-middle"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Navbar                                                              */
/* ------------------------------------------------------------------ */

const LINKS = ["Philosophy", "Trust", "Access", "Tribe"];

function Navbar({ onLinkUp }: { onLinkUp: () => void }) {
  return (
    <header className="pointer-events-none fixed left-1/2 top-6 z-50 w-[95%] max-w-5xl -translate-x-1/2">
      <nav
        className="pointer-events-auto flex items-center justify-between gap-6 rounded-full py-[10px] pl-[22px] pr-3 backdrop-blur-[14px]"
        style={{ border: "1px solid rgba(0,0,0,0.10)", background: "rgba(243,244,237,0.55)" }}
      >
        <Logo size={24} markSize={22} />

        <div className="hidden items-center gap-10 md:flex">
          {LINKS.map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase()}`}
              className="text-[14px] text-[#1a1a1a] opacity-75 transition-opacity duration-200 hover:opacity-100"
            >
              {link}
            </a>
          ))}
        </div>

        <GlintButton onClick={onLinkUp} padding="10px 20px" lift={false}>
          Link up
        </GlintButton>
      </nav>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

function Hero({ urlRef }: { urlRef: React.RefObject<HTMLInputElement | null> }) {
  const router = useRouter();
  const [website, setWebsite] = useState("");

  // The wizard reads ?url= and kicks off the real extraction on mount.
  function start() {
    const raw = website.trim().replace(/^https?:\\//, "").replace(/\\/+$/, "");
    router.push(raw ? `/onboarding?url=${encodeURIComponent(raw)}` : "/onboarding");
  }

  return (
    <section className="relative flex min-h-screen flex-col items-center pt-[120px]">
      <div className="absolute inset-0 z-0">
        <video
          className="block h-full w-full object-cover"
          style={{ background: "var(--bm-page)" }}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260427_054418_a6d194f0-ac86-4df9-abe5-ded73e596d7c.mp4"
        />
        <div className="absolute inset-0 bg-white/5" />
      </div>

      <div className="relative z-20 flex flex-col items-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          className="font-instrument mb-6 text-[clamp(38px,6.2vw,72px)] leading-[0.85] tracking-[-0.03em] text-[#1a1a1a]"
        >
          You stay calm. <br /> We handle what matters.
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-[576px] text-[clamp(16px,1.4vw,18px)] font-normal leading-[1.625] text-[#1a1a1a]/70"
        >
          You stay calm when brain.market does the marketing of your product — because
          distribution is the main thing now.
        </motion.div>
      </div>

      {/* URL capture — the entry point into the onboarding flow. */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-[7%] left-1/2 z-[25] w-full max-w-[580px] -translate-x-1/2 px-6"
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="flex w-full flex-col gap-[10px] rounded-[22px] p-2 backdrop-blur-[14px] md:flex-row"
            style={{
              border: "1px solid rgba(0,0,0,0.10)",
              background: "rgba(255,255,255,0.94)",
              boxShadow: "0 8px 16px rgba(176,175,175,0.22)",
            }}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2 pl-4 pr-1.5">
              <span className="text-[15px] text-[#1a1a1a]/40">https://</span>
              <input
                ref={urlRef}
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && start()}
                placeholder="yourproduct.com"
                className="min-w-0 flex-1 border-0 bg-transparent py-[14px] text-[15px] text-[#1a1a1a] outline-none"
              />
            </div>
            <GlintButton onClick={start} radius="16px" padding="15px 26px" fontSize={15}>
              Discover your brand
            </GlintButton>
          </div>
          <span className="text-[12px] text-[#1a1a1a]/55">
            We read your site once, then ask a few quick questions. No account needed yet.
          </span>
        </div>
      </motion.div>

      <TypingMessages />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */

export default function App() {
  const urlRef = useRef<HTMLInputElement | null>(null);

  return (
    <main
      className="relative w-full overflow-x-hidden text-[#1a1a1a]"
      style={{ background: "var(--bm-page)" }}
    >
      <Navbar onLinkUp={() => urlRef.current?.focus()} />
      <Hero urlRef={urlRef} />
    </main>
  );
}

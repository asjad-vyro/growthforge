"use client";

import { useEffect, useState } from "react";
import type { CanvasAsset } from "@/components/canvas-board";

/* ------------------------------------------------------------------ */
/* Platform-accurate preview of a generated asset.                     */
/*                                                                     */
/* The point is to answer "what will this actually look like once it's  */
/* posted", so each skin reproduces that platform's real post chrome    */
/* rather than showing a generic card. Which skin is used comes from    */
/* the channel row the tile was clicked in, not the asset type — the    */
/* same copy can ship to X and LinkedIn and should preview as both.     */
/*                                                                     */
/* Engagement figures are illustrative furniture (a real post has them, */
/* an unposted draft has no numbers at all). They are derived from the  */
/* asset id so a given draft always previews identically instead of     */
/* reshuffling on every render.                                         */
/* ------------------------------------------------------------------ */

export type BrandIdentity = {
  name: string;
  handle: string;
  tagline?: string;
  avatarUrl?: string;
};

/** Stable 32-bit hash — same asset, same illustrative numbers, every render. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
const pick = (seed: number, lo: number, hi: number) => lo + (seed % (hi - lo + 1));
const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : `${n}`);

/* --- icons ---------------------------------------------------------- */

function Ico({
  d,
  size = 22,
  fill = "none",
  width = 1.6,
}: {
  d: string;
  size?: number;
  fill?: string;
  width?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={fill === "none" ? "currentColor" : "none"}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

const P = {
  heart: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l8.8 8.8 8.8-8.8a5.5 5.5 0 0 0 0-7.8z",
  comment: "M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z",
  send: "M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z",
  bookmark: "M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z",
  dots: "M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  reply: "M21 11.5a8.4 8.4 0 0 1-8.5 8.5 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z",
  retweet: "m17 2 4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3",
  views: "M3 21V10M9 21V4M15 21v-7M21 21V8",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z",
  thumb: "M7 22V11l4-9a2.5 2.5 0 0 1 2.5 2.5V9h4.8A2 2 0 0 1 20 11.5l-1.6 8A2 2 0 0 1 16.4 21H7zM7 22H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h3",
  share: "M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  chevL: "m15 18-6-6 6-6",
  chevR: "m9 18 6-6-6-6",
  image: "M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6",
};

function Verified({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-label="Verified">
      <path
        fill="#1D9BF0"
        d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67 2.63 13.43 1.75 12 1.75s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 9.33 1.75 10.57 1.75 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"
      />
      <path fill="#fff" d="m10.9 15.6-3-3 1.4-1.4 1.6 1.6 3.8-3.8 1.4 1.4z" />
    </svg>
  );
}

/* --- shared building blocks ----------------------------------------- */

function Avatar({
  brand,
  size,
  ring,
  bg = "#0871E7",
}: {
  brand: BrandIdentity;
  size: number;
  ring?: boolean;
  bg?: string;
}) {
  // Signed logo URLs expire and can 404 — fall back to the initial rather than
  // leaving an empty circle where the brand mark should be.
  const [broken, setBroken] = useState(false);

  const inner = brand.avatarUrl && !broken ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={brand.avatarUrl}
      alt=""
      onError={() => setBroken(true)}
      className="h-full w-full rounded-full object-cover"
      style={{ background: "#fff" }}
    />
  ) : (
    <span
      className="flex h-full w-full items-center justify-center rounded-full font-medium text-white"
      style={{ background: bg, fontSize: size * 0.42 }}
    >
      {brand.name.charAt(0).toUpperCase()}
    </span>
  );

  if (!ring) return <span style={{ width: size, height: size }} className="flex-none">{inner}</span>;
  return (
    <span
      className="flex flex-none items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        padding: 2,
        background: "linear-gradient(140deg, #F0A03C, #D3357C 58%, #7B3FD1)",
      }}
    >
      <span
        className="flex h-full w-full items-center justify-center rounded-full"
        style={{ padding: 2, background: "#fff" }}
      >
        {inner}
      </span>
    </span>
  );
}

/** Media well — real generated file, or the empty state the asset is still missing. */
function Media({
  file,
  ratio,
  label,
  rounded = 0,
  dark,
}: {
  file?: { signedUrl?: string; mime: string };
  ratio: string;
  label: string;
  rounded?: number;
  dark?: boolean;
}) {
  if (file?.signedUrl) {
    const isVideo = file.mime.startsWith("video/");
    return (
      <div style={{ aspectRatio: ratio, borderRadius: rounded, overflow: "hidden" }}>
        {isVideo ? (
          <video
            src={file.signedUrl}
            controls
            playsInline
            className="h-full w-full object-cover"
            style={{ background: "#000" }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={file.signedUrl} alt={label} className="h-full w-full object-cover" />
        )}
      </div>
    );
  }
  return (
    <div
      className="flex flex-col items-center justify-center gap-2"
      style={{
        aspectRatio: ratio,
        borderRadius: rounded,
        background: dark ? "rgba(255,255,255,0.04)" : "#EFF1F3",
        border: `1px dashed ${dark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.14)"}`,
        color: dark ? "rgba(255,255,255,0.45)" : "rgba(26,26,26,0.4)",
      }}
    >
      <Ico d={P.image} size={26} width={1.3} />
      <span className="text-[12.5px]">{label}</span>
      <span className="text-[11.5px]" style={{ color: dark ? "rgba(255,255,255,0.3)" : "rgba(26,26,26,0.3)" }}>
        not generated yet
      </span>
    </div>
  );
}

/* --- Instagram ------------------------------------------------------ */

function InstagramSkin({
  brand,
  asset,
  slide,
  setSlide,
  text,
}: {
  brand: BrandIdentity;
  asset: CanvasAsset;
  slide: number;
  setSlide: (n: number) => void;
  text?: string;
}) {
  const isReel = asset.type === "reel";
  const media = asset.files.filter((f) => f.mime.startsWith("image/") || f.mime.startsWith("video/"));
  const current = media[slide] ?? media[0];
  const seed = hash(asset.id);
  const likes = pick(seed, 240, 4800);
  const comments = pick(seed >> 3, 8, 120);

  return (
    <div className="w-[400px] overflow-hidden rounded-[14px] bg-white" style={{ boxShadow: "0 18px 48px rgba(0,0,0,0.24)" }}>
      <div className="flex items-center gap-2.5 px-3.5 py-3">
        <Avatar brand={brand} size={40} ring />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[13.5px] font-semibold text-[#171717]">{brand.handle}</span>
          <span className="text-[11.5px] text-[#171717]/55">Sponsored</span>
        </div>
        <span className="ml-auto text-[#171717]/70">
          <Ico d={P.dots} size={20} fill="currentColor" />
        </span>
      </div>

      <div className="relative">
        <Media
          file={current}
          ratio={isReel ? "9 / 16" : "1 / 1"}
          label={isReel ? "Reel video" : "Carousel cover"}
        />
        {media.length > 1 && (
          <>
            {slide > 0 && (
              <button
                type="button"
                onClick={() => setSlide(slide - 1)}
                aria-label="Previous slide"
                className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-[#171717]"
                style={{ background: "rgba(255,255,255,0.85)" }}
              >
                <Ico d={P.chevL} size={15} />
              </button>
            )}
            {slide < media.length - 1 && (
              <button
                type="button"
                onClick={() => setSlide(slide + 1)}
                aria-label="Next slide"
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-[#171717]"
                style={{ background: "rgba(255,255,255,0.85)" }}
              >
                <Ico d={P.chevR} size={15} />
              </button>
            )}
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {media.map((_, i) => (
                <span
                  key={i}
                  className="h-[5px] w-[5px] rounded-full"
                  style={{ background: i === slide ? "#0871E7" : "rgba(255,255,255,0.65)" }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-3.5 px-3.5 pb-1 pt-3 text-[#171717]">
        <Ico d={P.heart} />
        <Ico d={P.comment} />
        <Ico d={P.send} />
        <span className="ml-auto">
          <Ico d={P.bookmark} />
        </span>
      </div>

      <div className="flex flex-col gap-1 px-3.5 pb-3.5 pt-1.5">
        <span className="text-[13px] font-semibold text-[#171717]">{compact(likes)} likes</span>
        {text && (
          <span className="whitespace-pre-line text-[13px] leading-[1.45] text-[#171717]">
            <span className="font-semibold">{brand.handle}</span> {text}
          </span>
        )}
        <span className="text-[13px] text-[#171717]/45">View all {comments} comments</span>
      </div>
    </div>
  );
}

/* --- X (Twitter) ---------------------------------------------------- */

function XSkin({
  brand,
  asset,
  tweets,
}: {
  brand: BrandIdentity;
  asset: CanvasAsset;
  tweets: string[];
}) {
  const seed = hash(asset.id);
  const media = asset.files.find((f) => f.mime.startsWith("image/") || f.mime.startsWith("video/"));

  return (
    <div
      className="w-[540px] overflow-hidden rounded-[16px] px-4 py-3.5"
      style={{ background: "#000", boxShadow: "0 18px 48px rgba(0,0,0,0.4)" }}
    >
      {(tweets.length ? tweets : [""]).map((t, i) => {
        const s = seed + i * 977;
        return (
          <div key={i} className="flex gap-3">
            <div className="flex flex-none flex-col items-center">
              <Avatar brand={brand} size={40} />
              {i < (tweets.length || 1) - 1 && (
                <span className="mt-1.5 w-[2px] flex-1" style={{ background: "rgba(255,255,255,0.18)" }} />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col pb-3">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-[14.5px] font-bold text-white">{brand.name}</span>
                <Verified />
                <span className="truncate text-[14.5px] text-white/50">
                  @{brand.handle} · {pick(s, 2, 23)}h
                </span>
                <span className="ml-auto text-white/50">
                  <Ico d={P.dots} size={17} fill="currentColor" />
                </span>
              </div>
              <span className="whitespace-pre-line pt-0.5 text-[15px] leading-[1.4] text-white">{t}</span>
              {i === 0 && media && (
                <div className="pt-2.5">
                  <Media file={media} ratio="16 / 9" label="Post media" rounded={14} dark />
                </div>
              )}
              <div className="flex items-center gap-7 pt-2.5 text-white/50">
                <span className="flex items-center gap-1.5 text-[12.5px]">
                  <Ico d={P.reply} size={16} /> {pick(s >> 2, 3, 90)}
                </span>
                <span className="flex items-center gap-1.5 text-[12.5px]">
                  <Ico d={P.retweet} size={16} /> {pick(s >> 4, 4, 140)}
                </span>
                <span className="flex items-center gap-1.5 text-[12.5px]">
                  <Ico d={P.heart} size={16} /> {pick(s >> 6, 20, 900)}
                </span>
                <span className="flex items-center gap-1.5 text-[12.5px]">
                  <Ico d={P.views} size={16} /> {compact(pick(s >> 8, 1200, 48000))}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* --- LinkedIn ------------------------------------------------------- */

function LinkedInSkin({
  brand,
  asset,
  text,
}: {
  brand: BrandIdentity;
  asset: CanvasAsset;
  text?: string;
}) {
  const seed = hash(asset.id);
  const media = asset.files.find((f) => f.mime.startsWith("image/") || f.mime.startsWith("video/"));

  return (
    <div className="w-[520px] overflow-hidden rounded-[10px] bg-white" style={{ boxShadow: "0 18px 48px rgba(0,0,0,0.24)" }}>
      <div className="flex items-start gap-2.5 px-4 pt-4">
        <Avatar brand={brand} size={48} />
        <div className="flex min-w-0 flex-col">
          <span className="flex items-center gap-1.5 text-[14px] font-semibold text-[#1a1a1a]">
            <span className="truncate">{brand.name}</span>
            <Verified size={14} />
            <span className="font-normal text-[#1a1a1a]/55">· You</span>
          </span>
          {brand.tagline && (
            <span className="truncate text-[12px] text-[#1a1a1a]/60">{brand.tagline}</span>
          )}
          <span className="flex items-center gap-1 pt-0.5 text-[11.5px] text-[#1a1a1a]/50">
            {pick(seed, 1, 11)}mo ·
            <Ico d={P.globe} size={12} width={1.4} />
          </span>
        </div>
        <span className="ml-auto text-[#1a1a1a]/60">
          <Ico d={P.dots} size={19} fill="currentColor" />
        </span>
      </div>

      {text && (
        <p className="whitespace-pre-line px-4 pt-3 text-[14px] leading-[1.5] text-[#1a1a1a]">{text}</p>
      )}

      {media && (
        <div className="pt-3">
          <Media file={media} ratio="1200 / 630" label="Post image" />
        </div>
      )}

      <div className="flex items-center justify-between px-4 pb-2 pt-3 text-[12.5px] text-[#1a1a1a]/55">
        <span>{pick(seed >> 3, 24, 480)} reactions</span>
        <span>
          {pick(seed >> 5, 2, 40)} comments · {pick(seed >> 7, 1, 12)} reposts
        </span>
      </div>

      <div
        className="mx-4 flex items-center justify-between py-1.5"
        style={{ borderTop: "1px solid rgba(0,0,0,0.09)" }}
      >
        {[
          { d: P.thumb, l: "Like" },
          { d: P.comment, l: "Comment" },
          { d: P.retweet, l: "Repost" },
          { d: P.send, l: "Send" },
        ].map((a) => (
          <span
            key={a.l}
            className="flex flex-1 items-center justify-center gap-1.5 rounded py-2 text-[13px] font-medium text-[#1a1a1a]/65"
          >
            <Ico d={a.d} size={18} /> {a.l}
          </span>
        ))}
      </div>
    </div>
  );
}

/* --- Facebook ------------------------------------------------------- */

function FacebookSkin({
  brand,
  asset,
  text,
}: {
  brand: BrandIdentity;
  asset: CanvasAsset;
  text?: string;
}) {
  const seed = hash(asset.id);
  const media = asset.files.find((f) => f.mime.startsWith("image/") || f.mime.startsWith("video/"));

  return (
    <div className="w-[520px] overflow-hidden rounded-[10px] bg-white" style={{ boxShadow: "0 18px 48px rgba(0,0,0,0.24)" }}>
      <div className="flex items-center gap-2.5 px-4 pt-3.5">
        <Avatar brand={brand} size={40} />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[13.5px] font-semibold text-[#1a1a1a]">{brand.name}</span>
          <span className="flex items-center gap-1 text-[11.5px] text-[#1a1a1a]/50">
            Today 10:00 ·
            <Ico d={P.globe} size={12} width={1.4} />
          </span>
        </div>
        <span className="ml-auto text-[#1a1a1a]/60">
          <Ico d={P.dots} size={19} fill="currentColor" />
        </span>
      </div>

      {text && (
        <p className="whitespace-pre-line px-4 pt-2.5 pb-3 text-[14px] leading-[1.45] text-[#1a1a1a]">{text}</p>
      )}

      <Media file={media} ratio="1200 / 630" label="Post image" />

      <div className="flex items-center justify-between px-4 py-2.5 text-[12.5px] text-[#1a1a1a]/55">
        <span className="flex items-center gap-1.5">
          <span className="flex">
            {["#1877F2", "#F7B928", "#F33E58"].map((c, i) => (
              <span
                key={c}
                className="h-[18px] w-[18px] rounded-full"
                style={{ background: c, marginLeft: i ? -6 : 0, border: "1.5px solid #fff" }}
              />
            ))}
          </span>
          You and {pick(seed, 12, 480)} others
        </span>
        <span>{pick(seed >> 4, 4, 160)} Comments</span>
      </div>

      <div
        className="mx-4 flex items-center justify-between py-1"
        style={{ borderTop: "1px solid rgba(0,0,0,0.09)" }}
      >
        {[
          { d: P.thumb, l: "Like" },
          { d: P.comment, l: "Comment" },
          { d: P.share, l: "Share" },
        ].map((a) => (
          <span
            key={a.l}
            className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[13.5px] font-medium text-[#1a1a1a]/65"
          >
            <Ico d={a.d} size={18} /> {a.l}
          </span>
        ))}
      </div>
    </div>
  );
}

/* --- shell ---------------------------------------------------------- */

const GLYPH: Record<string, { mark: React.ReactNode; bg: string }> = {
  Instagram: {
    bg: "linear-gradient(140deg, #F0A03C, #D3357C 58%, #7B3FD1)",
    mark: (
      <>
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
      </>
    ),
  },
  "X (Twitter)": {
    bg: "linear-gradient(140deg, #2B2B2B, #0E0E0E)",
    mark: (
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
    ),
  },
  LinkedIn: {
    bg: "linear-gradient(140deg, #1B7BC4, #0A4E86)",
    mark: (
      <>
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect width="4" height="12" x="2" y="9" />
        <circle cx="4" cy="4" r="2" />
      </>
    ),
  },
  Facebook: {
    bg: "linear-gradient(140deg, #4E8BF0, #1B4FBF)",
    mark: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
  },
};

/**
 * What the platform itself calls this. The same generated copy is a "Tweet" on
 * X and a "Post" on LinkedIn, so the label follows the channel, not the
 * internal asset type.
 */
function kindFor(channel: string, type: string): string {
  if (channel === "LinkedIn") return type === "thread" ? "Article" : "Post";
  if (channel === "Facebook") return type === "reel" ? "Video" : "Post";
  if (channel === "Instagram")
    return type === "reel" ? "Reel" : type === "carousel" ? "Carousel" : "Post";
  return type === "thread" ? "Thread" : "Tweet";
}

/** Pull the display text out of the stored content blob for each asset type. */
function textOf(asset: CanvasAsset): { tweets: string[]; body?: string } {
  // `variants` keeps each variant's tweets separate so a thread previews as its
  // own connected sequence; `texts` (which joins them) is the fallback.
  const v = asset.variants?.find((g) => g.length > 0);
  if (v?.length) return { tweets: v, body: v[0] };
  if (asset.texts?.length) return { tweets: [asset.texts[0]], body: asset.texts[0] };
  if (asset.body) return { tweets: [asset.body], body: asset.body };
  // Image ads and carousels bake their copy into the image and store none, and
  // `headline` is an internal concept/template key — not something to show as
  // a caption. No copy means no caption.
  return { tweets: [], body: undefined };
}

export function PostPreview({
  asset,
  channel,
  brand,
  onClose,
  onDetails,
}: {
  asset: CanvasAsset;
  channel: string;
  brand: BrandIdentity;
  onClose: () => void;
  /** Hands off to the full asset view (all variants, copy, per-file downloads). */
  onDetails: () => void;
}) {
  const [slide, setSlide] = useState(0);

  const { tweets, body } = textOf(asset);
  const media = asset.files.filter((f) => f.mime.startsWith("image/") || f.mime.startsWith("video/"));
  const mediaPath = (media[slide] ?? media[0] ?? asset.files[0])?.path;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setSlide((s) => Math.min(media.length - 1, s + 1));
      if (e.key === "ArrowLeft") setSlide((s) => Math.max(0, s - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, media.length]);

  const glyph = GLYPH[channel] ?? GLYPH.Instagram;

  const card =
    channel === "X (Twitter)" ? (
      <XSkin brand={brand} asset={asset} tweets={tweets} />
    ) : channel === "LinkedIn" ? (
      <LinkedInSkin brand={brand} asset={asset} text={body} />
    ) : channel === "Facebook" ? (
      <FacebookSkin brand={brand} asset={asset} text={body} />
    ) : (
      <InstagramSkin brand={brand} asset={asset} slide={slide} setSlide={setSlide} text={body} />
    );

  const footer =
    media.length > 1
      ? `${slide + 1} / ${media.length}`
      : media[0]?.width && media[0]?.height
        ? `${media[0].width}×${media[0].height}`
        : body
          ? `${body.length} ch`
          : kindFor(channel, asset.type);

  return (
    <div
      data-no-pan
      role="dialog"
      aria-modal="true"
      aria-label={`${channel} preview`}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto p-6"
      style={{
        background: "rgba(22,22,20,0.34)",
        backdropFilter: "blur(3px)",
        animation: "bmIn 0.22s cubic-bezier(0.16,1,0.3,1) both",
      }}
    >
      <div className="flex flex-col items-center gap-3" onPointerDown={(e) => e.stopPropagation()}>
        {/* floating chrome above the card */}
        <div className="flex w-full items-center gap-2.5">
          <span
            className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] text-white"
            style={{ background: glyph.bg }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {glyph.mark}
            </svg>
          </span>
          <span className="text-[13px] font-medium text-white/90">
            {channel} · {kindFor(channel, asset.type)}
          </span>

          <button
            type="button"
            onClick={onDetails}
            className="ml-auto cursor-pointer rounded-full px-3.5 py-2 text-[12.5px] font-medium text-[#1a1a1a]"
            style={{ background: "rgba(255,255,255,0.92)" }}
          >
            Details
          </button>
          <a
            href={`/api/assets/${asset.id}/download?path=${encodeURIComponent(mediaPath ?? "")}`}
            className="flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-medium text-[#1a1a1a]"
            style={{ background: "rgba(255,255,255,0.92)" }}
          >
            <Ico d={P.download} size={14} /> Download
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-full text-[17px] text-[#1a1a1a]"
            style={{ background: "rgba(255,255,255,0.92)" }}
          >
            ×
          </button>
        </div>

        {card}

        <span className="text-[11.5px] text-white/60">{footer} · click outside to close</span>
      </div>
    </div>
  );
}

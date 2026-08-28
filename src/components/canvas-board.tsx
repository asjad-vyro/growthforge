"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GhostButton, GlintButton, Logo, TextArea, TextInput } from "@/components/bm";

/* ------------------------------------------------------------------ */
/* Types — shaped by the server component from generated_assets.       */
/* ------------------------------------------------------------------ */

export type CanvasFile = { path: string; mime: string; label?: string; signedUrl?: string };
export type CanvasAsset = {
  id: string;
  type: string; // tweet | thread | carousel | image_ad | reel
  status: string; // queued | generating | rendering | ready | failed
  createdAt: string;
  headline?: string;
  body?: string;
  /** Full text variants (each variant's tweets joined) for the expanded view. */
  texts?: string[];
  error?: string | null;
  meta?: string;
  files: CanvasFile[];
};

/** The four channel rows from the design, mapped onto real asset types. */
const CHANNELS: {
  name: string;
  kinds: string;
  types: string[];
  iconBg: string;
  dot: string;
  mark: React.ReactNode;
}[] = [
  {
    name: "Instagram",
    kinds: "Posts, Reels, Carousels",
    types: ["carousel", "reel"],
    iconBg: "linear-gradient(140deg, #F0A03C, #D3357C 58%, #7B3FD1)",
    dot: "#D3357C",
    mark: (
      <>
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
      </>
    ),
  },
  {
    name: "X (Twitter)",
    kinds: "Tweets, threads",
    types: ["tweet", "thread"],
    iconBg: "linear-gradient(140deg, #2B2B2B, #0E0E0E)",
    dot: "#0871E7",
    mark: (
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
    ),
  },
  {
    name: "LinkedIn",
    kinds: "Posts, documents",
    types: [],
    iconBg: "linear-gradient(140deg, #1B7BC4, #0A4E86)",
    dot: "#0871E7",
    mark: (
      <>
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect width="4" height="12" x="2" y="9" />
        <circle cx="4" cy="4" r="2" />
      </>
    ),
  },
  {
    name: "Facebook",
    kinds: "Posts & Videos",
    types: ["image_ad"],
    iconBg: "linear-gradient(140deg, #4E8BF0, #1B4FBF)",
    dot: "#4E8BF0",
    mark: (
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    ),
  },
];

const FILTERS = ["All", "Images", "Video", "Text"] as const;
const TONES = ["Calm", "Direct", "Warm", "Playful"];
const FORMATS: Record<string, string[]> = {
  Instagram: ["Reel", "Carousel", "Post", "Story"],
  "X (Twitter)": ["Tweet", "Thread", "Quote post"],
  LinkedIn: ["Post", "Document", "Article"],
  Facebook: ["Video", "Post", "Story"],
};
const PROMPTS: Record<string, string> = {
  Instagram: "e.g. A 3-scene reel on how one brief becomes a week of posts",
  "X (Twitter)": "e.g. A punchy take on why distribution beats more features",
  LinkedIn: "e.g. A founder note on staying calm while shipping consistently",
  Facebook: "e.g. A 20s video showing the calm-marketing routine",
};

const TEXT_TYPES = new Set(["tweet", "thread"]);
const BOARD_W = 1400;

function kindLabel(type: string) {
  return (
    { tweet: "Tweet", thread: "Thread", carousel: "Carousel", image_ad: "Post", reel: "Reel" }[
      type
    ] ?? type
  );
}

function Mark({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/* ------------------------------------------------------------------ */

export function CanvasBoard({
  brand,
  projectId,
  assets,
}: {
  brand: string;
  projectId: string;
  assets: CanvasAsset[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [compose, setCompose] = useState<string | null>(null);
  const [preview, setPreview] = useState<CanvasAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Pan + zoom — a drag started anywhere on the canvas pans it; a pointer that
  // moves less than the threshold is treated as a click on whatever is under it.
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [panning, setPanning] = useState(false);
  const dragging = useRef<{
    startX: number;
    startY: number;
    panX: number;
    panY: number;
    moved: boolean;
  } | null>(null);
  const justPanned = useRef(false);

  const panStart = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("[data-no-pan]")) return;
    dragging.current = {
      startX: e.clientX,
      startY: e.clientY,
      panX: pan.x,
      panY: pan.y,
      moved: false,
    };
  };
  const panMove = (e: React.PointerEvent) => {
    const d = dragging.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < 4) return;
      d.moved = true;
      justPanned.current = true;
      setPanning(true);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    setPan({ x: d.panX + dx, y: d.panY + dy });
  };
  const panEnd = () => {
    dragging.current = null;
    setPanning(false);
  };
  // The click that follows a drag's pointerup must not activate the card or
  // button the drag happened to start on.
  const suppressClickAfterPan = (e: React.MouseEvent) => {
    if (!justPanned.current) return;
    justPanned.current = false;
    e.preventDefault();
    e.stopPropagation();
  };
  const onWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    setZoom((z) => Math.min(1.6, Math.max(0.45, z - e.deltaY * 0.0015)));
  };

  const rows = useMemo(
    () =>
      CHANNELS.map((ch) => {
        const mine = assets.filter((a) => ch.types.includes(a.type));
        const visible = mine.filter((a) => {
          if (filter === "All") return true;
          if (filter === "Text") return TEXT_TYPES.has(a.type);
          if (filter === "Video") return a.type === "reel";
          return a.type === "carousel" || a.type === "image_ad";
        });
        const ready = mine.filter((a) => a.status === "ready").length;
        const pending = mine.filter((a) =>
          ["queued", "generating", "rendering"].includes(a.status),
        ).length;
        return { ch, cards: visible.slice(0, 8), ready, pending, total: mine.length };
      }),
    [assets, filter],
  );

  const total = assets.length;

  /** Kick a real pipeline run for this project. */
  const startGenerating = useCallback(async () => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId, force: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "could not start run");
      setCompose(null);
      setNotice("Run queued — assets will appear as they finish.");
      router.refresh();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "failed to start");
    } finally {
      setBusy(false);
    }
  }, [projectId, router]);

  /** Regenerate a single asset (clones it and re-queues). */
  const regenerate = useCallback(
    async (id: string) => {
      setNotice(null);
      try {
        const res = await fetch(`/api/assets/${id}/regenerate`, { method: "POST" });
        if (!res.ok) throw new Error("regenerate failed");
        setNotice("Variation queued.");
        router.refresh();
      } catch (err) {
        setNotice(err instanceof Error ? err.message : "failed");
      }
    },
    [router],
  );

  return (
    <div
      className="relative min-h-screen overflow-x-hidden text-[#1a1a1a]"
      style={{ background: "var(--bm-app)" }}
    >
      {/* Fixed chrome */}
      <div
        data-no-pan
        onClick={() => router.push("/")}
        className="fixed left-[22px] top-5 z-[46] flex cursor-pointer items-center gap-[11px] rounded-[15px] py-[9px] pl-[9px] pr-[15px] backdrop-blur-[12px]"
        style={{
          background: "rgba(255,255,255,0.88)",
          border: "1px solid rgba(0,0,0,0.07)",
          boxShadow: "0 2px 4px rgba(176,175,175,0.24)",
        }}
      >
        <Logo size={19} markSize={21} tagline />
      </div>

      <div
        data-no-pan
        className="fixed right-[22px] top-5 z-[46] flex items-center gap-2"
      >
        <GlintButton onClick={() => setCompose("Instagram")} padding="11px 20px" fontSize={13.5}>
          + New generation
        </GlintButton>
      </div>

      {notice && (
        <div
          data-no-pan
          className="fixed bottom-6 left-1/2 z-[48] -translate-x-1/2 rounded-full px-5 py-2.5 text-[12.5px] backdrop-blur-[12px]"
          style={{
            background: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(0,0,0,0.08)",
            boxShadow: "0 4px 12px rgba(176,175,175,0.3)",
          }}
        >
          {notice}
        </div>
      )}

      {/* Zoom readout */}
      <div
        data-no-pan
        className="fixed bottom-6 right-[22px] z-[46] flex items-center gap-1.5 rounded-full px-3 py-2 text-[11.5px] text-[#1a1a1a]/55 backdrop-blur-[12px]"
        style={{ background: "rgba(255,255,255,0.88)", border: "1px solid rgba(0,0,0,0.07)" }}
      >
        <span onClick={() => setZoom((z) => Math.max(0.45, z - 0.1))} className="cursor-pointer px-1">−</span>
        {Math.round(zoom * 100)}%
        <span onClick={() => setZoom((z) => Math.min(1.6, z + 0.1))} className="cursor-pointer px-1">+</span>
      </div>

      {/* Pannable viewport */}
      <div
        onPointerDown={panStart}
        onPointerMove={panMove}
        onPointerUp={panEnd}
        onPointerCancel={panEnd}
        onClickCapture={suppressClickAfterPan}
        onWheel={onWheel}
        className="fixed inset-0 select-none overflow-hidden"
        style={{
          cursor: panning ? "grabbing" : "grab",
          backgroundImage: "radial-gradient(rgba(26,26,26,0.10) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          touchAction: "none",
        }}
      >
        <div
          // pt clears the fixed logo / new-generation chrome pinned at the top.
          className="absolute left-0 top-0 flex flex-col gap-3.5 px-[30px] pb-[60px] pt-[86px]"
          style={{
            width: BOARD_W,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          <div className="ml-[268px] flex items-center justify-between gap-5 px-0.5 pb-1">
            <span className="text-[13px] text-[#1a1a1a]/50">
              {brand} · {total} asset{total === 1 ? "" : "s"}
            </span>
            <div className="flex items-center gap-2">
              {FILTERS.map((f) => {
                const on = filter === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className="cursor-pointer rounded-full px-3.5 py-[7px] text-[12.5px] transition-colors"
                    style={{
                      border: `1px solid ${on ? "#0871E7" : "rgba(0,0,0,0.10)"}`,
                      background: on ? "#0871E7" : "rgba(255,255,255,0.9)",
                      color: on ? "#fff" : "rgba(26,26,26,0.7)",
                    }}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          </div>

          {rows.map(({ ch, cards, ready, pending, total: chTotal }) => (
            <div
              key={ch.name}
              className="grid grid-cols-[224px_1fr] items-start gap-[22px] px-0.5 pb-[22px] pt-[18px]"
              style={{
                borderTop: "1px solid rgba(0,0,0,0.08)",
                animation: "bmIn 0.45s cubic-bezier(0.16,1,0.3,1) both",
              }}
            >
              <div className="flex items-start gap-3 pt-1.5">
                <span
                  className="mt-2 h-[7px] w-[7px] flex-none rounded-full"
                  style={{ background: ch.dot }}
                />
                <div
                  className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[11px] text-white"
                  style={{ background: ch.iconBg }}
                >
                  <Mark>{ch.mark}</Mark>
                </div>
                <div className="flex min-w-0 flex-col gap-[3px]">
                  <span className="text-[14.5px] font-medium">{ch.name}</span>
                  <span className="text-[11.5px] leading-[1.4] text-[#1a1a1a]/50">{ch.kinds}</span>
                  <span
                    className="mt-[3px] text-[11px]"
                    style={{ color: chTotal ? "#0871E7" : "rgba(26,26,26,0.4)" }}
                  >
                    {ch.types.length === 0
                      ? "No generator yet"
                      : chTotal
                        ? `${ready} ready · ${pending} queued`
                        : "Nothing generated yet"}
                  </span>
                </div>
              </div>

              <div
                // Fixed track width so a row holding a single tile doesn't stretch it.
                className="grid auto-cols-[190px] grid-flow-col gap-3 overflow-x-auto pb-1"
              >
                {cards.map((a) => (
                  <AssetCardTile
                    key={a.id}
                    asset={a}
                    onRegenerate={() => regenerate(a.id)}
                    onExpand={() => setPreview(a)}
                  />
                ))}
                <NewTile
                  label={cards.length ? "New variation" : `Create for ${ch.name}`}
                  onClick={() => setCompose(ch.name)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {compose && (
        <ComposeModal
          channel={compose}
          busy={busy}
          onClose={() => setCompose(null)}
          onGenerate={startGenerating}
        />
      )}

      {preview && (
        <PreviewModal
          asset={preview}
          onClose={() => setPreview(null)}
          onRegenerate={() => {
            setPreview(null);
            regenerate(preview.id);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function AssetCardTile({
  asset,
  onRegenerate,
  onExpand,
}: {
  asset: CanvasAsset;
  onRegenerate: () => void;
  onExpand: () => void;
}) {
  const [hover, setHover] = useState(false);
  const media = asset.files.find(
    (f) => f.signedUrl && (f.mime.startsWith("image/") || f.mime.startsWith("video/")),
  );
  const isVideo = media?.mime.startsWith("video/");
  const isText = TEXT_TYPES.has(asset.type);
  const pending = ["queued", "generating", "rendering"].includes(asset.status);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onExpand}
      className="relative h-[208px] cursor-pointer overflow-hidden rounded-[14px] bg-white transition-shadow"
      style={{
        border: `1px solid ${hover ? "rgba(8,113,231,0.45)" : "rgba(0,0,0,0.08)"}`,
        boxShadow: hover ? "0 6px 16px rgba(176,175,175,0.35)" : "0 1px 3px rgba(176,175,175,0.22)",
      }}
    >
      {hover && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onRegenerate();
          }}
          title="Regenerate"
          className="absolute right-2 top-2 z-[3] flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-lg"
          style={{
            background: "rgba(255,255,255,0.94)",
            border: "1px solid rgba(0,0,0,0.08)",
            boxShadow: "0 2px 4px rgba(176,175,175,0.28)",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m17 2 4 4-4 4" />
            <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
            <path d="m7 22-4-4 4-4" />
            <path d="M21 13v1a4 4 0 0 1-4 4H3" />
          </svg>
        </span>
      )}

      {isText ? (
        <div className="absolute inset-0 flex flex-col justify-between gap-2.5 p-3.5">
          <span className="whitespace-pre-line text-[12.5px] leading-[1.5] text-[#1a1a1a]/85">
            {asset.body || (pending ? "Generating…" : "—")}
          </span>
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-full bg-[#0871E7]/10 px-2 py-[3px] text-[10px] text-[#0871E7]">
              {kindLabel(asset.type)}
            </span>
            <span className="text-[10px] text-[#1a1a1a]/40">{asset.meta}</span>
          </div>
        </div>
      ) : (
        <>
          <div className="absolute inset-0 px-2 pb-10 pt-[42px]">
            {media?.signedUrl ? (
              isVideo ? (
                <video src={media.signedUrl} muted loop playsInline className="h-full w-full rounded-[9px] object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={media.signedUrl} alt={asset.headline ?? "asset"} draggable={false} className="h-full w-full rounded-[9px] object-cover" />
              )
            ) : (
              <div
                className="flex h-full w-full items-center justify-center rounded-[9px] text-[11px] text-[#1a1a1a]/35"
                style={{ background: "var(--bm-page)" }}
              >
                {pending ? "Generating…" : asset.status === "failed" ? "Failed" : "No preview"}
              </div>
            )}
          </div>
          <div
            className="pointer-events-none absolute left-0 right-0 top-0 px-[13px] pb-4 pt-[11px]"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.82) 62%, rgba(255,255,255,0) 100%)",
            }}
          >
            <span className="font-instrument block pr-[34px] text-[16.5px] leading-[1.12] tracking-[-0.01em] text-[#1a1a1a]">
              {asset.headline ?? kindLabel(asset.type)}
            </span>
          </div>
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 flex items-center justify-between gap-2 px-[13px] pb-[11px] pt-4"
            style={{
              background:
                "linear-gradient(0deg, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.8) 60%, rgba(255,255,255,0) 100%)",
            }}
          >
            <span className="flex items-center gap-1.5 rounded-full bg-[#0871E7]/10 px-[9px] py-[3px] text-[10px] text-[#0871E7]">
              {isVideo && (
                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5.5v13l11-6.5z" />
                </svg>
              )}
              {kindLabel(asset.type)}
            </span>
            <span className="text-[10px] text-[#1a1a1a]/45">{asset.meta}</span>
          </div>
        </>
      )}
    </div>
  );
}

function NewTile({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="relative flex h-[208px] cursor-pointer flex-col items-center justify-center gap-[9px] rounded-[14px] transition-colors hover:bg-white/50"
      style={{ border: "1px dashed rgba(0,0,0,0.14)" }}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0871E7]/10 text-[#0871E7]">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
      <span className="px-2.5 text-center text-[12px] text-[#1a1a1a]/55">{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ComposeModal({
  channel,
  busy,
  onClose,
  onGenerate,
}: {
  channel: string;
  busy: boolean;
  onClose: () => void;
  onGenerate: () => void;
}) {
  const formats = FORMATS[channel] ?? ["Post"];
  const [format, setFormat] = useState(formats[0]);
  const [hook, setHook] = useState("");
  const [cta, setCta] = useState("");
  const [tone, setTone] = useState(TONES[0]);
  const [variations, setVariations] = useState(2);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-6"
      style={{ background: "rgba(26,26,26,0.28)", backdropFilter: "blur(3px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[520px] overflow-hidden rounded-[22px] bg-white"
        style={{
          border: "1px solid rgba(0,0,0,0.07)",
          boxShadow: "0 20px 50px rgba(26,26,26,0.22)",
          animation: "dotPanelIn 0.35s cubic-bezier(0.16,1,0.3,1) both",
        }}
      >
        <div className="px-6 pb-2 pt-6">
          <div className="font-instrument text-[26px] leading-[1.1] tracking-[-0.02em]">
            New {channel} generation
          </div>
          <div className="mt-1.5 text-[12.5px] text-[#1a1a1a]/55">
            Starts a real pipeline run for this project.
          </div>
        </div>

        <div className="flex flex-col gap-4 px-6 py-4">
          <div className="flex flex-col gap-2">
            <span className="text-[12.5px] font-medium text-[#1a1a1a]/75">Format</span>
            <div className="flex flex-wrap gap-2">
              {formats.map((f) => {
                const on = f === format;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormat(f)}
                    className="cursor-pointer rounded-[10px] px-3.5 py-2 text-[13px]"
                    style={{
                      border: `1px solid ${on ? "#0871E7" : "rgba(0,0,0,0.10)"}`,
                      background: on ? "#0871E7" : "rgba(255,255,255,0.9)",
                      color: on ? "#fff" : "rgba(26,26,26,0.75)",
                    }}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-[6px]">
            <span className="text-[12.5px] font-medium text-[#1a1a1a]/75">Hook or headline</span>
            <TextArea rows={2} value={hook} onChange={(e) => setHook(e.target.value)} placeholder={PROMPTS[channel]} />
          </div>

          <div className="flex flex-col gap-[6px]">
            <span className="text-[12.5px] font-medium text-[#1a1a1a]/75">Call to action</span>
            <TextInput value={cta} onChange={(e) => setCta(e.target.value)} placeholder="e.g. Join free" />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[12.5px] font-medium text-[#1a1a1a]/75">Tone</span>
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => {
                const on = t === tone;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTone(t)}
                    className="cursor-pointer rounded-full px-3.5 py-[7px] text-[12.5px]"
                    style={{
                      border: `1px solid ${on ? "#0871E7" : "rgba(0,0,0,0.10)"}`,
                      background: on ? "#0871E7" : "rgba(255,255,255,0.9)",
                      color: on ? "#fff" : "rgba(26,26,26,0.7)",
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-[12.5px] font-medium text-[#1a1a1a]/75">Variations</span>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((n) => {
                const on = n === variations;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setVariations(n)}
                    className="h-8 w-8 cursor-pointer rounded-lg text-[12.5px]"
                    style={{
                      border: `1px solid ${on ? "#0871E7" : "rgba(0,0,0,0.10)"}`,
                      background: on ? "#0871E7" : "rgba(255,255,255,0.9)",
                      color: on ? "#fff" : "rgba(26,26,26,0.7)",
                    }}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div
          className="flex items-center justify-end gap-2.5 px-6 py-4"
          style={{ borderTop: "1px solid rgba(0,0,0,0.06)", background: "rgba(243,244,237,0.5)" }}
        >
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <GlintButton onClick={onGenerate} disabled={busy} radius="10px" padding="13px 24px" fontSize={13.5}>
            {busy ? "Starting…" : "Start generating"}
          </GlintButton>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PreviewModal — click a card to see the full asset: all tweet        */
/* variants with copy, full-size media, downloads, and error detail.   */
/* ------------------------------------------------------------------ */

function PreviewModal({
  asset,
  onClose,
  onRegenerate,
}: {
  asset: CanvasAsset;
  onClose: () => void;
  onRegenerate: () => void;
}) {
  const [copied, setCopied] = useState<number | null>(null);
  const isText = TEXT_TYPES.has(asset.type);
  const texts = asset.texts?.length ? asset.texts : asset.body ? [asset.body] : [];
  const media = asset.files.filter(
    (f) => f.signedUrl && (f.mime.startsWith("image/") || f.mime.startsWith("video/")),
  );
  const pending = ["queued", "generating", "rendering"].includes(asset.status);

  function copy(text: string, i: number) {
    void navigator.clipboard.writeText(text);
    setCopied(i);
    setTimeout(() => setCopied(null), 1400);
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center px-5 py-8"
      style={{ background: "rgba(26,26,26,0.45)", backdropFilter: "blur(4px)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[86vh] w-full max-w-[680px] flex-col overflow-hidden rounded-[20px] bg-white"
        style={{ border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 24px 60px rgba(26,26,26,0.25)" }}
      >
        <div className="flex items-center justify-between gap-3 px-6 pb-3 pt-5">
          <div className="flex items-center gap-2.5">
            <span className="font-instrument text-[20px] tracking-[-0.01em] text-[#1a1a1a]">
              {asset.headline ?? kindLabel(asset.type)}
            </span>
            <span className="rounded-full bg-[#0871E7]/10 px-2.5 py-[3px] text-[10.5px] text-[#0871E7]">
              {kindLabel(asset.type)}
            </span>
            <span
              className="rounded-full px-2.5 py-[3px] text-[10.5px]"
              style={{
                background: asset.status === "ready" ? "rgba(22,163,74,0.10)" : asset.status === "failed" ? "rgba(220,38,38,0.10)" : "rgba(26,26,26,0.06)",
                color: asset.status === "ready" ? "#16A34A" : asset.status === "failed" ? "#DC2626" : "rgba(26,26,26,0.55)",
              }}
            >
              {pending ? "generating…" : asset.status}
            </span>
          </div>
          <span
            onClick={onClose}
            className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full text-[15px] text-[#1a1a1a]/55 hover:bg-[#1a1a1a]/5"
          >
            ✕
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-5">
          {asset.error && (
            <div className="mb-4 rounded-xl border border-[#DC2626]/25 bg-[#DC2626]/5 px-4 py-3 text-[12.5px] leading-[1.5] text-[#1a1a1a]/75">
              {asset.error}
            </div>
          )}

          {isText &&
            (texts.length ? (
              <div className="flex flex-col gap-3">
                {texts.map((t, i) => (
                  <div
                    key={i}
                    className="rounded-[14px] px-4 py-3.5"
                    style={{ background: "var(--bm-page)", border: "1px solid rgba(0,0,0,0.07)" }}
                  >
                    <p className="whitespace-pre-line text-[14px] leading-[1.6] text-[#1a1a1a]/90">{t}</p>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-[10.5px] text-[#1a1a1a]/40">{t.length} characters</span>
                      <GhostButton tone="blue" onClick={() => copy(t, i)} className="!px-3 !py-1.5 !text-[11.5px]">
                        {copied === i ? "Copied ✓" : "Copy"}
                      </GhostButton>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-10 text-center text-[13px] text-[#1a1a1a]/45">
                {pending ? "Still generating — this updates as soon as it lands." : "No content."}
              </p>
            ))}

          {!isText &&
            (media.length ? (
              <div className="flex flex-col gap-3">
                {media.map((f, i) =>
                  f.mime.startsWith("video/") ? (
                    <video key={i} src={f.signedUrl} controls autoPlay loop playsInline className="w-full rounded-[14px]" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={f.signedUrl} alt={f.label ?? ""} className="w-full rounded-[14px]" />
                  ),
                )}
              </div>
            ) : (
              <p className="py-10 text-center text-[13px] text-[#1a1a1a]/45">
                {pending ? "Still generating — this updates as soon as it lands." : asset.status === "failed" ? "Generation failed." : "No preview available."}
              </p>
            ))}
        </div>

        <div
          className="flex items-center justify-between gap-3 px-6 py-4"
          style={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}
        >
          <div className="flex flex-wrap items-center gap-2">
            {asset.files.map((f, i) => (
              <a
                key={i}
                href={`/api/assets/${asset.id}/download?path=${encodeURIComponent(f.path)}`}
                className="rounded-full px-3 py-1.5 text-[11.5px] text-[#1a1a1a]/70 hover:text-[#1a1a1a]"
                style={{ border: "1px solid rgba(0,0,0,0.10)", background: "rgba(255,255,255,0.9)" }}
              >
                ⬇ {f.label ?? f.path.split("/").pop()}
              </a>
            ))}
          </div>
          <GlintButton onClick={onRegenerate} radius="10px" padding="11px 20px" fontSize={12.5}>
            Regenerate
          </GlintButton>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, StatusBadge } from "@/components/ui";

export type AssetView = {
  id: string;
  type: string;
  status: string;
  error: string | null;
  createdAt: string;
  content: Record<string, unknown> | null;
  files: { path: string; mime: string; label?: string; signedUrl?: string }[];
};

export function AssetCard({ asset }: { asset: AssetView }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function regenerate() {
    const instruction = prompt("Any direction for the regeneration? (optional — e.g. 'punchier, more contrarian')");
    if (instruction === null) return;
    setBusy(true);
    await fetch(`/api/assets/${asset.id}/regenerate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ instruction: instruction || undefined }),
    });
    setBusy(false);
    router.refresh();
  }

  async function retry() {
    setBusy(true);
    await fetch(`/api/assets/${asset.id}/regenerate`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    setBusy(false);
    router.refresh();
  }

  const images = asset.files.filter((f) => f.mime.startsWith("image/") && f.signedUrl);
  const video = asset.files.find((f) => f.mime.startsWith("video/") && f.signedUrl);
  const variants = (asset.content?.variants ?? []) as { kind: string; tweets: string[] }[];

  return (
    <>
      <div className="flex flex-col rounded-xl border border-edge bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold capitalize">{asset.type.replace("_", " ")}</span>
          <StatusBadge status={asset.status} />
        </div>

        <button
          className="group relative mb-3 flex-1 cursor-pointer overflow-hidden rounded-lg bg-surface-2 text-left"
          onClick={() => setOpen(true)}
        >
          {video ? (
            <video src={video.signedUrl} className="h-48 w-full object-cover" muted playsInline />
          ) : images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={images[0].signedUrl} alt="" className="h-48 w-full object-cover" />
          ) : variants[0] ? (
            <p className="line-clamp-6 p-3 text-sm text-foreground/90">{variants[0].tweets[0]}</p>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-muted">
              {asset.status === "failed" ? "Generation failed" : "Working…"}
            </div>
          )}
        </button>

        {asset.error ? <p className="mb-2 line-clamp-2 text-xs text-danger">{asset.error}</p> : null}

        <div className="mt-auto flex flex-wrap gap-2">
          {asset.status === "ready" ? (
            <Button variant="ghost" className="!px-3 !py-1.5 text-xs" onClick={() => setOpen(true)}>
              Preview
            </Button>
          ) : null}
          {asset.status === "failed" ? (
            <Button variant="ghost" className="!px-3 !py-1.5 text-xs" onClick={retry} disabled={busy}>
              Retry
            </Button>
          ) : (
            <Button variant="ghost" className="!px-3 !py-1.5 text-xs" onClick={regenerate} disabled={busy}>
              Regenerate
            </Button>
          )}
        </div>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-edge bg-surface p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold capitalize">{asset.type.replace("_", " ")}</h3>
              <button className="cursor-pointer text-muted hover:text-foreground" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>

            {variants.length > 0 ? (
              <div className="flex flex-col gap-4">
                {variants.map((v, i) => (
                  <div key={i} className="rounded-lg bg-surface-2 p-4">
                    <p className="mb-2 text-xs uppercase tracking-wider text-muted">{v.kind}</p>
                    {v.tweets.map((t, j) => (
                      <p key={j} className="mb-2 whitespace-pre-wrap text-sm leading-relaxed">
                        {t}
                      </p>
                    ))}
                    <Button
                      variant="ghost"
                      className="!px-3 !py-1.5 text-xs"
                      onClick={() => navigator.clipboard.writeText(v.tweets.join("\n\n"))}
                    >
                      Copy
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}

            {video ? (
              <video src={video.signedUrl} className="w-full rounded-lg" controls autoPlay muted />
            ) : null}

            {!video && images.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {images.map((img, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={img.signedUrl} alt={img.label} className="w-full rounded-lg" />
                ))}
              </div>
            ) : null}

            {asset.files.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2 border-t border-edge pt-4">
                {asset.files.map((f, i) => (
                  <a
                    key={i}
                    href={`/api/assets/${asset.id}/download?path=${encodeURIComponent(f.path)}`}
                    className="rounded-lg border border-edge px-3 py-1.5 text-xs text-foreground hover:bg-surface-2"
                  >
                    ⬇ {f.label ?? f.path.split("/").pop()}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

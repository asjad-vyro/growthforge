import { redirect } from "next/navigation";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { currentProject } from "@/lib/auth";
import { EmptyState } from "@/components/ui";
import { RunStatusRefresher } from "@/components/run-status";
import { AssetCard, type AssetView } from "@/components/asset-card";
import { signedUrl, BUCKETS } from "@/lib/storage";

export const dynamic = "force-dynamic";

const TYPES = ["all", "tweet", "carousel", "image_ad", "reel"] as const;

export default async function LibraryPage(props: PageProps<"/library">) {
  const { project } = await currentProject();
  if (!project) redirect("/onboarding");
  const searchParams = await props.searchParams;
  const filter = typeof searchParams.type === "string" ? searchParams.type : "all";

  const rows = await db
    .select()
    .from(schema.generatedAssets)
    .where(eq(schema.generatedAssets.projectId, project.id))
    .orderBy(desc(schema.generatedAssets.createdAt))
    .limit(60);

  const filtered = filter === "all" ? rows : rows.filter((r) => r.type === filter);
  const anyActive = rows.some((r) => ["queued", "generating", "rendering"].includes(r.status));

  const assets: AssetView[] = await Promise.all(
    filtered.map(async (r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      error: r.error,
      createdAt: r.createdAt.toISOString(),
      content: r.content,
      files: await Promise.all(
        (r.files ?? []).map(async (f) => ({
          ...f,
          signedUrl:
            f.mime.startsWith("image/") || f.mime.startsWith("video/")
              ? await signedUrl(BUCKETS.generatedAssets, f.path, 3600).catch(() => undefined)
              : undefined,
        })),
      ),
    })),
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <RunStatusRefresher runStatus={anyActive ? "generating" : null} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Asset library</h1>
        <div className="flex gap-1.5">
          {TYPES.map((t) => (
            <Link
              key={t}
              href={t === "all" ? "/library" : `/library?type=${t}`}
              className={`rounded-full px-3 py-1 text-sm capitalize ${
                filter === t ? "bg-primary text-white" : "bg-surface-2 text-muted hover:text-foreground"
              }`}
            >
              {t.replace("_", " ")}
            </Link>
          ))}
        </div>
      </div>

      {assets.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          body="Assets land here as the pipeline generates them — tweets first, then carousels, ads and the reel."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}
    </div>
  );
}

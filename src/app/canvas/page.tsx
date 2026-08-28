import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { currentProject } from "@/lib/auth";
import { signedUrl, BUCKETS } from "@/lib/storage";
import { CanvasBoard, type CanvasAsset } from "@/components/canvas-board";

export const dynamic = "force-dynamic";

/** Pull a display headline / body out of the asset's generated content blob. */
function describe(type: string, content: Record<string, unknown> | null) {
  const c = (content ?? {}) as Record<string, unknown>;
  const variants = Array.isArray(c.variants) ? (c.variants as unknown[]) : null;
  const firstVariant = typeof variants?.[0] === "string" ? (variants[0] as string) : undefined;

  if (type === "tweet" || type === "thread") {
    const body = firstVariant ?? (typeof c.text === "string" ? c.text : undefined);
    return {
      body,
      meta: body ? `${body.length} ch` : undefined,
    };
  }
  const headline =
    (typeof c.concept === "string" && c.concept) ||
    (typeof c.template === "string" && c.template) ||
    undefined;
  return { headline, meta: undefined };
}

export default async function CanvasPage() {
  const { project } = await currentProject();
  if (!project) redirect("/onboarding");

  const rows = await db
    .select()
    .from(schema.generatedAssets)
    .where(eq(schema.generatedAssets.projectId, project.id))
    .orderBy(desc(schema.generatedAssets.createdAt))
    .limit(80);

  const assets: CanvasAsset[] = await Promise.all(
    rows.map(async (r) => {
      const { headline, body, meta } = describe(r.type, r.content);
      const files = await Promise.all(
        (r.files ?? []).map(async (f) => ({
          path: f.path,
          mime: f.mime,
          label: f.label,
          signedUrl:
            f.mime.startsWith("image/") || f.mime.startsWith("video/")
              ? await signedUrl(BUCKETS.generatedAssets, f.path, 3600).catch(() => undefined)
              : undefined,
        })),
      );
      return {
        id: r.id,
        type: r.type,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        headline,
        body,
        meta: meta ?? (files.length > 1 ? `1 / ${files.length}` : undefined),
        files,
      };
    }),
  );

  return <CanvasBoard brand={project.name} projectId={project.id} assets={assets} />;
}

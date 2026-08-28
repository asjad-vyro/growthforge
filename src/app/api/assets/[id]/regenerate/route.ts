import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { requireProject } from "@/lib/auth";
import { enqueueAndPoke } from "@/lib/jobs/queue";

export async function POST(request: NextRequest, ctx: RouteContext<"/api/assets/[id]/regenerate">) {
  try {
    const { id } = await ctx.params;
    const { instruction } = (await request.json().catch(() => ({}))) as { instruction?: string };

    const [asset] = await db
      .select()
      .from(schema.generatedAssets)
      .where(eq(schema.generatedAssets.id, id));
    if (!asset) return NextResponse.json({ error: "not found" }, { status: 404 });
    await requireProject(asset.projectId);

    const parentContent = (asset.content ?? {}) as Record<string, unknown>;
    const [clone] = await db
      .insert(schema.generatedAssets)
      .values({
        projectId: asset.projectId,
        pipelineRunId: asset.pipelineRunId,
        trendReportId: asset.trendReportId,
        type: asset.type,
        status: "queued",
        parentAssetId: asset.id,
        content: {
          angleIndex: parentContent.angleIndex ?? 0,
          userInstruction: instruction ?? null,
        },
      })
      .returning({ id: schema.generatedAssets.id });

    await enqueueAndPoke("asset.generate", { assetId: clone.id }, { dedupeKey: `gen:${clone.id}` });
    return NextResponse.json({ assetId: clone.id });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "regenerate failed" }, { status: 500 });
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { requireProject } from "@/lib/auth";
import { signedUrl, BUCKETS } from "@/lib/storage";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/assets/[id]/download">) {
  try {
    const { id } = await ctx.params;
    const path = request.nextUrl.searchParams.get("path");
    if (!path) return NextResponse.json({ error: "path required" }, { status: 400 });

    const [asset] = await db
      .select({ projectId: schema.generatedAssets.projectId, files: schema.generatedAssets.files })
      .from(schema.generatedAssets)
      .where(eq(schema.generatedAssets.id, id));
    if (!asset) return NextResponse.json({ error: "not found" }, { status: 404 });
    await requireProject(asset.projectId);

    // Only paths recorded on this asset are downloadable
    const known = (asset.files ?? []).some((f) => f.path === path);
    if (!known) return NextResponse.json({ error: "unknown file" }, { status: 403 });

    const url = await signedUrl(BUCKETS.generatedAssets, path, 600);
    return NextResponse.redirect(url);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "download failed" }, { status: 500 });
  }
}

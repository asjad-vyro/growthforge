import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db, schema } from "@/lib/db/client";
import { requireWorkspace } from "@/lib/auth";
import { mirrorLogo } from "@/lib/onboarding/ingest";

const CreateProjectSchema = z.object({
  name: z.string().min(1),
  productDescription: z.string().min(1),
  landingPageUrl: z.string().optional(),
  landingPageScreenshotPath: z.string().optional(),
  usp: z.string().min(1),
  icp: z.object({
    persona: z.string(),
    pains: z.array(z.string()),
    demographics: z.string().optional(),
    wateringHoles: z.array(z.string()).optional(),
  }),
  nicheKeywords: z.array(z.string().min(1)).min(1).max(8),
  brandKit: z.object({
    colors: z.object({
      primary: z.string(),
      secondary: z.string(),
      accent: z.string(),
      background: z.string(),
      text: z.string(),
    }),
    toneOfVoice: z.string(),
    doNotSay: z.array(z.string()).optional(),
    logoUrl: z.string().optional(),
    logoPath: z.string().optional(),
    fonts: z
      .array(
        z.object({
          family: z.string(),
          role: z.enum(["heading", "body"]),
          source: z.enum(["google", "upload"]),
          storagePath: z.string().optional(),
          weight: z.number().optional(),
        }),
      )
      .optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const { workspace } = await requireWorkspace();
    const body = CreateProjectSchema.parse(await request.json());

    const [project] = await db
      .insert(schema.projects)
      .values({
        workspaceId: workspace.id,
        name: body.name,
        productDescription: body.productDescription,
        landingPageUrl: body.landingPageUrl,
        landingPageScreenshotPath: body.landingPageScreenshotPath,
        usp: body.usp,
        icp: body.icp,
        nicheKeywords: body.nicheKeywords,
      })
      .returning();

    let logoPath = body.brandKit.logoPath ?? null;
    if (!logoPath && body.brandKit.logoUrl) {
      logoPath = await mirrorLogo(body.brandKit.logoUrl, workspace.id, project.id);
    }

    await db.insert(schema.brandKits).values({
      projectId: project.id,
      logoPath,
      colors: body.brandKit.colors,
      fonts: body.brandKit.fonts ?? [],
      toneOfVoice: body.brandKit.toneOfVoice,
      doNotSay: body.brandKit.doNotSay ?? [],
    });

    return NextResponse.json({ projectId: project.id });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "create failed" },
      { status: 400 },
    );
  }
}

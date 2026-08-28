import { NextResponse, type NextRequest } from "next/server";
import { requireWorkspace } from "@/lib/auth";
import { ingestLandingPage } from "@/lib/onboarding/ingest";

export const maxDuration = 300; // screenshot actor + vision extraction

export async function POST(request: NextRequest) {
  try {
    const { workspace } = await requireWorkspace();
    const { url } = (await request.json()) as { url?: string };
    if (!url || !/^https?:\/\//.test(url)) {
      return NextResponse.json({ error: "valid url required" }, { status: 400 });
    }
    const prefill = await ingestLandingPage(url, workspace.id);
    return NextResponse.json({ prefill });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ingestion failed" },
      { status: 500 },
    );
  }
}

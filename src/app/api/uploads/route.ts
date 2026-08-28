import { NextResponse, type NextRequest } from "next/server";
import { requireWorkspace } from "@/lib/auth";
import { createAdminClient, BUCKETS } from "@/lib/supabase/admin";

// Signed direct-to-storage uploads (dodges Vercel's 4.5MB body cap).
export async function POST(request: NextRequest) {
  try {
    const { workspace } = await requireWorkspace();
    const { filename } = (await request.json()) as { filename?: string };
    const safe = (filename ?? "file").replace(/[^\\w.\-]/g, "_").slice(0, 80);
    const path = `${workspace.id}/uploads/${crypto.randomUUID()}-${safe}`;

    const supabase = createAdminClient();
    const { data, error } = await supabase.storage
      .from(BUCKETS.brandAssets)
      .createSignedUploadUrl(path);
    if (error || !data) throw new Error(error?.message ?? "signed upload failed");

    return NextResponse.json({ path, token: data.token, bucket: BUCKETS.brandAssets });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "upload init failed" }, { status: 500 });
  }
}

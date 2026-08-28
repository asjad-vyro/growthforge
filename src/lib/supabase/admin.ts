import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client for server-side jobs (storage writes, signed upload
// URLs). Bypasses RLS — never expose to the browser.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export const BUCKETS = {
  brandAssets: "brand-assets",
  generatedAssets: "generated-assets",
  scrapedMedia: "scraped-media",
} as const;

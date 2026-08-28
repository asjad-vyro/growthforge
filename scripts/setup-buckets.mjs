// One-time storage setup: creates the three private buckets.
// Usage: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/setup-buckets.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);
for (const bucket of ["brand-assets", "generated-assets", "scraped-media"]) {
  const { error } = await supabase.storage.createBucket(bucket, { public: false });
  if (error && !/already exists/i.test(error.message)) {
    console.error(`✗ ${bucket}: ${error.message}`);
    process.exit(1);
  }
  console.log(`✓ ${bucket}`);
}

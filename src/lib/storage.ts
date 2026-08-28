import { createAdminClient, BUCKETS } from "@/lib/supabase/admin";

export { BUCKETS };

export async function uploadBuffer(
  bucket: string,
  path: string,
  buf: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, buf, { contentType, upsert: true });
  if (error) throw new Error(`storage upload failed (${bucket}/${path}): ${error.message}`);
  return path;
}

export async function signedUrl(bucket: string, path: string, expiresInS = 3600): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInS);
  if (error || !data) throw new Error(`signed url failed (${bucket}/${path}): ${error?.message}`);
  return data.signedUrl;
}

export async function downloadBuffer(bucket: string, path: string): Promise<Buffer> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) throw new Error(`storage download failed (${bucket}/${path}): ${error?.message}`);
  return Buffer.from(await data.arrayBuffer());
}

/** Fetch a remote URL (scraped CDN image, fal output) and stash it in storage. */
export async function mirrorUrlToStorage(
  url: string,
  bucket: string,
  path: string,
  fallbackContentType = "image/jpeg",
): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? fallbackContentType;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0) return null;
    await uploadBuffer(bucket, path, buf, contentType);
    return path;
  } catch {
    return null;
  }
}

/** Ensure the three private buckets exist (idempotent; call from setup script). */
export async function ensureBuckets(): Promise<void> {
  const supabase = createAdminClient();
  for (const bucket of Object.values(BUCKETS)) {
    const { error } = await supabase.storage.createBucket(bucket, { public: false });
    if (error && !/already exists/i.test(error.message)) throw error;
  }
}

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { UnauthorizedError, type OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

type Asset = {
  id: string;
  type: "image" | "video";
  status: "queued" | "generating" | "complete" | "error";
  mediaUrl?: string;
  errorMessage?: string;
};

type AssetGenerationData = { assets?: Asset[] };

const SECRET_KEY = "imagine_mcp_oauth";
// Must match what scripts/imagine-login.mjs registered — refresh grants are
// bound to this client registration.
const REDIRECT_URL = "http://localhost:8976/callback";

const RELOGIN_HINT =
  "imagine-mcp session fully expired (refresh grant rejected). Re-run `node scripts/imagine-login.mjs` " +
  "then `node scripts/seed-imagine-tokens.mjs` to mint and store a fresh session.";

/**
 * imagine-mcp is per-user OAuth with ~1h access tokens + refresh tokens; there is no
 * service-account path. Operational model: a human runs scripts/imagine-login.mjs ONCE,
 * scripts/seed-imagine-tokens.mjs stores the session in app_secrets, and from then on this
 * provider auto-refreshes on 401 (the MCP SDK transport drives it) and persists each rotated
 * token back to app_secrets — no humans involved until the refresh grant itself is revoked.
 */
function makeAuthProvider(): OAuthClientProvider {
  return {
    get redirectUrl() {
      return REDIRECT_URL;
    },
    get clientMetadata() {
      return {
        client_name: "GrowthForge pipeline",
        redirect_uris: [REDIRECT_URL],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      };
    },
    async clientInformation() {
      const stored = await loadStoredAuth();
      return stored.clientInformation as Parameters<
        NonNullable<OAuthClientProvider["saveClientInformation"]>
      >[0];
    },
    async saveClientInformation(info) {
      await patchStoredAuth({ clientInformation: info });
    },
    async tokens() {
      const stored = await loadStoredAuth();
      if (stored.tokens) return stored.tokens as { access_token: string; token_type: string };
      // Bootstrap fallback for quick local runs without a seeded DB row
      const envToken = process.env.IMAGINE_MCP_ACCESS_TOKEN;
      return envToken ? { access_token: envToken, token_type: "bearer" } : undefined;
    },
    async saveTokens(tokens) {
      await patchStoredAuth({ tokens });
    },
    redirectToAuthorization() {
      throw new Error(RELOGIN_HINT);
    },
    saveCodeVerifier() {
      throw new Error(RELOGIN_HINT);
    },
    codeVerifier() {
      throw new Error(RELOGIN_HINT);
    },
  };
}

async function loadStoredAuth(): Promise<Record<string, unknown>> {
  const [row] = await db
    .select({ value: schema.appSecrets.value })
    .from(schema.appSecrets)
    .where(eq(schema.appSecrets.key, SECRET_KEY));
  return row?.value ?? {};
}

async function patchStoredAuth(patch: Record<string, unknown>): Promise<void> {
  await db
    .insert(schema.appSecrets)
    .values({ key: SECRET_KEY, value: patch })
    .onConflictDoUpdate({
      target: schema.appSecrets.key,
      set: {
        value: sql`app_secrets.value || ${JSON.stringify(patch)}::jsonb`,
        updatedAt: new Date(),
      },
    });
}

let clientPromise: Promise<Client> | null = null;

function getClient(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const url = requireEnv("IMAGINE_MCP_URL");
      const transport = new StreamableHTTPClientTransport(new URL(url), {
        authProvider: makeAuthProvider(),
      });
      const client = new Client({ name: "growthforge", version: "0.1.0" });
      await client.connect(transport);
      return client;
    })().catch((err) => {
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

/**
 * Concurrent workers can race on refresh-token rotation (instance A rotates, B's
 * cached session 401s with a now-stale grant). One reset+retry re-reads the fresh
 * tokens A persisted to app_secrets.
 */
async function callToolWithRetry(
  name: string,
  args: Record<string, unknown>,
): Promise<Awaited<ReturnType<Client["callTool"]>>> {
  try {
    const client = await getClient();
    return await client.callTool({ name, arguments: args });
  } catch (err) {
    if (!(err instanceof UnauthorizedError)) throw err;
    clientPromise = null;
    const client = await getClient();
    return await client.callTool({ name, arguments: args });
  }
}

// We pin exact tool names/args below rather than calling listTools() at runtime — see
// scripts/dump-imagine-tools.mjs + scripts/check-imagine-tools-drift.mjs for how that pin is
// captured and kept honest. When the shape we get back doesn't match what we expect, that's the
// only signal the pin has drifted, so log the raw payload rather than swallowing it into a
// generic error.
function logShapeMismatch(tool: string, result: unknown): void {
  console.error(`imagine-mcp ${tool}: response shape didn't match the pinned contract:`, JSON.stringify(result));
}

/** Start a generation and return the imagine asset id WITHOUT waiting for completion. */
async function submitGenerate(tool: "generate_image" | "generate_video", args: Record<string, unknown>): Promise<string> {
  const orgId = requireEnv("IMAGINE_MCP_ORG_ID");
  const folderId = process.env.IMAGINE_MCP_FOLDER_ID;

  const result = await callToolWithRetry(tool, {
    ...args,
    org_id: orgId,
    ...(folderId ? { folder_id: folderId } : {}),
  });
  const data = result.structuredContent as AssetGenerationData | undefined;
  const asset = data?.assets?.[0];
  if (!asset?.id) {
    logShapeMismatch(tool, result);
    throw new Error(`imagine-mcp ${tool}: ${textOf(result) ?? "no asset id returned"}`);
  }
  if (asset.status === "error") throw new Error(`imagine-mcp ${tool}: ${asset.errorMessage ?? "generation failed"}`);
  return asset.id;
}

/** Resume-safe wait: poll an already-submitted generation until it completes. */
export async function pollGeneration(imagineAssetId: string): Promise<string> {
  return pollUntilTerminal(imagineAssetId, requireEnv("IMAGINE_MCP_ORG_ID"));
}

async function callGenerate(tool: "generate_image" | "generate_video", args: Record<string, unknown>): Promise<string> {
  const id = await submitGenerate(tool, args);
  return pollGeneration(id);
}

async function pollUntilTerminal(id: string, orgId: string): Promise<string> {
  for (;;) {
    const result = await callToolWithRetry("fetch_status", { id, sync: true, org_id: orgId });
    const data = result.structuredContent as AssetGenerationData | undefined;
    const asset = data?.assets?.[0];
    if (asset?.status === "complete") {
      if (!asset.mediaUrl) {
        logShapeMismatch("fetch_status", result);
        throw new Error("imagine-mcp fetch_status: complete with no mediaUrl");
      }
      return asset.mediaUrl;
    }
    if (asset?.status === "error") throw new Error(`imagine-mcp fetch_status: ${asset.errorMessage ?? "generation failed"}`);
    if (!asset) {
      logShapeMismatch("fetch_status", result);
      throw new Error("imagine-mcp fetch_status: no asset in response");
    }
    // sync:true blocks upstream for ~90s per call; still "generating" means keep polling.
  }
}

function textOf(result: unknown): string | undefined {
  const content = (result as { content?: unknown[] })?.content;
  const block = content?.find(
    (c): c is { type: "text"; text: string } =>
      typeof c === "object" && c !== null && (c as { type?: unknown }).type === "text",
  );
  return block?.text;
}

// Per the pinned schemas, aspect_ratio/model/duration are REQUIRED but nullable —
// the server rejects requests where the key is absent, so always send them.
export async function generateImage(input: {
  prompt: string;
  aspectRatio?: string;
  model?: string;
  resolution?: string;
  quality?: string;
  imageUrl?: string;
}): Promise<string> {
  return callGenerate("generate_image", {
    prompt: input.prompt,
    aspect_ratio: input.aspectRatio ?? null,
    model: input.model ?? null,
    duration: null,
    ...(input.resolution ? { resolution: input.resolution } : {}),
    ...(input.quality ? { quality: input.quality } : {}),
    ...(input.imageUrl ? { image_url: input.imageUrl } : {}),
  });
}

export async function generateVideo(input: {
  prompt: string;
  aspectRatio?: string;
  model?: string;
  duration?: string;
  resolution?: string;
  imageUrl?: string[];
}): Promise<string> {
  const id = await generateVideoSubmit(input);
  return pollGeneration(id);
}

/** Submit-only variant so callers can checkpoint the id and resume polling after a crash. */
export async function generateVideoSubmit(input: {
  prompt: string;
  aspectRatio?: string;
  model?: string;
  duration?: string;
  resolution?: string;
  imageUrl?: string[];
}): Promise<string> {
  return submitGenerate("generate_video", {
    prompt: input.prompt,
    aspect_ratio: input.aspectRatio ?? null,
    model: input.model ?? null,
    duration: input.duration ?? null,
    ...(input.resolution ? { resolution: input.resolution } : {}),
    ...(input.imageUrl ? { image_url: input.imageUrl } : {}),
  });
}

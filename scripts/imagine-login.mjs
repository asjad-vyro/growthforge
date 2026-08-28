// One-time (or whenever the grant is revoked) OAuth login against imagine-mcp.
//
// Runs the full MCP OAuth flow: discovery → dynamic client registration → PKCE →
// browser approval → token exchange. Writes tokens to .imagine-mcp-tokens.json
// (gitignored) and prints what to put in .env.local. Also resolves the org id and
// reports token TTL + whether a refresh token was issued (that decides whether the
// pipeline can self-refresh or needs a periodic human re-login).
//
// Usage: node scripts/imagine-login.mjs   (a browser window opens — approve there)
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { exec } from "node:child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";

const SERVER_URL = process.env.IMAGINE_MCP_URL ?? "https://mcp.imagine.art";
const PORT = 8976;
const REDIRECT_URL = `http://localhost:${PORT}/callback`;
const TOKENS_FILE = new URL("../.imagine-mcp-tokens.json", import.meta.url);

// ---- persistent state (client registration survives re-runs) ----
let state = {};
try {
  state = JSON.parse(await readFile(TOKENS_FILE, "utf8"));
} catch {}

async function persist() {
  await writeFile(TOKENS_FILE, JSON.stringify(state, null, 2));
}

const authProvider = {
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
  clientInformation() {
    return state.clientInformation;
  },
  async saveClientInformation(info) {
    state.clientInformation = info;
    await persist();
  },
  tokens() {
    return state.tokens;
  },
  async saveTokens(tokens) {
    state.tokens = tokens;
    state.savedAt = new Date().toISOString();
    await persist();
  },
  redirectToAuthorization(url) {
    console.log("\nOpening browser for ImagineArt login (use your PERSONAL account/org):");
    console.log(`  ${url}\n`);
    exec(`open "${url}"`);
  },
  async saveCodeVerifier(v) {
    state.codeVerifier = v;
    await persist();
  },
  codeVerifier() {
    if (!state.codeVerifier) throw new Error("no code verifier saved");
    return state.codeVerifier;
  },
};

function waitForCallback() {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      if (url.pathname !== "/callback") {
        res.writeHead(404).end();
        return;
      }
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      res.writeHead(200, { "content-type": "text/html" });
      res.end(
        code
          ? "<h2>GrowthForge: login captured — you can close this tab.</h2>"
          : `<h2>Login failed: ${error ?? "no code"}</h2>`,
      );
      server.close();
      if (code) resolve(code);
      else reject(new Error(`oauth error: ${error ?? "no code in callback"}`));
    });
    server.listen(PORT);
    setTimeout(() => {
      server.close();
      reject(new Error("timed out waiting for browser approval (5 min)"));
    }, 300_000).unref();
  });
}

async function connect() {
  const transport = new StreamableHTTPClientTransport(new URL(SERVER_URL), { authProvider });
  const client = new Client({ name: "growthforge-login", version: "0.1.0" });
  try {
    await client.connect(transport);
    return client;
  } catch (err) {
    if (!(err instanceof UnauthorizedError)) throw err;
    const code = await waitForCallback();
    await transport.finishAuth(code);
    // reconnect with the fresh tokens
    const retryTransport = new StreamableHTTPClientTransport(new URL(SERVER_URL), { authProvider });
    const retryClient = new Client({ name: "growthforge-login", version: "0.1.0" });
    await retryClient.connect(retryTransport);
    return retryClient;
  }
}

const client = await connect();
console.log("✓ authenticated against", SERVER_URL);

// ---- report token facts ----
const { tokens } = state;
console.log("\n--- token report ---");
console.log("refresh_token issued:", Boolean(tokens?.refresh_token));
if (tokens?.expires_in) console.log("expires_in:", Math.round(tokens.expires_in / 3600), "hours");
const jwtExp = decodeJwtExp(tokens?.access_token);
if (jwtExp) console.log("access token exp:", jwtExp.toISOString());

// ---- tool surface + org resolution ----
const { tools } = await client.listTools();
console.log("\ntools:", tools.map((t) => t.name).join(", "));

const orgTool = tools.find((t) => /organi[sz]ation/i.test(t.name));
if (orgTool) {
  try {
    const result = await client.callTool({ name: orgTool.name, arguments: {} });
    console.log(`\n${orgTool.name} →`);
    console.log(JSON.stringify(result.structuredContent ?? result.content, null, 2).slice(0, 3000));
  } catch (err) {
    console.log(`\n${orgTool.name} failed (may need arguments):`, err.message?.slice(0, 300));
    console.log("schema:", JSON.stringify(orgTool.inputSchema));
  }
}

console.log("\n--- paste into .env.local ---");
console.log(`IMAGINE_MCP_ACCESS_TOKEN=${tokens?.access_token ?? "<missing>"}`);
console.log("IMAGINE_MCP_ORG_ID=<pick from the org listing above>");
console.log("\nFull tokens (incl. refresh) saved to .imagine-mcp-tokens.json (gitignored).");

function decodeJwtExp(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    return payload.exp ? new Date(payload.exp * 1000) : null;
  } catch {
    return null;
  }
}

// Drift guard for the imagine-mcp tools GrowthForge pins (see src/lib/imagine-mcp/client.ts,
// which calls generate_image / generate_video / fetch_status by name and never lists tools at
// runtime). Connects, calls list_tools(), and diffs the three pinned tools' schemas against the
// committed imagine-tools.snapshot.json (made by scripts/dump-imagine-tools.mjs). Exits non-zero
// and prints a diff on any change — a renamed arg or dropped field here would otherwise fail
// silently until a real generation call 400s.
//
// Usage: IMAGINE_MCP_URL=... IMAGINE_MCP_ACCESS_TOKEN=... node scripts/check-imagine-tools-drift.mjs
import { readFile } from "node:fs/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const PINNED_TOOLS = ["generate_image", "generate_video", "fetch_status"];
const SNAPSHOT_FILE = new URL("../imagine-tools.snapshot.json", import.meta.url);

const url = process.env.IMAGINE_MCP_URL;
const token = process.env.IMAGINE_MCP_ACCESS_TOKEN;
if (!url || !token) {
  console.error("Set IMAGINE_MCP_URL and IMAGINE_MCP_ACCESS_TOKEN");
  process.exit(1);
}

let expected;
try {
  expected = JSON.parse(await readFile(SNAPSHOT_FILE, "utf8"));
} catch {
  console.error(
    "imagine-tools.snapshot.json doesn't exist yet — run scripts/dump-imagine-tools.mjs once and commit it first.",
  );
  process.exit(1);
}

const transport = new StreamableHTTPClientTransport(new URL(url), {
  requestInit: { headers: { Authorization: `Bearer ${token}` } },
});
const client = new Client({ name: "growthforge-tools-drift", version: "0.1.0" });
await client.connect(transport);
const { tools } = await client.listTools();

let drift = false;
for (const name of PINNED_TOOLS) {
  const tool = tools.find((t) => t.name === name);
  if (!tool) {
    console.error(`✗ ${name}: gone from list_tools() — renamed or removed upstream`);
    drift = true;
    continue;
  }
  const actual = { inputSchema: tool.inputSchema, outputSchema: tool.outputSchema ?? null };
  const diffs = diff(expected[name], actual, name);
  if (diffs.length) {
    drift = true;
    console.error(`✗ ${name} changed:`);
    diffs.forEach((line) => console.error(`  ${line}`));
  } else {
    console.log(`✓ ${name} unchanged`);
  }
}

if (drift) {
  console.error(
    "\nimagine-mcp's contract for a pinned tool changed. If this is expected, re-run " +
      "scripts/dump-imagine-tools.mjs and commit the update; if not, GrowthForge's calls may now be broken.",
  );
  process.exit(1);
}

/** Minimal recursive diff — good enough for JSON-schema-shaped objects, no extra dependency. */
function diff(a, b, path) {
  if (a === b) return [];
  if (typeof a !== typeof b || a === null || b === null || typeof a !== "object") {
    return [`${path}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`];
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const out = [];
  for (const key of keys) {
    if (!(key in a)) out.push(`${path}.${key}: (added) ${JSON.stringify(b[key])}`);
    else if (!(key in b)) out.push(`${path}.${key}: (removed) ${JSON.stringify(a[key])}`);
    else out.push(...diff(a[key], b[key], `${path}.${key}`));
  }
  return out;
}

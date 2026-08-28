// One-time capture: connects to imagine-mcp, calls list_tools(), and writes the input schemas
// of the tools GrowthForge actually calls (generate_image / generate_video / fetch_status) to
// imagine-tools.snapshot.json. Run this once after getting a real IMAGINE_MCP_ACCESS_TOKEN, and
// re-run + commit the diff any time ImagineArt's tool contract changes on purpose.
//
// The app itself never calls list_tools() — it calls these three tools directly by name (see
// src/lib/imagine-mcp/client.ts). This snapshot exists only so scripts/check-imagine-tools-drift.mjs
// has something to diff against in CI.
//
// Usage: IMAGINE_MCP_URL=... IMAGINE_MCP_ACCESS_TOKEN=... node scripts/dump-imagine-tools.mjs
import { writeFile } from "node:fs/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const PINNED_TOOLS = ["generate_image", "generate_video", "fetch_status"];
const OUT_FILE = new URL("../imagine-tools.snapshot.json", import.meta.url);

const url = process.env.IMAGINE_MCP_URL;
const token = process.env.IMAGINE_MCP_ACCESS_TOKEN;
if (!url || !token) {
  console.error("Set IMAGINE_MCP_URL and IMAGINE_MCP_ACCESS_TOKEN");
  process.exit(1);
}

const transport = new StreamableHTTPClientTransport(new URL(url), {
  requestInit: { headers: { Authorization: `Bearer ${token}` } },
});
const client = new Client({ name: "growthforge-tools-dump", version: "0.1.0" });
await client.connect(transport);

const { tools } = await client.listTools();
const pinned = {};
for (const name of PINNED_TOOLS) {
  const tool = tools.find((t) => t.name === name);
  if (!tool) {
    console.error(`✗ ${name}: not found in list_tools() — did it get renamed?`);
    process.exit(1);
  }
  pinned[name] = { inputSchema: tool.inputSchema, outputSchema: tool.outputSchema ?? null };
  console.log(`✓ ${name}`);
}

await writeFile(OUT_FILE, JSON.stringify(pinned, null, 2) + "\n");
console.log(`\nWrote ${OUT_FILE.pathname} — commit it.`);

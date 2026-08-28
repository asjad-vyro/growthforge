// End-to-end operational smoke test: DB-stored session (with a deliberately broken
// access token) → SDK auto-refresh → real generate_image → mediaUrl fetch.
import { generateImage } from "../src/lib/imagine-mcp/client";

const url = await generateImage({
  prompt: "A tiny origami rocket on a pastel desk, studio light, minimal, no text",
  aspectRatio: "1:1",
  model: "gpt-image-2",
  quality: "low",
});
console.log("mediaUrl:", url.slice(0, 120));
const res = await fetch(url);
console.log("fetch:", res.status, res.headers.get("content-type"), (await res.arrayBuffer()).byteLength, "bytes");
process.exit(0);

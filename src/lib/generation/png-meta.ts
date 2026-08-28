/**
 * Read a PNG's real pixel size out of its IHDR chunk.
 *
 * The image model does not always honour the requested aspect — a 4:5
 * carousel slide request came back 2048x2048 — and the recorded size is what
 * lays the asset out, so it has to be measured rather than assumed.
 *
 * Returns undefined for anything that isn't a PNG, so callers can fall back.
 */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function readPngSize(buf: Buffer): { width: number; height: number } | undefined {
  // signature(8) + length(4) + "IHDR"(4) + width(4) + height(4)
  if (buf.length < 24) return undefined;
  if (!buf.subarray(0, 8).equals(PNG_SIGNATURE)) return undefined;
  if (buf.toString("latin1", 12, 16) !== "IHDR") return undefined;
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  if (width < 1 || height < 1) return undefined;
  return { width, height };
}

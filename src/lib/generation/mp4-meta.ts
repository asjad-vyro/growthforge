/**
 * Minimal MP4 box reader — pulls real pixel dimensions and duration out of a
 * generated video instead of assuming them.
 *
 * The generation models do not honour a requested resolution exactly (a 9:16
 * `seedance-2.0` render came back 496x864 / 6.0s, not the 1080x1920 / 15s the
 * caller asked for), and those numbers are persisted on the asset and used to
 * lay the video out, so they have to be measured.
 *
 * Reads `moov.mvhd` for the timescale/duration and the first `moov.trak.tkhd`
 * carrying a non-zero size for the display dimensions. Returns undefined
 * fields rather than throwing — a missing dimension is better than a failed
 * asset.
 */

type Box = { type: string; start: number; end: number };

/** Iterate the boxes directly inside [start, end). */
function boxes(buf: Buffer, start: number, end: number): Box[] {
  const out: Box[] = [];
  let p = start;
  while (p + 8 <= end) {
    let size = buf.readUInt32BE(p);
    const type = buf.toString("latin1", p + 4, p + 8);
    let header = 8;
    if (size === 1) {
      // 64-bit largesize
      if (p + 16 > end) break;
      const hi = buf.readUInt32BE(p + 8);
      const lo = buf.readUInt32BE(p + 12);
      size = hi * 2 ** 32 + lo;
      header = 16;
    } else if (size === 0) {
      size = end - p; // extends to the end of its container
    }
    if (size < header || p + size > end) break;
    out.push({ type, start: p + header, end: p + size });
    p += size;
  }
  return out;
}

function find(bs: Box[], type: string): Box | undefined {
  return bs.find((b) => b.type === type);
}

export type Mp4Meta = { width?: number; height?: number; durationS?: number };

export function readMp4Meta(buf: Buffer): Mp4Meta {
  const meta: Mp4Meta = {};
  try {
    const moov = find(boxes(buf, 0, buf.length), "moov");
    if (!moov) return meta;
    const inMoov = boxes(buf, moov.start, moov.end);

    const mvhd = find(inMoov, "mvhd");
    if (mvhd) {
      const version = buf.readUInt8(mvhd.start);
      // version 0: creation(4) modification(4) timescale(4) duration(4)
      // version 1: creation(8) modification(8) timescale(4) duration(8)
      const base = mvhd.start + 4;
      const timescale = version === 1 ? buf.readUInt32BE(base + 16) : buf.readUInt32BE(base + 8);
      const duration =
        version === 1
          ? Number(buf.readBigUInt64BE(base + 20))
          : buf.readUInt32BE(base + 12);
      if (timescale > 0 && duration > 0) {
        meta.durationS = Math.round((duration / timescale) * 100) / 100;
      }
    }

    // Display size lives on the video track; audio tracks carry 0x0.
    for (const trak of inMoov.filter((b) => b.type === "trak")) {
      const tkhd = find(boxes(buf, trak.start, trak.end), "tkhd");
      if (!tkhd) continue;
      const version = buf.readUInt8(tkhd.start);
      // after ver/flags: v0 => 20 bytes of times/ids, v1 => 32; then
      // reserved(8) layer(2) alt_group(2) volume(2) reserved(2) matrix(36) = 52
      const off = tkhd.start + 4 + (version === 1 ? 32 : 20) + 52;
      if (off + 8 > tkhd.end) continue;
      // 16.16 fixed point
      const w = buf.readUInt32BE(off) / 65536;
      const h = buf.readUInt32BE(off + 4) / 65536;
      if (w >= 1 && h >= 1) {
        meta.width = Math.round(w);
        meta.height = Math.round(h);
        break;
      }
    }
  } catch {
    // A malformed or truncated file yields whatever was parsed before the fault.
  }
  return meta;
}

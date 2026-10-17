import sharp from "sharp";
import type { FileHandle } from "node:fs/promises";

export const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const widths = [320, 640, 960, 1440];
let activeTransforms = 0;

export class DerivativeBusyError extends Error {}

export function derivativeWidth(query: URLSearchParams): number | null {
  const values = query.getAll("width");
  if (!values.length) return null;
  if (values.length !== 1 || !widths.some(width => String(width) === values[0]))
    throw new Error("Invalid width");
  return Number(values[0]);
}

// A slot covers source reading and decoding; requests never queue large buffers.
export async function createImageDerivative(source: Buffer | FileHandle, width: number): Promise<Buffer | null> {
  if (!widths.includes(width)) throw new Error("Invalid width");
  if (activeTransforms >= 2) throw new DerivativeBusyError("Image processing busy");
  activeTransforms++;
  try {
    const size = Buffer.isBuffer(source) ? source.length : (await source.stat()).size;
    if (size > MAX_SOURCE_BYTES) throw new Error("Source too large");
    let bytes: Buffer;
    if (Buffer.isBuffer(source)) bytes = source;
    else {
      bytes = Buffer.alloc(size);
      let offset = 0;
      while (offset < size) {
        const { bytesRead } = await source.read(bytes, offset, size - offset, offset);
        if (!bytesRead) throw new Error("Incomplete source");
        offset += bytesRead;
      }
    }
    const image = sharp(bytes, { limitInputPixels: 40000000 });
    const metadata = await image.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format ?? "") || (metadata.pages ?? 1) > 1) return null;
    const rotated = [5, 6, 7, 8].includes(metadata.orientation ?? 0);
    const sourceWidth = rotated ? metadata.height : metadata.width;
    const sourceHeight = rotated ? metadata.width : metadata.height;
    if (!sourceWidth || !sourceHeight) throw new Error("Invalid dimensions");
    const height = Math.ceil(width * sourceHeight / sourceWidth);
    if (height > 8192 || width * height > 8000000) throw new Error("Output too large");
    // Auto-orient before resizing; retain the ratio and exact srcSet width.
    return await image.rotate().resize({ width }).webp({ quality: 80, effort: 3 }).toBuffer();
  } finally {
    activeTransforms--;
  }
}

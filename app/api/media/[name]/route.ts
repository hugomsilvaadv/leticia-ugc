import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { getDataDir } from "@/lib/site-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mime: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const safeName = path.basename(name);
  if (safeName !== name)
    return new NextResponse("Arquivo inválido", { status: 400 });

  if (name.startsWith(".") || !mime[path.extname(name).toLowerCase()])
    return new NextResponse("Arquivo não encontrado", { status: 404 });

  let handle: fs.FileHandle | undefined;
  try {
    const filePath = path.join(getDataDir(), "uploads", safeName);
    handle = await fs.open(filePath, constants.O_RDONLY | constants.O_NOFOLLOW);
    const { size } = await handle.stat();
    const contentType =
      mime[path.extname(safeName).toLowerCase()] || "application/octet-stream";
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Accept-Ranges": "bytes",
    };
    const range = request.headers.get("range");
    let start = 0;
    let end = size - 1;
    if (range) {
      const match = range.match(/^bytes=(\d*)-(\d*)$/);
      if (!match || (!match[1] && !match[2])) {
        return new NextResponse(null, {
          status: 416,
          headers: { ...headers, "Content-Range": `bytes */${size}` },
        });
      }
      if (!match[1]) {
        const suffix = Number(match[2]);
        start = Math.max(0, size - suffix);
      } else {
        start = Number(match[1]);
      }
      if (match[1] && match[2]) end = Number(match[2]);
      if (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start > end ||
        start >= size
      ) {
        return new NextResponse(null, {
          status: 416,
          headers: { ...headers, "Content-Range": `bytes */${size}` },
        });
      }
      end = Math.min(end, size - 1);
    }
    const bytes = Buffer.alloc(Math.max(0, end - start + 1));
    await handle.read(bytes, 0, bytes.length, start);
    headers["Content-Length"] = String(bytes.length);
    if (range) headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
    return new NextResponse(bytes, { status: range ? 206 : 200, headers });
  } catch {
    return new NextResponse("Arquivo não encontrado", { status: 404 });
  } finally {
    await handle?.close();
  }
}

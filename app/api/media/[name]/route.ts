import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { getDataDir } from "@/lib/site-config";
import { createImageDerivative, derivativeWidth } from "@/lib/image-derivatives";

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

  let width: number | null;
  try { width = derivativeWidth(new URL(request.url).searchParams); }
  catch { return new NextResponse("Largura inválida", { status: 400, headers: { "Cache-Control": "no-store" } }); }

  let handle: fs.FileHandle | undefined;
  try {
    const filePath = path.join(getDataDir(), "uploads", safeName);
    handle = await fs.open(filePath, constants.O_RDONLY | constants.O_NOFOLLOW);
    const stat = await handle.stat();
    if (!stat.isFile()) return new NextResponse("Arquivo não encontrado", { status: 404 });
    const { size } = stat;
    const contentType =
      mime[path.extname(safeName).toLowerCase()] || "application/octet-stream";
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Accept-Ranges": "bytes",
    };
    if (width && ["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
      try {
        const derivative = await createImageDerivative(handle, width);
        if (derivative) return new NextResponse(derivative, {
          headers: { "Content-Type": "image/webp", "Content-Length": String(derivative.length), "Cache-Control": headers["Cache-Control"] },
        });
      } catch {
        // Busy, unsupported or oversized sources stream their intact original.
        // Browsers do not retry failed srcSet requests; never break an image on saturation.
      }
    }
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
    headers["Content-Length"] = String(Math.max(0, end - start + 1));
    if (range) headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
    if (!size) return new NextResponse(null, { headers });
    const stream = handle.createReadStream({ start, end, autoClose: true });
    const response = new NextResponse(Readable.toWeb(stream) as ReadableStream<Uint8Array>, { status: range ? 206 : 200, headers });
    handle = undefined; // The response stream now owns and closes the descriptor.
    return response;
  } catch {
    return new NextResponse("Arquivo não encontrado", { status: 404 });
  } finally {
    await handle?.close();
  }
}

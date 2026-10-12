import { imageDimensions } from "@/lib/image-validation";
import { readLimitedBody, BodyLimitError } from "@/lib/request-body";
import { detectMediaType } from "@/lib/media";
import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getDataDir, validateAdminPassword } from "@/lib/site-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowed = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
]);
const extByType: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
};

export async function POST(request: NextRequest) {
  if (!validateAdminPassword(request.headers.get("x-admin-password"))) {
    return NextResponse.json({ error: "Senha inválida." }, { status: 401 });
  }

  try {
    const body = await readLimitedBody(request, 31 * 1024 * 1024);
    const form = await new Response(body, {
      headers: { "Content-Type": request.headers.get("content-type") || "" },
    }).formData();
    const file = form.get("file");
    if (!(file instanceof File))
      return NextResponse.json({ error: "Arquivo ausente." }, { status: 400 });
    if (!allowed.has(file.type))
      return NextResponse.json(
        { error: "Formato não suportado." },
        { status: 415 },
      );
    if (file.size > 30 * 1024 * 1024)
      return NextResponse.json(
        { error: "Arquivo acima de 30 MB." },
        { status: 413 },
      );

    const bytes = Buffer.from(await file.arrayBuffer());
    if (detectMediaType(bytes) !== file.type)
      return NextResponse.json(
        {
          error: "O conteúdo do arquivo não corresponde ao formato informado.",
        },
        { status: 415 },
      );
    let dimensions: { width: number; height: number } | undefined;
    if (file.type.startsWith("image/")) {
      try {
        dimensions = await imageDimensions(bytes);
      } catch (error) {
        return NextResponse.json(
          {
            error: error instanceof Error ? error.message : "Imagem inválida.",
          },
          { status: 415 },
        );
      }
    }
    const uploads = path.join(getDataDir(), "uploads");
    await fs.mkdir(uploads, { recursive: true });
    const name = `${Date.now()}-${crypto.randomUUID()}${extByType[file.type] || ""}`;
    await fs.writeFile(path.join(uploads, name), bytes);

    return NextResponse.json({ url: `/api/media/${name}`, ...dimensions });
  } catch (error) {
    if (error instanceof BodyLimitError)
      return NextResponse.json({ error: error.message }, { status: 413 });
    return NextResponse.json({ error: "Falha no upload." }, { status: 500 });
  }
}

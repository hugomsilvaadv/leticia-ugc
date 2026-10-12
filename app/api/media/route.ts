import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getDataDir, validateAdminPassword } from "@/lib/site-config";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!validateAdminPassword(request.headers.get("x-admin-password")))
    return NextResponse.json({ error: "Senha inválida." }, { status: 401 });
  try {
    const dir = path.join(getDataDir(), "uploads");
    const files = await fs
      .readdir(dir, { withFileTypes: true })
      .catch((e: NodeJS.ErrnoException) => {
        if (e.code === "ENOENT") return [];
        throw e;
      });
    const media = await Promise.all(
      files
        .filter(
          (f) => f.isFile() && /\.(jpe?g|png|webp|gif|mp4|webm)$/i.test(f.name),
        )
        .map(async (f) => {
          const s = await fs.stat(path.join(dir, f.name));
          return {
            name: f.name,
            url: "/api/media/" + encodeURIComponent(f.name),
            size: s.size,
            modified: s.mtime.toISOString(),
          };
        }),
    );
    return NextResponse.json(
      media.sort((a, b) => b.modified.localeCompare(a.modified)),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Não foi possível abrir a biblioteca." },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { readSiteConfig, validateAdminPassword, writeSiteConfig } from "@/lib/site-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await readSiteConfig(), { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: NextRequest) {
  if (!validateAdminPassword(request.headers.get("x-admin-password"))) {
    return NextResponse.json({ error: "Senha inválida." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const config = await writeSiteConfig(body);
    return NextResponse.json(config, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar as alterações." }, { status: 500 });
  }
}

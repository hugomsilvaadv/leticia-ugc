import { NextRequest, NextResponse } from "next/server";
import { readPortfolio, writePortfolio } from "@/lib/portfolio-store";
import { validateAdminPassword } from "@/lib/site-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await readPortfolio(), { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: NextRequest) {
  if (!validateAdminPassword(request.headers.get("x-admin-password"))) {
    return NextResponse.json({ error: "Senha inválida." }, { status: 401 });
  }
  try {
    const items = await writePortfolio(await request.json());
    return NextResponse.json(items, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar o portfólio." }, { status: 500 });
  }
}

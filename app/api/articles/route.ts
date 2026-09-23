import { NextRequest, NextResponse } from "next/server";
import { readArticles, writeArticles } from "@/lib/article-store";
import { validateAdminPassword } from "@/lib/site-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await readArticles(), { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: NextRequest) {
  if (!validateAdminPassword(request.headers.get("x-admin-password"))) {
    return NextResponse.json({ error: "Senha inválida." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const articles = await writeArticles(body);
    return NextResponse.json(articles, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar os artigos." }, { status: 500 });
  }
}

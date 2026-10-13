import { jsonContent, apiError } from "@/lib/api-response";
import { NextRequest, NextResponse } from "next/server";
import { readArticles, writeArticles } from "@/lib/article-store";
import { validateAdminPassword } from "@/lib/site-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    return jsonContent(
      await readArticles(
        validateAdminPassword(request.headers.get("x-admin-password")),
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: NextRequest) {
  if (!validateAdminPassword(request.headers.get("x-admin-password"))) {
    return NextResponse.json({ error: "Senha inválida." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const articles = await writeArticles(body, request.headers.get("if-match"));
    return jsonContent(articles);
  } catch (error) {
    return apiError(error);
  }
}

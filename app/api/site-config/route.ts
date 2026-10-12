import { jsonContent, apiError } from "@/lib/api-response";
import { NextRequest, NextResponse } from "next/server";
import {
  readSiteConfig,
  validateAdminPassword,
  writeSiteConfig,
} from "@/lib/site-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return jsonContent(await readSiteConfig());
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
    const config = await writeSiteConfig(body, request.headers.get("if-match"));
    return jsonContent(config);
  } catch (error) {
    return apiError(error);
  }
}
